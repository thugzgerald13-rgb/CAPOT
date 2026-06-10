import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client, DatSelection, AuditLogEntry } from '../types';
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
  getDoc,
  deleteDoc
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
  syncError: string | null;
  syncData: () => Promise<void>;
  
  setDarkMode: (value: boolean) => void;
  openModal: (modal: string | null) => void;
  setPendingModal: (modal: string | null) => void;
  setHistoryTab: (tab: string) => void;
  setCurrentClientId: (id: string) => void;
  setCurrentDat: (dat: DatSelection | null) => void;
  
  saveClient: (id: string, clientData: Client) => Promise<void>;
  addClient: (name: string, isOwnBusiness?: boolean) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  showToast: (msg: string) => void;
  logAuditTrail: (action: 'Add' | 'Update' | 'Delete' | 'Import' | 'Export' | 'View', section: string, details: string) => Promise<void>;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'capo_accounting_v14_react';
const OLD_STORAGE_KEY = 'capo_accounting_v13_react';

const getAutoAuditLogs = (oldClient: Client, newClient: Client, userEmail: string, userRole: string): AuditLogEntry[] => {
  const logs: AuditLogEntry[] = [];

  const createLog = (action: 'Add' | 'Update' | 'Delete', section: string, details: string, originalData?: any, newData?: any): AuditLogEntry => ({
    id: 'log_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
    timestamp: new Date().toISOString(),
    userEmail,
    userRole,
    action,
    section,
    details,
    originalData: originalData ? JSON.stringify(originalData) : undefined,
    newData: newData ? JSON.stringify(newData) : undefined,
  });

  const diffEntries = <T extends { id: string | number }>(
    oldArr: T[] = [],
    newArr: T[] = [],
    section: string,
    getDesc: (item: T) => string
  ) => {
    const oldArrSafe = oldArr || [];
    const newArrSafe = newArr || [];
    const oldMap = new Map(oldArrSafe.map(x => [String(x.id), x]));
    const newMap = new Map(newArrSafe.map(x => [String(x.id), x]));

    for (const item of oldArrSafe) {
      if (!newMap.has(String(item.id))) {
        logs.push(createLog('Delete', section, `Deleted entry: ${getDesc(item)}`, item));
      }
    }

    for (const item of newArrSafe) {
      const oldItem = oldMap.get(String(item.id));
      if (!oldItem) {
        logs.push(createLog('Add', section, `Added entry: ${getDesc(item)}`, undefined, item));
      } else {
        const cleanOld = { ...oldItem };
        const cleanNew = { ...item };
        if (JSON.stringify(cleanOld) !== JSON.stringify(cleanNew)) {
          logs.push(createLog('Update', section, `Updated entry: ${getDesc(item)}`, oldItem, item));
        }
      }
    }
  };

  // 1. CRJ Entries Diff
  diffEntries(
    oldClient.crjEntries || [],
    newClient.crjEntries || [],
    'Cash Receipts',
    (entry) => {
      const vals = entry.values || {};
      const ref = vals.ref || vals.reference || vals.invoiceNo || 'No Ref';
      const date = vals.date || 'No Date';
      const payer = vals.payer || vals.entity || vals.particulars || 'No Name';
      const amount = vals.amount || vals.debit || vals.credit || vals.total || '0';
      return `Ref: ${ref} on ${date} (Customer: ${payer}) for ₱${Number(amount).toLocaleString()}`;
    }
  );

  // 2. CDJ Entries Diff
  diffEntries(
    oldClient.cdjEntries || [],
    newClient.cdjEntries || [],
    'Cash Disbursements',
    (entry) => {
      const vals = entry.values || {};
      const ref = vals.ref || vals.reference || vals.checkNo || 'No Ref';
      const date = vals.date || 'No Date';
      const payee = vals.payee || vals.entity || vals.particulars || 'No Name';
      const amount = vals.amount || vals.debit || vals.credit || vals.total || '0';
      return `Ref: ${ref} on ${date} (Payee: ${payee}) for ₱${Number(amount).toLocaleString()}`;
    }
  );

  // 3. PJ Entries Diff
  diffEntries(
    oldClient.pjEntries || [],
    newClient.pjEntries || [],
    'Purchases Journal',
    (entry) => {
      const vals = entry.values || {};
      const ref = vals.ref || vals.reference || vals.invoiceNo || 'No Ref';
      const date = vals.date || 'No Date';
      const supplier = vals.supplier || vals.entity || vals.particulars || 'No Name';
      const amount = vals.amount || vals.debit || vals.credit || vals.total || '0';
      return `Ref: ${ref} on ${date} (Supplier: ${supplier}) for ₱${Number(amount).toLocaleString()}`;
    }
  );

  // 4. GJ Entries Diff
  diffEntries(
    oldClient.gjEntries || [],
    newClient.gjEntries || [],
    'General Journal',
    (entry) => {
      const vals = entry.values || {};
      const ref = vals.ref || vals.reference || 'No Ref';
      const date = vals.date || 'No Date';
      const desc = vals.description || vals.particulars || 'No Desc';
      const amount = vals.amount || vals.debit || vals.credit || '0';
      return `JV Ref: ${ref} on ${date} (${desc}) for ₱${Number(amount).toLocaleString()}`;
    }
  );

  // 5. Sales Ledgers / Normal Entry Diff
  diffEntries(
    oldClient.sales || [],
    newClient.sales || [],
    'Sales',
    (s) => `SI/Ref: ${s.ref || 'No Ref'} on ${s.date} (Customer: ${s.buyerName || '—'}) for ₱${Number(s.amount).toLocaleString()}`
  );

  // 6. Purchases/Expenses Ledgers / Normal Entry Diff
  diffEntries(
    oldClient.purchases || [],
    newClient.purchases || [],
    'Expenses',
    (p) => `Invoice No: ${p.invoiceNo || 'No Ref'} on ${p.date} (Supplier: ${p.supplierName || '—'}) for ₱${Number(p.amount).toLocaleString()}`
  );

  // 7. General Ledger Accounts / Accounts Diff
  diffEntries(
    oldClient.accounts || [],
    newClient.accounts || [],
    'Chart of Accounts',
    (acc) => `Account: ${acc.id} - ${acc.name} (${acc.type})`
  );

  // 8. TIN Library Change
  const oldSuppliers = oldClient.tinLibrary?.suppliers || [];
  const newSuppliers = newClient.tinLibrary?.suppliers || [];
  diffEntries(
    oldSuppliers,
    newSuppliers,
    'TIN Library',
    (tin) => `Supplier: ${tin.name} (TIN: ${tin.tin})`
  );

  const oldCustomers = oldClient.tinLibrary?.customers || [];
  const newCustomers = newClient.tinLibrary?.customers || [];
  diffEntries(
    oldCustomers,
    newCustomers,
    'TIN Library',
    (tin) => `Customer: ${tin.name} (TIN: ${tin.tin})`
  );

  // 9. Payables / Disbursements Suite
  diffEntries(
    oldClient.disbursements || [],
    newClient.disbursements || [],
    'Cash Disbursements',
    (cd) => `Voucher/Check: ${cd.voucherNo || ('Check #' + cd.checkNo) || 'No Ref'} on ${cd.date} for ₱${cd.netAmountPaid.toLocaleString()}`
  );

  // 10. Receipts Suite
  diffEntries(
    oldClient.receipts || [],
    newClient.receipts || [],
    'Cash Receipts',
    (cr) => `${cr.receiptType} OR: ${cr.receiptNo || ('Check #' + cr.checkNo) || 'No Ref'} on ${cr.date} for ₱${cr.amount.toLocaleString()}`
  );

  return logs;
};

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
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncData = async () => {
    if (!user || !isReady) return;
    setIsSyncing(true);
    
    const keysToMigrate = [LOCAL_STORAGE_KEY, OLD_STORAGE_KEY];
    let totalMigrated = 0;
    
    try {
      for (const key of keysToMigrate) {
        const saved = localStorage.getItem(key);
        if (!saved) continue;
        
        const localData = JSON.parse(saved) as Record<string, Client>;
        const localIds = Object.keys(localData);
        if (localIds.length === 0) continue;

        console.log(`Manual sync: migrating ${key}...`);
        const batch = writeBatch(db);
        let count = 0;

        for (const id of localIds) {
          const client = localData[id];
          const clientRef = doc(db, 'clients', id);
          
          batch.set(clientRef, {
            ...client,
            userId: user.uid,
            updatedAt: serverTimestamp()
          }, { merge: true });
          count++;
        }
        
        if (count > 0) {
          await batch.commit();
          totalMigrated += count;
          localStorage.removeItem(key);
        }
      }
      
      if (totalMigrated > 0) {
        showToast(`Successfully synced ${totalMigrated} items to cloud`);
      } else {
        showToast("Cloud sync complete (no new local changes found)");
      }
    } catch (e) {
      console.error("Manual sync failed", e);
      showToast("Sync failed. Check console for details.");
    } finally {
      setIsSyncing(false);
    }
  };

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
    setSyncError(null);
    
    let isTimedOut = false;
    const timeout = setTimeout(() => {
      if (!isReady) {
        isTimedOut = true;
        setSyncError("Connection timeout. Firestore is taking too long to respond. This usually happens if Firestore is not enabled in your Firebase console or if your internet is slow.");
        setIsSyncing(false);
      }
    }, 12000); // reduced to 12s for better UX

    const q = query(collection(db, 'clients'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isTimedOut) return;
      clearTimeout(timeout);
      const cloudClients: Record<string, Client> = {};
      snapshot.forEach((docSnap) => {
        cloudClients[docSnap.id] = docSnap.data() as Client;
      });
      
      // Merge logic: If we have local clients that are NOT in the cloud yet, 
      // keep them in state so they don't "disappear" during migration
      setClients(prev => {
        const merged = { ...cloudClients };
        // Check local storage directly for items not yet in cloud
        const keysToCheck = [LOCAL_STORAGE_KEY, OLD_STORAGE_KEY];
        keysToCheck.forEach(key => {
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              const localData = JSON.parse(saved) as Record<string, Client>;
              Object.keys(localData).forEach(id => {
                if (!merged[id]) {
                  console.log(`Merging local record ${id} from ${key}`);
                  merged[id] = localData[id];
                }
              });
            } catch(e) {}
          }
        });
        return merged;
      });
      
      // Select first client if none selected
      setClients(currentMerged => {
        if (Object.keys(currentMerged).length > 0 && !currentClientId) {
          setCurrentClientId(Object.keys(currentMerged)[0]);
        }
        return currentMerged;
      });
      
      setIsSyncing(false);
      setIsReady(true);
      setSyncError(null);
    }, (error) => {
      clearTimeout(timeout);
      if (isTimedOut) return;
      
      console.error("Sync error:", error);
      let msg = error instanceof Error ? error.message : String(error);
      
      if (msg.includes('permission-denied')) {
        msg = "Permission denied. Please ensure your Firestore Security Rules are deployed and you are authorized.";
      } else if (msg.includes('unavailable')) {
        msg = "Service unavailable. Check your internet connection.";
      }
      
      setSyncError(msg);
      setIsSyncing(false);
      setIsReady(true); // Allow skipping to local mode
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [user]);

  // Automatic Migration: Local -> Cloud
  useEffect(() => {
    const migrateData = async () => {
      if (!user || !isReady) return;
      
      const keysToMigrate = [LOCAL_STORAGE_KEY, OLD_STORAGE_KEY];
      
      for (const key of keysToMigrate) {
        const saved = localStorage.getItem(key);
        if (!saved) continue;
        
        try {
          const localData = JSON.parse(saved) as Record<string, Client>;
          const localIds = Object.keys(localData);
          if (localIds.length === 0) continue;

          console.log(`Checking for local data in ${key} to migrate...`);
          const batch = writeBatch(db);
          let count = 0;

          for (const id of localIds) {
            const client = localData[id];
            const clientRef = doc(db, 'clients', id);
            
            // To be safe and respect user's local work, we upsert
            batch.set(clientRef, {
              ...client,
              userId: user.uid,
              updatedAt: serverTimestamp()
            }, { merge: true });
            count++;
          }
          
          if (count > 0) {
            await batch.commit();
            console.log(`Successfully migrated ${count} records from ${key} to cloud.`);
            showToast(`Synced ${count} items to cloud`);
            localStorage.removeItem(key);
          }
        } catch (e) {
          console.error(`Migration failed for ${key}`, e);
        }
      }
    };

    migrateData();
  }, [user, isReady]);

  const saveClient = async (id: string, clientData: Client) => {
    const oldClient = clients[id];
    let finalClientData = { ...clientData };

    if (oldClient) {
      const savedRole = user ? (localStorage.getItem(`user_role_${user.uid}`) || 'Staff') : 'Staff';
      const userEmail = user?.email || 'Anonymous';
      const autoLogs = getAutoAuditLogs(oldClient, clientData, userEmail, savedRole);
      if (autoLogs.length > 0) {
        finalClientData.auditLogs = [...autoLogs, ...(finalClientData.auditLogs || [])];
      }
    }

    if (user) {
      try {
        const clientRef = doc(db, 'clients', id);
        await setDoc(clientRef, {
          ...finalClientData,
          userId: user.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
        showToast('Profile updated');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
      }
    } else {
      const newClients = { ...clients, [id]: finalClientData };
      setClients(newClients);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newClients));
    }
  };

  const logAuditTrail = async (
    action: 'Add' | 'Update' | 'Delete' | 'Import' | 'Export' | 'View',
    section: string,
    details: string
  ) => {
    const targetId = currentClientId;
    if (!targetId || !clients[targetId]) return;
    const client = clients[targetId];

    const savedRole = user ? (localStorage.getItem(`user_role_${user.uid}`) || 'Staff') : 'Staff';
    const userEmail = user?.email || 'Anonymous';

    const newLog: AuditLogEntry = {
      id: 'log_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
      timestamp: new Date().toISOString(),
      userEmail,
      userRole: savedRole,
      action,
      section,
      details
    };

    const updatedClient = {
      ...client,
      auditLogs: [newLog, ...(client.auditLogs || [])]
    };

    await saveClient(targetId, updatedClient);
  };

  const addClient = async (name: string, isOwnBusiness: boolean = false) => {
    if (!name.trim()) return;
    const newId = 'client_' + Date.now();
    const newClient: Client = {
      id: newId,
      name: name.trim(),
      tinLibrary: { customers: [], suppliers: [] },
      sales: [],
      purchases: [],
      expenses: [],
      fixedAssets: [],
      isOwnBusiness: isOwnBusiness
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

  const deleteClient = async (id: string) => {
    if (user) {
      try {
        const clientRef = doc(db, 'clients', id);
        await deleteDoc(clientRef);
        showToast('Client deleted');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
      }
    } else {
      const newClients = { ...clients };
      delete newClients[id];
      setClients(newClients);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newClients));
      showToast('Client deleted');
    }

    setClients(prev => {
      const newClients = { ...prev };
      delete newClients[id];
      return newClients;
    });

    if (currentClientId === id) {
      const remainingIds = Object.keys(clients).filter(cId => cId !== id);
      if (remainingIds.length > 0) {
        setCurrentClientId(remainingIds[0]);
      } else {
        setCurrentClientId(null);
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const openModal = (modal: string | null) => {
    setActiveModal(modal);
  };

  if (syncError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Sync Connection Failed</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">
            {syncError}
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Retry Connection</span>
            </button>
            <button 
              onClick={async () => {
                await auth.signOut();
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-2xl font-bold transition-all"
            >
              Reset and Sign Out
            </button>
            <button 
              onClick={() => setSyncError(null)}
              className="w-full py-2 text-slate-400 hover:text-slate-500 text-xs font-medium transition-all"
            >
              Skip and Use Local Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-6">
        <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-800 border-t-blue-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping"></div>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Syncing your data...</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              We're connecting to the cloud to ensure your records are up to date.
            </p>
          </div>
          
          <button 
            onClick={() => setIsReady(true)}
            className="mt-4 px-6 py-2 text-slate-400 hover:text-blue-500 text-xs font-semibold uppercase tracking-widest transition-colors"
          >
            Skip and start offline
          </button>
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
        syncError,
        syncData,
        setDarkMode,
        openModal,
        setPendingModal,
        setHistoryTab,
        setCurrentClientId,
        setCurrentDat,
        saveClient,
        addClient,
        deleteClient,
        showToast,
        logAuditTrail
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
