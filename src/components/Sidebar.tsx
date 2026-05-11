import { cn } from '../lib/utils';
import { useAccounting } from '../context/AccountingContext';
import { 
  Users, Building2, BookText, BookOpen, 
  LineChart, Scale, Receipt, ShoppingCart, 
  TrendingUp, Activity, Lightbulb, FolderClock 
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { openModal, currentDat } = useAccounting();

  const handleNavClick = (modalId: string) => {
    // If going to purchases but DAT isn't set, intercept and ask for DAT first
    if (modalId === 'purchases' && !currentDat) {
      openModal('dat');
    } else {
      openModal(modalId);
    }
    setIsOpen(false);
  };

  const navItems = [
    { id: 'clients', label: 'Client Profiles', icon: Users },
    { id: 'tinlibrary', label: 'TIN Library', icon: Building2 },
    { id: 'coa', label: 'Chart of Accounts', icon: BookOpen },
    { id: 'journal', label: 'Journal Entry', icon: BookText },
    { id: 'ledger', label: 'General Ledger', icon: LineChart },
    { id: 'trialbalance', label: 'Trial Balance', icon: Scale },
    { id: 'sales', label: 'Income', icon: Receipt },
    { id: 'purchases', label: 'Expenses', icon: ShoppingCart },
    { id: 'pl', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'ratios', label: 'Ratios', icon: Activity },
    { id: 'taxnotes', label: 'Tax Notes', icon: Lightbulb },
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
          <h2 className="text-xl font-extrabold tracking-tight text-blue-900 dark:text-blue-400 flex flex-col items-center justify-center gap-1">
            CAPO
            <span className="bg-yellow-400 text-blue-900 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
              Accounting Software
            </span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
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
        </div>
      </div>
    </>
  );
}
