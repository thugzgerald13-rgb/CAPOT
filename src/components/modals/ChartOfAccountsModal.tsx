import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Plus, Trash2, ChevronRight, ChevronDown, RefreshCcw, Edit2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { CoaAccount } from '../../types';
import { cn } from '../../lib/utils';

export const DEFAULT_ACCOUNTS: CoaAccount[] = [
  { id: '1000', name: 'Assets', type: 'Assets' },
  { id: '1100', name: 'Cash and Cash Equivalents', type: 'Assets', parentId: '1000' },
  { id: '1200', name: 'Accounts Receivable', type: 'Assets', parentId: '1000' },
  { id: '1300', name: 'Inventory', type: 'Assets', parentId: '1000' },
  { id: '2000', name: 'Liabilities', type: 'Liabilities' },
  { id: '2100', name: 'Accounts Payable', type: 'Liabilities', parentId: '2000' },
  { id: '3000', name: 'Equity', type: 'Equity' },
  { id: '3100', name: 'Owner\'s Capital', type: 'Equity', parentId: '3000' },
  { id: '4000', name: 'Income', type: 'Income' },
  { id: '4100', name: 'Sales', type: 'Income', parentId: '4000' },
  { id: '5000', name: 'Costs', type: 'Costs' },
  { id: '5100', name: 'Cost of Goods Sold', type: 'Costs', parentId: '5000' },
  { id: '6000', name: 'Expenses', type: 'Expenses' },
  { id: '6100', name: 'Operating Expenses', type: 'Expenses', parentId: '6000' },
];

export const DEFAULT_ACCOUNTS_ALPHA: CoaAccount[] = [
  { id: 'AST', name: 'Assets', type: 'Assets' },
  { id: 'AST-100', name: 'Cash and Cash Equivalents', type: 'Assets', parentId: 'AST' },
  { id: 'AST-200', name: 'Accounts Receivable', type: 'Assets', parentId: 'AST' },
  { id: 'AST-300', name: 'Inventory', type: 'Assets', parentId: 'AST' },
  { id: 'LIA', name: 'Liabilities', type: 'Liabilities' },
  { id: 'LIA-100', name: 'Accounts Payable', type: 'Liabilities', parentId: 'LIA' },
  { id: 'EQU', name: 'Equity', type: 'Equity' },
  { id: 'EQU-100', name: 'Owner\'s Capital', type: 'Equity', parentId: 'EQU' },
  { id: 'INC', name: 'Income', type: 'Income' },
  { id: 'INC-100', name: 'Sales', type: 'Income', parentId: 'INC' },
  { id: 'COS', name: 'Costs', type: 'Costs' },
  { id: 'COS-100', name: 'Cost of Goods Sold', type: 'Costs', parentId: 'COS' },
  { id: 'EXP', name: 'Expenses', type: 'Expenses' },
  { id: 'EXP-100', name: 'Operating Expenses', type: 'Expenses', parentId: 'EXP' },
];

const ACCOUNT_TYPES = ['Assets', 'Liabilities', 'Equity', 'Income', 'Costs', 'Expenses'];

export function ChartOfAccountsModal() {
  const { currentClient, currentClientId, saveClient } = useAccounting();
  const [isAdding, setIsAdding] = useState(false);
  const [addingParentId, setAddingParentId] = useState<string | undefined>(undefined);
  
  const [idPrefix, setIdPrefix] = useState('');
  const [idSuffix, setIdSuffix] = useState('');
  const [suffixPlaceholder, setSuffixPlaceholder] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Assets');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showPresets, setShowPresets] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(event.target as Node)) {
        setShowPresets(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [presetsRef]);

  if (!currentClient || !currentClientId) return null;

  let accounts = currentClient.accounts || [];
  if (accounts.length === 0) {
    accounts = currentClient.coaFormat === 'alphanumeric' ? [...DEFAULT_ACCOUNTS_ALPHA] : [...DEFAULT_ACCOUNTS];
  }

  const handleSaveAccounts = (updatedAccounts: CoaAccount[], coaFormat?: 'numeric' | 'alphanumeric') => {
    saveClient(currentClientId, { 
      ...currentClient, 
      accounts: updatedAccounts,
      coaFormat: coaFormat || currentClient.coaFormat
    });
  };

  const applyPreset = (format: 'numeric' | 'alphanumeric') => {
    if (accounts.length > 0) {
      if (!confirm(`Are you sure you want to replace all your accounts with the ${format} preset? This will delete all custom accounts.`)) {
        return;
      }
    }
    const newDefaults = format === 'alphanumeric' ? DEFAULT_ACCOUNTS_ALPHA : DEFAULT_ACCOUNTS;
    handleSaveAccounts([...newDefaults], format);
    setShowPresets(false);
  };

  const handleAddAccount = () => {
    const computedId = idPrefix + idSuffix.padEnd(suffixPlaceholder.length, '0');
    if (!computedId || !newName || !newType) {
      alert("Please fill out Account Code and Name.");
      return;
    }
    if (accounts.some(a => a.id === computedId)) {
      alert("Account Code already exists!");
      return;
    }
    
    let finalType = newType;
    if (addingParentId) {
      const parent = accounts.find(a => a.id === addingParentId);
      if (parent) finalType = parent.type;
    }

    const updatedAccounts = [...accounts, { id: computedId, name: newName, type: finalType, parentId: addingParentId }];
    handleSaveAccounts(updatedAccounts);
    setIsAdding(false);
    setIdPrefix('');
    setIdSuffix('');
    setSuffixPlaceholder('');
    setNewName('');
    setAddingParentId(undefined);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this account? This will also delete any sub-accounts.")) {
      const idsToDelete = new Set([id]);
      let added = true;
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

  const updateDescendants = (accountsList: CoaAccount[], oldId: string, newId: string): CoaAccount[] => {
    let currentList = [...accountsList];
    const oldPrefix = oldId.replace(/0+$/, '');
    const newPrefix = newId.replace(/0+$/, '');
    const lengthDiff = newId.length - oldId.length;

    const children = currentList.filter(a => a.parentId === oldId);
    for (const child of children) {
      let childNewId = child.id;
      if (childNewId.startsWith(oldPrefix)) {
        childNewId = newPrefix + childNewId.slice(oldPrefix.length);
      }
      if (lengthDiff > 0) {
        childNewId = childNewId + '0'.repeat(lengthDiff);
      } else if (lengthDiff < 0) {
        const toRemove = Math.abs(lengthDiff);
        if (childNewId.endsWith('0'.repeat(toRemove))) {
           childNewId = childNewId.slice(0, childNewId.length - toRemove);
        }
      }
      
      const index = currentList.findIndex(a => a.id === child.id);
      currentList[index] = { ...currentList[index], id: childNewId, parentId: newId };
      
      currentList = updateDescendants(currentList, child.id, childNewId);
    }
    return currentList;
  };

  const handleSaveEdit = (oldId: string) => {
    if (!editCode || !editName) {
      alert("Please fill out Account Code and Name.");
      return;
    }
    if (editCode !== oldId && accounts.some(a => a.id === editCode)) {
      alert("Account Code already exists!");
      return;
    }

    let updatedAccounts = [...accounts];
    const index = updatedAccounts.findIndex(a => a.id === oldId);
    if (index !== -1) {
      const isRoot = !updatedAccounts[index].parentId;
      updatedAccounts[index] = { ...updatedAccounts[index], id: editCode, name: editName };
      if (editCode !== oldId) {
        updatedAccounts = updateDescendants(updatedAccounts, oldId, editCode);
        
        if (isRoot && (!currentClient.coaFormat || currentClient.coaFormat === 'numeric')) {
          const lengthDiff = editCode.length - oldId.length;
          if (lengthDiff !== 0) {
            const otherRoots = updatedAccounts.filter(a => !a.parentId && a.id !== editCode);
            for (const root of otherRoots) {
              let newRootId = root.id;
              if (lengthDiff > 0) {
                newRootId = root.id + '0'.repeat(lengthDiff);
              } else if (lengthDiff < 0) {
                const toRemove = Math.abs(lengthDiff);
                if (newRootId.endsWith('0'.repeat(toRemove))) {
                  newRootId = newRootId.slice(0, newRootId.length - toRemove);
                }
              }
              if (newRootId !== root.id) {
                const rootIndex = updatedAccounts.findIndex(a => a.id === root.id);
                if (rootIndex !== -1) {
                  updatedAccounts[rootIndex] = { ...updatedAccounts[rootIndex], id: newRootId };
                }
                updatedAccounts = updateDescendants(updatedAccounts, root.id, newRootId);
              }
            }
          }
        }
      }
      handleSaveAccounts(updatedAccounts);
    }
    setEditingId(null);
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderAccounts = (parentId?: string, depth = 0) => {
    const levelAccounts = accounts.filter(a => a.parentId === parentId).sort((a, b) => a.id.localeCompare(b.id));

    return levelAccounts.map(account => {
      const hasChildren = accounts.some(a => a.parentId === account.id);
      const isExpanded = expanded[account.id] !== false;

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
              {editingId === account.id ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={editCode} 
                    onChange={e => setEditCode(currentClient.coaFormat === 'numeric' ? e.target.value.replace(/\D/g, '') : e.target.value)} 
                    className="form-input py-0.5 px-2 text-sm w-28"
                  />
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className="form-input py-0.5 px-2 text-sm max-w-[200px]"
                  />
                </div>
              ) : (
                <>
                  <span className="text-slate-600 dark:text-slate-400 font-mono text-sm">{account.id}</span>
                  <span className="text-slate-800 dark:text-slate-200">{account.name}</span>
                  {depth === 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                      {account.type}
                    </span>
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId === account.id ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleSaveEdit(account.id)}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingId(account.id);
                      setEditCode(account.id);
                      setEditName(account.name);
                    }}
                    className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                    title="Edit Account"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setAddingParentId(account.id);
                      setNewType(account.type);
                      
                      let prefix = account.id;
                      let placeholder = "";
                      
                      const match = account.id.match(/^(.+?)(0+)$/);
                      if (match) {
                        prefix = match[1];
                        placeholder = match[2];
                      } else {
                        prefix = account.id + (account.id.includes('-') ? '' : '-');
                        placeholder = "100";
                      }
                      
                      setIdPrefix(prefix);
                      setIdSuffix('');
                      setSuffixPlaceholder(placeholder);
                      setIsAdding(true);
                    }}
                    className="text-xs px-2 py-1 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-lg flex items-center gap-1 transition-colors"
                    title="Add Sub-account"
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
                </>
              )}
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
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-2">Manage your ledger accounts, sub-accounts, and formats.</p>
            <div className="relative" ref={presetsRef}>
              <button 
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCcw className="w-3 h-3" /> Reset / Choose Format
              </button>
              {showPresets && (
                <div className="absolute top-full mt-2 left-0 w-48 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden z-20">
                  <button 
                    onClick={() => applyPreset('numeric')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Numeric Code Format
                  </button>
                  <button 
                    onClick={() => applyPreset('alphanumeric')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Alphanumeric Format
                  </button>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => {
              setAddingParentId(undefined);
              setNewType('Assets');
              setIdPrefix('');
              setIdSuffix('');
              setSuffixPlaceholder('');
              setIsAdding(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>

        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">
                {addingParentId ? "Add Sub-account" : "Add Main Account"}
              </h3>
              
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Account Code</label>
                  <div className="flex">
                    {idPrefix && (
                      <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 border-r-0 rounded-l-lg text-slate-500 font-mono flex items-center shrink-0">
                        {idPrefix}
                      </div>
                    )}
                    <input 
                      type="text" 
                      value={idSuffix} 
                      onChange={e => {
                        let val = currentClient.coaFormat === 'numeric' ? e.target.value.replace(/\D/g, '') : e.target.value.replace(/[^0-9A-Za-z_-]/g, '');
                        if (suffixPlaceholder) val = val.slice(0, suffixPlaceholder.length);
                        setIdSuffix(val);
                      }} 
                      className={cn("w-full form-input", idPrefix ? "rounded-l-none" : "")}
                      placeholder={suffixPlaceholder || "e.g. 1010 or A-101"}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Account Name</label>
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
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Type</label>
                    <select 
                      value={newType} 
                      onChange={e => setNewType(e.target.value)} 
                      className="w-full form-input"
                    >
                      {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                {addingParentId && (
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">Parent Account Code</label>
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-mono text-sm">
                      {addingParentId}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddAccount}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="flex text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex-1" style={{ paddingLeft: '2.5rem' }}>Account Name</div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {accounts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No accounts defined. Use the preset selection above or add an account.
              </div>
            ) : renderAccounts()}
          </div>
        </div>
      </div>
    </Modal>
  );
}
