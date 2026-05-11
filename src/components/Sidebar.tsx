import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAccounting } from '../context/AccountingContext';
import { 
  Users, Building2, BookText, BookOpen, 
  LineChart, Scale, Receipt, ShoppingCart, 
  TrendingUp, FileText, Library, Lightbulb, FolderClock, History,
  ChevronDown, LayoutGrid, Settings, Key, Banknote, Wallet, CreditCard
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { openModal, currentDat, setHistoryTab, setPendingModal } = useAccounting();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBooksOpen, setIsBooksOpen] = useState(false);

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
    { id: 'purchases', label: 'Expenses', icon: ShoppingCart },
  ];

  const historyItems = [
    { id: 'expenses', label: 'Expense History', icon: ShoppingCart },
    { id: 'income', label: 'Income History', icon: Receipt },
    { id: 'dat', label: 'DAT History', icon: FolderClock },
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

      <div className={cn(
        "fixed md:static inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 transform transition-transform duration-300 md:translate-x-0 h-screen",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 text-center shrink-0">
          <h2 className="text-2xl font-black tracking-tighter text-blue-900 dark:text-blue-400 flex items-center justify-center">
            CAPOT<span className="text-amber-500 italic">BOOKS</span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 custom-scrollbar">
          {/* Current Period Badge */}
          {currentDat && (
            <div className="px-4 py-3 mb-2 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Active Period</span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currentDat.formatted}</span>
                  <button 
                    onClick={() => {
                      setPendingModal(null);
                      openModal('dat');
                    }}
                    className="p-1 px-2 text-[10px] bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-50 transition-colors font-bold"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>
          )}

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

          {/* Books Collapsible Dropdown */}
          <div className="flex flex-col">
            <button
              onClick={() => setIsBooksOpen(!isBooksOpen)}
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
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reports Collapsible Dropdown */}
          <div className="flex flex-col">
            <button
              onClick={() => setIsReportsOpen(!isReportsOpen)}
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
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
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
                  <button
                    onClick={() => handleNavClick('clients')}
                    className="flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all w-full text-left"
                  >
                    <Users className="w-4 h-4" />
                    Client Profiles
                  </button>
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
