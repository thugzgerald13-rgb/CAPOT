import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client, DatSelection } from '../types';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';

interface AccountingContextType {
  clients: Record<string, Client>;
  currentClientId: string | null;
  currentClient: Client | null;
  isDarkMode: boolean;
  activeModal: string | null;
  pendingModal: string | null;
  currentDat: DatSelection | null;
  historyTab: string;
  toastMsg: string | null;
  
  setDarkMode: (value: boolean) => void;
  openModal: (modal: string | null) => void;
  setPendingModal: (modal: string | null) => void;
  setHistoryTab: (tab: string) => void;
  setCurrentClientId: (id: string) => void;
  setCurrentDat: (dat: DatSelection | null) => void;
  
  saveClient: (id: string, clientData: Client) => void;
  addClient: (name: string) => void;
  showToast: (msg: string) => void;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [isDarkMode, setDarkMode] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<string | null>(null);
  const [currentDat, setCurrentDat] = useState<DatSelection | null>(null);
  const [historyTab, setHistoryTab] = useState('expenses');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Dark mode initialization and data reset on logout
  useEffect(() => {
    const darkMode = localStorage.getItem('capo_dark_mode') === 'true';
    setDarkMode(darkMode);
    
    if (!user) {
      setClients({});
      setCurrentClientId(null);
      
      // Check if there is data in local storage for migration or guest mode
      const saved = localStorage.getItem('capo_accounting_v14_react');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setClients(parsed);
          const keys = Object.keys(parsed);
          if (keys.length > 0) setCurrentClientId(keys[0]);
        } catch (e) {
          console.error("Failed to parse local storage", e);
        }
      }
      setIsReady(true);
    }
  }, [user]);

  // Firestore sync
  useEffect(() => {
    if (!user) {
      return;
    }

    const clientsRef = collection(db, 'users', user.uid, 'clients');
    
    const unsubscribe = onSnapshot(clientsRef, (snapshot) => {
      const data: Record<string, Client> = {};
      snapshot.forEach((doc) => {
        data[doc.id] = doc.data() as Client;
      });
      
      setClients(data);
      
      // Select first client if none selected
      if (Object.keys(data).length > 0 && !currentClientId) {
        setCurrentClientId(Object.keys(data)[0]);
      }
      
      // Handle migration if needed
      const saved = localStorage.getItem('capo_accounting_v14_react');
      if (saved && snapshot.empty) {
        try {
          const parsed = JSON.parse(saved);
          if (Object.keys(parsed).length > 0) {
            migrateToFirestore(user.uid, parsed);
          }
        } catch (e) {
          console.error("Migration parse error", e);
        }
      }
      
      setIsReady(true);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setIsReady(true); // Don't hang the app even if sync fails
      showToast("Cloud sync failed. Working in offline mode.");
      
      // Fallback to local storage if firestore fails
      const saved = localStorage.getItem('capo_accounting_v14_react');
      if (saved) {
        try {
          setClients(JSON.parse(saved));
        } catch (e) {}
      }
    });

    return () => unsubscribe();
  }, [user]);

  const migrateToFirestore = async (userId: string, localData: Record<string, Client>) => {
    try {
      const batch = writeBatch(db);
      Object.entries(localData).forEach(([clientId, client]) => {
        const docRef = doc(db, 'users', userId, 'clients', clientId);
        batch.set(docRef, { ...client, ownerId: userId });
      });
      await batch.commit();
      localStorage.removeItem('capo_accounting_v14_react');
      showToast('Data migrated to cloud');
    } catch (error) {
      console.error("Migration error:", error);
    }
  };

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('capo_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('capo_dark_mode', 'false');
    }
  }, [isDarkMode]);

  const saveClient = async (id: string, clientData: Client) => {
    if (!user) {
      // Fallback to local storage if not logged in (though we prefer cloud)
      const newClients = { ...clients, [id]: clientData };
      setClients(newClients);
      localStorage.setItem('capo_accounting_v14_react', JSON.stringify(newClients));
      return;
    }

    const path = `users/${user.uid}/clients/${id}`;
    try {
      const clientRef = doc(db, 'users', user.uid, 'clients', id);
      await setDoc(clientRef, { ...clientData, ownerId: user.uid }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const addClient = async (name: string) => {
    if (!name.trim()) return;
    const newId = 'client_' + Date.now();
    const newClient: Client = {
      id: newId,
      name: name.trim(),
      tinLibrary: { customers: [], suppliers: [] },
      sales: [],
      purchases: [],
      expenses: []
    };

    if (!user) {
      const newClients = { ...clients, [newId]: newClient };
      setClients(newClients);
      localStorage.setItem('capo_accounting_v14_react', JSON.stringify(newClients));
      setCurrentClientId(newId);
      showToast('Client added (Local Only)');
      return;
    }

    const path = `users/${user.uid}/clients/${newId}`;
    try {
      const clientRef = doc(db, 'users', user.uid, 'clients', newId);
      await setDoc(clientRef, { ...newClient, ownerId: user.uid });
      setCurrentClientId(newId);
      showToast('Client added to cloud');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const openModal = (modal: string | null) => {
    setActiveModal(modal);
  };

  if (!isReady) return null;

  const currentClient = currentClientId ? clients[currentClientId] : null;

  return (
    <AccountingContext.Provider
      value={{
        clients,
        currentClientId,
        currentClient,
        isDarkMode,
        activeModal,
        pendingModal,
        currentDat,
        historyTab,
        toastMsg,
        setDarkMode,
        openModal,
        setPendingModal,
        setHistoryTab,
        setCurrentClientId,
        setCurrentDat,
        saveClient,
        addClient,
        showToast
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const ctx = useContext(AccountingContext);
  if (!ctx) throw new Error('useAccounting must be used within AccountingProvider');
  return ctx;
};
