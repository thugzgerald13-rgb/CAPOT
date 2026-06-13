import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Plus, Trash2, RefreshCcw, Edit2, ClipboardList, Check, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { CoaAccount } from '../../types';
import { cn } from '../../lib/utils';

export const DEFAULT_ACCOUNTS: CoaAccount[] = [
  { id: '1000', name: 'Cash on Hand', type: 'Asset', normalSide: 'debit' },
  { id: '1100', name: 'Accounts Receivable', type: 'Asset', normalSide: 'debit' },
  { id: '1200', name: 'Creditable Withholding Tax', type: 'Asset', normalSide: 'debit' },
  { id: '1300', name: 'Inventory', type: 'Asset', normalSide: 'debit' },
  { id: '2000', name: 'Accounts Payable', type: 'Liability', normalSide: 'credit' },
  { id: '2100', name: 'VAT Output Payable', type: 'Liability', normalSide: 'credit' },
  { id: '2200', name: 'VAT Input Receivable', type: 'Asset', normalSide: 'debit' },
  { id: '2300', name: 'Withholding Tax Payable', type: 'Liability', normalSide: 'credit' },
  { id: '3000', name: 'Capital Stock', type: 'Equity', normalSide: 'credit' },
  { id: '3100', name: 'Retained Earnings', type: 'Equity', normalSide: 'credit' },
  { id: '4000', name: 'Sales Revenue', type: 'Revenue', normalSide: 'credit' },
  { id: '5000', name: 'Cost of Goods Sold', type: 'Expense', normalSide: 'debit' },
  { id: '5100', name: 'Operating Expenses', type: 'Expense', normalSide: 'debit' },
];

export const DEFAULT_ACCOUNTS_ALPHA: CoaAccount[] = [
  { id: 'COH-1000', name: 'Cash on Hand', type: 'Asset', normalSide: 'debit' },
  { id: 'ACR-1100', name: 'Accounts Receivable', type: 'Asset', normalSide: 'debit' },
  { id: 'CWT-1200', name: 'Creditable Withholding Tax', type: 'Asset', normalSide: 'debit' },
  { id: 'INV-1300', name: 'Inventory', type: 'Asset', normalSide: 'debit' },
  { id: 'ACP-2000', name: 'Accounts Payable', type: 'Liability', normalSide: 'credit' },
  { id: 'VOP-2100', name: 'VAT Output Payable', type: 'Liability', normalSide: 'credit' },
  { id: 'VIR-2200', name: 'VAT Input Receivable', type: 'Asset', normalSide: 'debit' },
  { id: 'WTP-2300', name: 'Withholding Tax Payable', type: 'Liability', normalSide: 'credit' },
  { id: 'CAP-3000', name: 'Capital Stock', type: 'Equity', normalSide: 'credit' },
  { id: 'RET-3100', name: 'Retained Earnings', type: 'Equity', normalSide: 'credit' },
  { id: 'REV-4000', name: 'Sales Revenue', type: 'Revenue', normalSide: 'credit' },
  { id: 'CGS-5000', name: 'Cost of Goods Sold', type: 'Expense', normalSide: 'debit' },
  { id: 'OPE-5100', name: 'Operating Expenses', type: 'Expense', normalSide: 'debit' },
];

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

export function getNormalSide(type: string): 'debit' | 'credit' {
  const t = type.toLowerCase();
  if (t === 'asset' || t === 'assets' || t === 'expense' || t === 'expenses' || t === 'costs' || t === 'cost') {
    return 'debit';
  }
  return 'credit';
}

export function resequenceAccounts(
  accountsList: CoaAccount[],
  coaFormat: 'numeric' | 'alphanumeric'
): CoaAccount[] {
  return [...accountsList].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export function ChartOfAccountsModal() {
  const { currentClient, currentClientId, saveClient } = useAccounting();
  const [isAdding, setIsAdding] = useState(false);
  const [typeFilter, setTypeFilter] = useState('All');
  
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Asset');
  const [newNormalSide, setNewNormalSide] = useState<'debit' | 'credit'>('debit');

  const [showPresets, setShowPresets] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('Asset');
  const [editNormalSide, setEditNormalSide] = useState<'debit' | 'credit'>('debit');

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

  // Adjust normal side automatically when type changes in adding form
  useEffect(() => {
    setNewNormalSide(getNormalSide(newType));
  }, [newType]);

  // Adjust normal side automatically when type changes in editing form
  useEffect(() => {
    setEditNormalSide(getNormalSide(editType));
  }, [editType]);

  if (!currentClient || !currentClientId) return null;

  let accounts = currentClient.accounts || [];
  if (accounts.length === 0) {
    accounts = currentClient.coaFormat === 'alphanumeric' ? [...DEFAULT_ACCOUNTS_ALPHA] : [...DEFAULT_ACCOUNTS];
  }

  const filteredAccounts = typeFilter === 'All'
    ? accounts
    : accounts.filter(a => a.type.toLowerCase() === typeFilter.toLowerCase());

  const handleSaveAccounts = (updatedAccounts: CoaAccount[], coaFormat?: 'numeric' | 'alphanumeric') => {
    const format = coaFormat || currentClient.coaFormat || 'numeric';
    const resequenced = resequenceAccounts(updatedAccounts, format);
    saveClient(currentClientId, { 
      ...currentClient, 
      accounts: resequenced,
      coaFormat: format
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
    if (!newCode || !newName || !newType) {
      alert("Please fill out Account Code and Name.");
      return;
    }
    if (accounts.some(a => a.id === newCode)) {
      alert("An account with this code already exists!");
      return;
    }
    
    const updatedAccounts = [...accounts, { 
      id: newCode, 
      name: newName, 
      type: newType, 
      normalSide: newNormalSide 
    }];
    handleSaveAccounts(updatedAccounts);
    setIsAdding(false);
    setNewCode('');
    setNewName('');
    setNewType('Asset');
    setNewNormalSide('debit');
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this account?")) {
      const updatedAccounts = accounts.filter(a => a.id !== id);
      handleSaveAccounts(updatedAccounts);
    }
  };

  const handleSaveEdit = (oldId: string) => {
    if (!editCode || !editName) {
      alert("Please fill out Account Code and Name.");
      return;
    }
    
    if (editCode !== oldId && accounts.some(a => a.id === editCode)) {
      alert("An account with this code already exists!");
      return;
    }

    const updatedAccounts = accounts.map(a => {
      if (a.id === oldId) {
        return {
          ...a,
          id: editCode,
          name: editName,
          type: editType,
          normalSide: editNormalSide
        };
      }
      return a;
    });

    handleSaveAccounts(updatedAccounts);
    setEditingId(null);
  };

  // Dynamically calculate actual real-time balances from active journals / ledger
  const getAccountBalance = (account: CoaAccount) => {
    let balance = 0;

    // 1. Check General Ledger entries if they match this account name or id (case-insensitive)
    if (currentClient.glAccounts) {
      const glMatch = currentClient.glAccounts.find(g => 
        g.accountTitle.trim().toLowerCase() === account.name.trim().toLowerCase() ||
        g.accountTitle.trim().toLowerCase().includes(account.id.trim().toLowerCase())
      );
      if (glMatch && glMatch.entries) {
        glMatch.entries.forEach(e => {
          const d = parseFloat(e.debit.replace(/,/g, ''));
          const c = parseFloat(e.credit.replace(/,/g, ''));
          const drVal = isNaN(d) ? 0 : d;
          const crVal = isNaN(c) ? 0 : c;
          if (account.normalSide === 'debit') {
            balance += (drVal - crVal);
          } else {
            balance += (crVal - drVal);
          }
        });
        if (balance !== 0) return balance;
      }
    }

    // 2. Fallbacks: Check Purchases matching account name for Accounts Payable
    if (currentClient.purchases && (account.name.toLowerCase() === 'accounts payable' || account.id === '2000')) {
      const totalPurchases = currentClient.purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
      return totalPurchases;
    }
    if (currentClient.purchases) {
      const expenseMatchTotal = currentClient.purchases
        .filter(p => p.accountTitle.trim().toLowerCase() === account.name.trim().toLowerCase())
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      if (expenseMatchTotal > 0) return expenseMatchTotal;
    }

    // 3. Check Sales matching account name for Sales Revenue
    if (currentClient.sales && (account.name.toLowerCase() === 'sales revenue' || account.id === '4000')) {
      const totalSales = currentClient.sales.reduce((sum, s) => sum + (s.amount || 0), 0);
      return totalSales;
    }

    return 0;
  };

  return (
    <Modal id="coa" title="Chart of Accounts" icon={<BookOpen />} maxWidth="max-w-4xl">
      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/20 max-h-[85vh] overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Manage your ledger accounts, normal sides, and current balances.
            </p>
            <div className="relative mt-2" ref={presetsRef}>
              <button 
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCcw className="w-3 h-3" /> Reset / Choose Format
              </button>
              {showPresets && (
                <div className="absolute top-full mt-2 left-0 w-48 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden z-20">
                  <button 
                    onClick={() => applyPreset('numeric')}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Numeric Code Format
                  </button>
                  <button 
                    onClick={() => applyPreset('alphanumeric')}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Alphanumeric Format
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end self-stretch sm:self-auto" />
        </div>

        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Add New Account
                </h3>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Account Code</label>
                  <input 
                    type="text" 
                    value={newCode} 
                    onChange={e => setNewCode(e.target.value.replace(/[^0-9A-Za-z_-]/g, ''))} 
                    className="w-full form-input font-mono"
                    placeholder="e.g. 1000 or COH-1000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Account Name</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    className="w-full form-input"
                    placeholder="e.g. Cash in Bank"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Type</label>
                  <select 
                    value={newType} 
                    onChange={e => setNewType(e.target.value)} 
                    className="w-full form-input"
                  >
                    {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Normal Side</label>
                  <select 
                    value={newNormalSide} 
                    onChange={e => setNewNormalSide(e.target.value as 'debit' | 'credit')} 
                    className="w-full form-input capitalize"
                  >
                    <option value="debit">debit</option>
                    <option value="credit">credit</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddAccount}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Save Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chart of Accounts card layout matching image exactly */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <ClipboardList className="text-slate-500 dark:text-slate-400 w-5 h-5" />
              <h2 className="text-base font-bold text-slate-850 dark:text-slate-100">
                Chart of Accounts
              </h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Account Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter:</span>
                <select
                  id="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="text-xs font-semibold py-1.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-755 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="All">All Account Types</option>
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t} value={t}>{t}s</option>
                  ))}
                </select>
              </div>

              <button 
                id="add-account-btn"
                onClick={() => setIsAdding(true)}
                className="bg-[#0a4a94] hover:bg-[#07366b] text-white font-bold text-[11px] px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 uppercase tracking-wide shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Add Account
              </button>
            </div>
          </div>

          {/* Table representing exact layout in screenshot */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-250 dark:border-slate-850 text-[10.5px] font-bold text-slate-500 uppercase tracking-widest">
                  <th className="px-5 py-3 w-[120px]">Code</th>
                  <th className="px-5 py-3">Account Title</th>
                  <th className="px-5 py-3 w-[150px]">Account Type</th>
                  <th className="px-5 py-3 w-[150px]">Normal Entry</th>
                  <th className="px-5 py-3 text-right w-[180px]">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500 text-sm">
                      No accounts found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map(account => {
                    const isEditing = editingId === account.id;
                    const balanceValue = getAccountBalance(account);

                    if (isEditing) {
                      return (
                        <tr key={account.id} className="bg-blue-50/50 dark:bg-slate-800/30">
                          <td className="px-5 py-3">
                            <input 
                              type="text" 
                              value={editCode} 
                              onChange={e => setEditCode(e.target.value.replace(/[^0-9A-Za-z_-]/g, ''))} 
                              className="w-full form-input py-1 px-2 text-xs font-mono"
                            />
                          </td>
                          <td className="px-5 py-3">
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={e => setEditName(e.target.value)} 
                              className="w-full form-input py-1 px-2 text-xs"
                            />
                          </td>
                          <td className="px-5 py-3">
                            <select 
                              value={editType} 
                              onChange={e => setEditType(e.target.value)} 
                              className="w-full form-input py-1 px-1 text-xs"
                            >
                              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td className="px-5 py-3">
                            <select 
                              value={editNormalSide} 
                              onChange={e => setEditNormalSide(e.target.value as 'debit' | 'credit')} 
                              className="w-full form-input py-1 px-1 text-xs capitalize"
                            >
                              <option value="debit">debit</option>
                              <option value="credit">credit</option>
                            </select>
                          </td>
                          <td className="px-5 py-3 text-right flex items-center justify-end gap-1.5 pt-4">
                            <button 
                              onClick={() => handleSaveEdit(account.id)}
                              className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr 
                        key={account.id} 
                        className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400 text-sm font-medium">
                          {account.id}
                        </td>
                        <td className="px-5 py-3.5 font-sans font-medium text-slate-850 dark:text-slate-200 text-sm">
                          {account.name}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-sm">
                          {account.type}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-sm capitalize">
                          {account.normalSide || getNormalSide(account.type)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-800 dark:text-slate-100 text-sm font-semibold">
                          <div className="flex items-center justify-end gap-2.5">
                            <span>
                              ₱ {balanceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingId(account.id);
                                  setEditCode(account.id);
                                  setEditName(account.name);
                                  setEditType(account.type);
                                  setEditNormalSide(account.normalSide || getNormalSide(account.type));
                                }}
                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded text-blue-500 transition-colors"
                                title="Edit Account"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(account.id)}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-red-500 transition-colors"
                                title="Delete Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
