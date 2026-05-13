import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { CoaAccount } from '../../types';
import { cn } from '../../lib/utils';

export const DEFAULT_ACCOUNTS: CoaAccount[] = [
  { id: '1000', name: 'Assets', type: 'Asset' },
  { id: '1100', name: 'Cash and Cash Equivalents', type: 'Asset', parentId: '1000' },
  { id: '1200', name: 'Accounts Receivable', type: 'Asset', parentId: '1000' },
  { id: '1300', name: 'Inventory', type: 'Asset', parentId: '1000' },
  { id: '2000', name: 'Liabilities', type: 'Liability' },
  { id: '2100', name: 'Accounts Payable', type: 'Liability', parentId: '2000' },
  { id: '3000', name: 'Equity', type: 'Equity' },
  { id: '3100', name: 'Owner\'s Capital', type: 'Equity', parentId: '3000' },
  { id: '4000', name: 'Revenue', type: 'Revenue' },
  { id: '4100', name: 'Sales', type: 'Revenue', parentId: '4000' },
  { id: '5000', name: 'Expenses', type: 'Expense' },
  { id: '5100', name: 'Cost of Goods Sold', type: 'Expense', parentId: '5000' },
  { id: '5200', name: 'Operating Expenses', type: 'Expense', parentId: '5000' },
];

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

export function ChartOfAccountsModal() {
  const { currentClient, currentClientId, saveClient } = useAccounting();
  const [isAdding, setIsAdding] = useState(false);
  const [addingParentId, setAddingParentId] = useState<string | undefined>(undefined);
  
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Asset');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!currentClient || !currentClientId) return null;

  let accounts = currentClient.accounts || [];
  if (accounts.length === 0) {
    accounts = [...DEFAULT_ACCOUNTS];
  }

  const handleSaveAccounts = (updatedAccounts: CoaAccount[]) => {
    saveClient(currentClientId, { ...currentClient, accounts: updatedAccounts });
  };

  const handleAddAccount = () => {
    if (!newId || !newName || !newType) {
      alert("Please fill out Account Code, Name, and Type.");
      return;
    }
    if (accounts.some(a => a.id === newId)) {
      alert("Account Code already exists!");
      return;
    }
    
    // Add logic if it's a sub-account, it inherits type
    let finalType = newType;
    if (addingParentId) {
      const parent = accounts.find(a => a.id === addingParentId);
      if (parent) finalType = parent.type;
    }

    const updatedAccounts = [...accounts, { id: newId, name: newName, type: finalType, parentId: addingParentId }];
    handleSaveAccounts(updatedAccounts);
    setIsAdding(false);
    setNewId('');
    setNewName('');
    setAddingParentId(undefined);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this account? This will also delete any sub-accounts.")) {
      const idsToDelete = new Set([id]);
      let added = true;
      // cascade delete sub-accounts
      while (added) {
        added = false;
        accounts.forEach(a => {
          if (a.parentId && idsToDelete.has(a.parentId) && !idsToDelete.has(a.id)) {
            idsToDelete.add(a.id);
            added = true;
          }
        });
      }
      
      const updatedAccounts = accounts.filter(a => !idsToDelete.has(a.id));
      handleSaveAccounts(updatedAccounts);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderAccounts = (parentId?: string, depth = 0) => {
    const levelAccounts = accounts.filter(a => a.parentId === parentId).sort((a, b) => a.id.localeCompare(b.id));

    return levelAccounts.map(account => {
      const hasChildren = accounts.some(a => a.parentId === account.id);
      const isExpanded = expanded[account.id] !== false; // Default expanded

      return (
        <React.Fragment key={account.id}>
          <div className={cn(
            "flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 group",
            depth === 0 ? "bg-slate-50 font-semibold dark:bg-slate-800/20" : ""
          )}>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1.5}rem` }}>
              {hasChildren ? (
                <button onClick={() => toggleExpand(account.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <div className="w-6" /> // spacer
              )}
              <span className="text-slate-600 dark:text-slate-400 font-mono text-sm">{account.id}</span>
              <span className="text-slate-800 dark:text-slate-200">{account.name}</span>
              {depth === 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                  {account.type}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                  setAddingParentId(account.id);
                  setNewType(account.type);
                  setIsAdding(true);
                }}
                className="text-xs px-2 py-1 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Sub-account
              </button>
              <button 
                onClick={() => handleDelete(account.id)}
                className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                title="Delete Account"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {hasChildren && isExpanded && renderAccounts(account.id, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <Modal id="coa" title="Chart of Accounts" icon={<BookOpen />} maxWidth="max-w-4xl">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-slate-500 dark:text-slate-400">Manage your ledger accounts and sub-accounts.</p>
          <button 
            onClick={() => {
              setAddingParentId(undefined);
              setIsAdding(true);
            }}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Main Account
          </button>
        </div>

        {isAdding && (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Account Code</label>
              <input 
                type="text" 
                value={newId} 
                onChange={e => setNewId(e.target.value)} 
                className="w-24 form-input"
                placeholder="e.g. 1010"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-slate-500 mb-1">Account Name</label>
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                className="w-full form-input"
                placeholder="e.g. Petty Cash"
              />
            </div>
            {!addingParentId && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                <select 
                  value={newType} 
                  onChange={e => setNewType(e.target.value)} 
                  className="form-input w-36"
                >
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {addingParentId && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Parent Account</label>
                <div className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-mono text-sm">
                  {addingParentId}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button 
                onClick={handleAddAccount}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Save
              </button>
              <button 
                onClick={() => setIsAdding(false)}
                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="flex text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex-1" style={{ paddingLeft: '2rem' }}>Account Name</div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {renderAccounts()}
          </div>
        </div>
      </div>
    </Modal>
  );
}
