import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client, DatSelection } from '../types';

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

const DEFAULT_DATA: Record<string, Client> = {
  'client_default': {
    id: 'client_default',
    name: 'Sample Company',
    tinLibrary: {
      customers: [{ id: 1, tin: '123-456-789', name: 'ABC Corp' }],
      suppliers: [{ id: 1, tin: '111-222-333', name: 'Wholesale Inc.', address: '123 Trade St.' }]
    },
    sales: [],
    purchases: [],
    expenses: []
  }
};

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [isDarkMode, setDarkMode] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [pendingModal, setPendingModal] = useState<string | null>(null);
  const [currentDat, setCurrentDat] = useState<DatSelection | null>(null);
  const [historyTab, setHistoryTab] = useState('expenses');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize data
  useEffect(() => {
    const saved = localStorage.getItem('capo_accounting_v14_react');
    const darkMode = localStorage.getItem('capo_dark_mode') === 'true';
    setDarkMode(darkMode);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setClients(parsed);
        const keys = Object.keys(parsed);
        if (keys.length > 0) setCurrentClientId(keys[0]);
      } catch (e) {
        console.error("Failed to parse local storage", e);
        setClients(DEFAULT_DATA);
        setCurrentClientId('client_default');
      }
    } else {
      setClients(DEFAULT_DATA);
      setCurrentClientId('client_default');
      localStorage.setItem('capo_accounting_v14_react', JSON.stringify(DEFAULT_DATA));
    }
    setIsReady(true);
  }, []);

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('capo_dark_mode', 'true');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('capo_dark_mode', 'false');
    }
  }, [isDarkMode]);

  const saveClient = (id: string, clientData: Client) => {
    const newClients = { ...clients, [id]: clientData };
    setClients(newClients);
    localStorage.setItem('capo_accounting_v14_react', JSON.stringify(newClients));
  };

  const addClient = (name: string) => {
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
    const newClients = { ...clients, [newId]: newClient };
    setClients(newClients);
    localStorage.setItem('capo_accounting_v14_react', JSON.stringify(newClients));
    setCurrentClientId(newId);
    showToast('Client added');
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
