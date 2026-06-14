import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAccounting } from '../context/AccountingContext';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Building2, BookText, BookOpen, 
  LineChart, Scale, Receipt, ShoppingCart, 
  TrendingUp, FileText, Library, Lightbulb, FolderClock, History,
  ChevronDown, LayoutGrid, Settings, Key, Banknote, Wallet, CreditCard, ShieldAlert, RefreshCw, LogOut, Shield, FolderUp
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { openModal, currentDat, setCurrentDat, setHistoryTab, setPendingModal, syncData, isSyncing } = useAccounting();
  const { user, isAdmin, userRole, signOut } = useAuth();
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBooksOpen, setIsBooksOpen] = useState(false);
  const [isDatHistoryOpen, setIsDatHistoryOpen] = useState(false);
  const [isDevOpen, setIsDevOpen] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsExpensesOpen(false);
        setIsHistoryOpen(false);
        setIsReportsOpen(false);
        setIsSettingsOpen(false);
        setIsBooksOpen(false);
        setIsDatHistoryOpen(false);
        setIsDevOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = (dropdown: string) => {
    setIsExpensesOpen(dropdown === 'expenses' ? !isExpensesOpen : false);
    setIsBooksOpen(dropdown === 'books' ? !isBooksOpen : false);
    setIsHistoryOpen(dropdown === 'history' ? !isHistoryOpen : false);
    setIsReportsOpen(dropdown === 'reports' ? !isReportsOpen : false);
    setIsSettingsOpen(dropdown === 'settings' ? !isSettingsOpen : false);
    setIsDevOpen(dropdown === 'dev' ? !isDevOpen : false);
    if (dropdown !== 'history') {
      setIsDatHistoryOpen(false);
    }
  };

  const handleNavClick = (modalId: string, historyType?: string) => {
    if (historyType) {
      setHistoryTab(historyType);
    }

    // Always verify or ask for DAT when going to sales or purchases
    if (modalId === 'sales' || modalId === 'purchases') {
      setPendingModal(modalId);
      openModal('dat');
    } else {
      openModal(modalId);
    }
    
    if (!historyType) {
      setIsOpen(false);
    }
  };

  const navItems = [
    { id: 'coa', label: 'Chart of Accounts', icon: BookOpen },
    { id: 'sales', label: 'Income', icon: Receipt },
    { id: 'files', label: 'Upload Files', icon: FolderUp },
    { id: 'ap-workspace', label: 'AP & Disbursements', icon: Banknote },
  ];

  const historyItems = [
    { id: 'expenses', label: 'Expense History', icon: ShoppingCart },
    { id: 'income', label: 'Income History', icon: Receipt },
  ];

  const datHistoryItems = [
    { id: 'slp', label: 'SLP (Purchases)', icon: FolderClock },
    { id: 'sls', label: 'SLS (Sales)', icon: FolderClock },
  ];

  const reportItems = [
    { id: 'pl', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'trialbalance', label: 'Trial Balance', icon: Scale },
    { id: 'reports', label: 'All Reports Dashboard', icon: LayoutGrid },
  ];

  const bookItems = [
    { id: 'journal', label: 'General Journal', icon: BookText },
    { id: 'ledger', label: 'General Ledger', icon: LineChart },
    { id: 'sales-journal', label: 'Sales Journal', icon: Receipt },
    { id: 'purchase-journal', label: 'Purchase Journal', icon: ShoppingCart },
    { id: 'cash-disbursement', label: 'Cash Disbursement Book', icon: CreditCard },
    { id: 'cash-receipt', label: 'Cash Receipt Journal', icon: Wallet },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <div ref={sidebarRef} className={cn(
        "fixed md:static inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 transform transition-transform duration-300 md:translate-x-0 h-screen",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 text-center shrink-0">
          <h2 className="text-2xl font-black tracking-tighter text-blue-900 dark:text-blue-400 flex items-center justify-center">
            CAPOT<span className="text-amber-500 italic">BOOKS</span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-xl hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-all w-full text-left group"
              >
                <Icon className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                {item.label}
              </button>
            );
          })}

          {/* Expenses Collapsible Dropdown */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleDropdown('expenses')}
              className={cn(
                "flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-xl transition-all w-full text-left group",
                isExpensesOpen ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400" : "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span>Expenses</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpensesOpen ? "rotate-180" : "")} />
            </button>

            <AnimatePresence>
              {isExpensesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden flex flex-col gap-1 mt-1 pl-4"
                >
                  <button
                    onClick={() => {
                        setPendingModal('purchases');
                        openModal('dat');
                        setIsOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition-all w-full text-left"
                  >
                    <FolderClock className="w-4 h-4" />
                    DAT Entry
                  </button>
                  <button
                    onClick={() => {
                        setCurrentDat(null);
                        openModal('purchases');
                        setIsOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition-all w-full text-left"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Normal Entry
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Books Collapsible Dropdown */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleDropdown('books')}
              className={cn(
                "flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-xl transition-all w-full text-left group",
                isBooksOpen ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400" : "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-3">
                <Library className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span>Books</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isBooksOpen ? "rotate-180" : "")} />
            </button>

            <AnimatePresence>
              {isBooksOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden flex flex-col gap-1 mt-1 pl-4"
                >
                  {bookItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavClick(subItem.id)}
                        className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-cyan-50 hover:text-cyan-600 dark:hover:bg-slate-800 dark:hover:text-cyan-400 transition-all w-full text-left"
                      >
                        <SubIcon className="w-4 h-4" />
                        {subItem.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* History Collapsible Dropdown */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleDropdown('history')}
              className={cn(
                "flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-xl transition-all w-full text-left group",
                isHistoryOpen ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400" : "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span>Transaction History</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isHistoryOpen ? "rotate-180" : "")} />
            </button>

            <AnimatePresence>
              {isHistoryOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden flex flex-col gap-1 mt-1 pl-4"
                >
                  {historyItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => {
                          handleNavClick('history', subItem.id);
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-all w-full text-left"
                      >
                        <SubIcon className="w-4 h-4" />
                        {subItem.label}
                      </button>
                    );
                  })}

                  {/* Nested DAT History Collapsible Dropdown */}
                  <div className="flex flex-col mt-1">
                    <button
                      onClick={() => setIsDatHistoryOpen(!isDatHistoryOpen)}
                      className={cn(
                        "flex items-center justify-between px-4 py-2 text-xs font-bold rounded-lg transition-all w-full text-left group",
                        isDatHistoryOpen 
                          ? "bg-indigo-50/80 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" 
                          : "text-slate-500 dark:text-slate-400 hover:bg-indigo-50/50 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FolderClock className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                        <span>DAT History</span>
                      </div>
                      <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isDatHistoryOpen ? "rotate-180" : "")} />
                    </button>

                    <AnimatePresence>
                      {isDatHistoryOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden flex flex-col gap-1 mt-1 pl-6"
                        >
                          {datHistoryItems.map((subItem) => {
                            const SubIcon = subItem.icon;
                            return (
                              <button
                                key={subItem.id}
                                onClick={() => {
                                  handleNavClick('history', subItem.id);
                                  setIsOpen(false);
                                }}
                                className="flex items-center gap-3 px-4 py-1.5 text-[11px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 text-left w-full rounded-md transition-all"
                              >
                                <SubIcon className="w-3.5 h-3.5" />
                                {subItem.label}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reports Collapsible Dropdown */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleDropdown('reports')}
              className={cn(
                "flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-xl transition-all w-full text-left group",
                isReportsOpen ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" : "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span>Reports</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isReportsOpen ? "rotate-180" : "")} />
            </button>

            <AnimatePresence>
              {isReportsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden flex flex-col gap-1 mt-1 pl-4"
                >
                  {reportItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => handleNavClick(subItem.id)}
                        className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-slate-800 dark:hover:text-amber-400 transition-all w-full text-left"
                      >
                        <SubIcon className="w-4 h-4" />
                        {subItem.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Settings Collapsible Dropdown */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleDropdown('settings')}
              className={cn(
                "flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-xl transition-all w-full text-left group",
                isSettingsOpen ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100" : "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span>Settings</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isSettingsOpen ? "rotate-180" : "")} />
            </button>

            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden flex flex-col gap-1 mt-1 pl-4"
                >
                  {userRole === 'owner' ? (
                    <button
                      onClick={() => handleNavClick('business')}
                      className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all w-full text-left"
                    >
                      <Building2 className="w-4 h-4" />
                      Business Profiles
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleNavClick('clients')}
                        className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all w-full text-left"
                      >
                        <Users className="w-4 h-4" />
                        Client Profiles
                      </button>
                      <button
                        onClick={() => handleNavClick('business')}
                        className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all w-full text-left"
                      >
                        <Building2 className="w-4 h-4" />
                        Business Profiles
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleNavClick('tinlibrary')}
                    className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all w-full text-left"
                  >
                    <Building2 className="w-4 h-4" />
                    TIN Library
                  </button>
                  <button
                    onClick={() => handleNavClick('taxnotes')}
                    className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all w-full text-left"
                  >
                    <Lightbulb className="w-4 h-4" />
                    Tax Notes & RDO
                  </button>
                  <button
                    onClick={() => {
                       syncData();
                       setIsOpen(false);
                    }}
                    disabled={isSyncing}
                    className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all w-full text-left disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                    {isSyncing ? 'Syncing...' : 'Sync Data Now'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Developer Tools Dropdown for Admin */}
          {isAdmin && (
            <div className="flex flex-col mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => toggleDropdown('dev')}
                className={cn(
                  "flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all w-full text-left group",
                  isDevOpen ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                  <span>Developer Tools</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isDevOpen ? "rotate-180" : "")} />
              </button>

              <AnimatePresence>
                {isDevOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden flex flex-col gap-1 mt-1 pl-4"
                  >
                    <button
                      onClick={() => handleNavClick('admin-settings')}
                      className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-all w-full text-left"
                    >
                      <Settings className="w-4 h-4" />
                      System Config
                    </button>
                    <button
                      onClick={() => {
                        console.log("Firebase config/diagnostics or extra dev options will go here.");
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-all w-full text-left"
                    >
                      <LineChart className="w-4 h-4" />
                      Diagnostics
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>

        {user && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50">
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate text-center font-medium bg-slate-100 dark:bg-slate-800 py-2 px-3 rounded-lg mx-1 flex items-center justify-center gap-2" title={user.email || ''}>
               <span className="truncate">{user.email}</span>
               {isAdmin && (
                 <Shield className="w-3 h-3 text-emerald-500 shrink-0" title="Developer" />
               )}
            </div>
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-2 w-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/30 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
