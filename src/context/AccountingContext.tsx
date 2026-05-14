import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client, DatSelection } from '../types';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  serverTimestamp, 
  writeBatch,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

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
  isSyncing: boolean;
  
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

const LOCAL_STORAGE_KEY = 'capo_accounting_v14_react';

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
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize UI preferences (Dark Mode)
  useEffect(() => {
    const darkMode = localStorage.getItem('capo_dark_mode') === 'true';
    setDarkMode(darkMode);
  }, []);

  // Sync dark mode class and cloud pref
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

    // Sync to cloud if logged in
    if (user && isReady) {
      const syncPref = async () => {
        try {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, { isDarkMode, updatedAt: serverTimestamp() }, { merge: true });
        } catch (e) {
          console.error("Failed to sync theme pref", e);
        }
      };
      syncPref();
    }
  }, [isDarkMode, user, isReady]);

  // Load dark mode from cloud if available
  useEffect(() => {
    const loadCloudPrefs = async () => {
      if (user && isReady) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (typeof data.isDarkMode === 'boolean') {
              setDarkMode(data.isDarkMode);
            }
          }
        } catch (e) {
          console.error("Failed to load theme pref", e);
        }
      }
    };
    loadCloudPrefs();
  }, [user, isReady]);

  // Real-time Firestore Sync & Local Fallback
  useEffect(() => {
    if (!user) {
      // Fallback to local storage when not logged in
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setClients(parsed);
          const keys = Object.keys(parsed);
          if (keys.length > 0) setCurrentClientId(keys[0]);
        } catch (e) {
          console.error("Local storage parse error", e);
        }
      }
      setIsReady(true);
      return;
    }

    // When logged in, listen to Firestore
    setIsSyncing(true);
    const q = query(collection(db, 'clients'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudClients: Record<string, Client> = {};
      snapshot.forEach((doc) => {
        cloudClients[doc.id] = doc.data() as Client;
      });
      
      setClients(cloudClients);
      
      // Select first client if none selected
      if (Object.keys(cloudClients).length > 0 && !currentClientId) {
        setCurrentClientId(Object.keys(cloudClients)[0]);
      }
      
      setIsSyncing(false);
      setIsReady(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    return unsubscribe;
  }, [user]);

  // Automatic Migration: Local -> Cloud
  useEffect(() => {
    const migrateData = async () => {
      if (!user || !isReady) return;
      
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!saved) return;
      
      try {
        const localData = JSON.parse(saved) as Record<string, Client>;
        if (Object.keys(localData).length === 0) return;

        // Check if cloud is already populated
        const q = query(collection(db, 'clients'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          // Cloud is empty, migrate local data
          console.log("Migrating local storage to cloud...");
          const batch = writeBatch(db);
          
          Object.values(localData).forEach((client) => {
            const clientRef = doc(db, 'clients', client.id);
            batch.set(clientRef, {
              ...client,
              userId: user.uid,
              updatedAt: serverTimestamp()
            });
          });
          
          await batch.commit();
          console.log("Migration complete!");
          showToast("Data synced to cloud");
          localStorage.removeItem(LOCAL_STORAGE_KEY); // Clean up after successful migration
        }
      } catch (e) {
        console.error("Migration failed", e);
      }
    };

    migrateData();
  }, [user, isReady]);

  const saveClient = async (id: string, clientData: Client) => {
    if (user) {
      try {
        const clientRef = doc(db, 'clients', id);
        await setDoc(clientRef, {
          ...clientData,
          userId: user.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
        showToast('Profile updated');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
      }
    } else {
      const newClients = { ...clients, [id]: clientData };
      setClients(newClients);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newClients));
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
    } as Client;

    if (user) {
      try {
        const clientRef = doc(db, 'clients', newId);
        await setDoc(clientRef, {
          ...newClient,
          userId: user.uid,
          updatedAt: serverTimestamp()
        });
        setCurrentClientId(newId);
        showToast('Client added');
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `clients/${newId}`);
      }
    } else {
      const newClients = { ...clients, [newId]: newClient };
      setClients(newClients);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newClients));
      setCurrentClientId(newId);
      showToast('Client added');
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const openModal = (modal: string | null) => {
    setActiveModal(modal);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-slate-500 font-medium animate-pulse">Syncing your data...</span>
        </div>
      </div>
    );
  }

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
        isSyncing,
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
