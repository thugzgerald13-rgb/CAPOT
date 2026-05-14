import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client, DatSelection } from '../types';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, query, where, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

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
  
  saveClient: (id: string, clientData: Client) => Promise<void>;
  addClient: (name: string) => Promise<void>;
  showToast: (msg: string) => void;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

const DEFAULT_DATA: Record<string, Client> = {};

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [currentClientId, setCurrentClientIdState] = useState<string | null>(null);
  const currentClientIdRef = React.useRef<string | null>(null);

  const setCurrentClientId = (id: string | null) => {
    setCurrentClientIdState(id);
    currentClientIdRef.current = id;
  };
  const [isDarkMode, setDarkMode] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<string | null>(null);
  const [currentDat, setCurrentDat] = useState<DatSelection | null>(null);
  const [historyTab, setHistoryTab] = useState('expenses');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize data and sync with Firestore
  useEffect(() => {
    const darkMode = localStorage.getItem('capo_dark_mode') === 'true';
    setDarkMode(darkMode);

    if (!user) {
      // Local mode if not logged in
      const saved = localStorage.getItem('capo_accounting_v14_react');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setClients(parsed);
          const keys = Object.keys(parsed);
          if (keys.length > 0) setCurrentClientId(keys[0]);
        } catch (e) {
          setClients(DEFAULT_DATA);
        }
      }
      setIsReady(true);
      return;
    }

    // Firestore sync if logged in
    const clientsRef = collection(db, 'users', user.uid, 'clients');
    const unsubscribe = onSnapshot(clientsRef, async (snapshot) => {
      const remoteClients: Record<string, Client> = {};
      snapshot.forEach((doc) => {
        remoteClients[doc.id] = doc.data() as Client;
      });
      
      const remoteKeys = Object.keys(remoteClients);
      
      if (remoteKeys.length === 0) {
        // Potential migration needed: check local storage if firestore is empty
        const saved = localStorage.getItem('capo_accounting_v14_react');
        if (saved) {
          try {
            const localClients = JSON.parse(saved);
            const localKeys = Object.keys(localClients);
            if (localKeys.length > 0) {
              console.log("Migrating local data to Firestore...");
              // Push local clients to Firestore
              for (const id of localKeys) {
                const clientRef = doc(db, 'users', user.uid, 'clients', id);
                await setDoc(clientRef, { ...localClients[id], ownerId: user.uid }, { merge: true });
              }
              // The next snapshot will catch these additions
              return;
            }
          } catch (e) {
            console.error("Migration failed", e);
          }
        }
      }

      setClients(remoteClients);

      // Set active client if not set or if current one was removed
      if (remoteKeys.length > 0) {
        if (!currentClientIdRef.current || !remoteClients[currentClientIdRef.current]) {
          setCurrentClientId(remoteKeys[0]);
        }
      } else {
        setCurrentClientId(null);
      }
      
      setIsReady(true);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setIsReady(true);
    });

    return () => unsubscribe();
  }, [user]);

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
    const newClients = { ...clients, [id]: clientData };
    setClients(newClients);
    
    if (user) {
      try {
        const clientRef = doc(db, 'users', user.uid, 'clients', id);
        await setDoc(clientRef, { ...clientData, ownerId: user.uid }, { merge: true });
      } catch (error) {
        console.error("Error saving to Firestore:", error);
        showToast('Error saving to cloud');
      }
    } else {
      localStorage.setItem('capo_accounting_v14_react', JSON.stringify(newClients));
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

    if (user) {
      try {
        const clientRef = doc(db, 'users', user.uid, 'clients', newId);
        await setDoc(clientRef, { ...newClient, ownerId: user.uid });
        setCurrentClientId(newId);
        showToast('Business profile added to cloud');
      } catch (error) {
        console.error("Error adding to Firestore:", error);
        showToast('Error adding to cloud');
      }
    } else {
      const newClients = { ...clients, [newId]: newClient };
      setClients(newClients);
      localStorage.setItem('capo_accounting_v14_react', JSON.stringify(newClients));
      setCurrentClientId(newId);
      showToast('Client added locally');
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
