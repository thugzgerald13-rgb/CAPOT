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

export function resequenceAccounts(
  accountsList: CoaAccount[],
  coaFormat: 'numeric' | 'alphanumeric'
): CoaAccount[] {
  const isAlpha = coaFormat === 'alphanumeric';

  if (isAlpha) {
    const result: CoaAccount[] = [];

    const processChildrenAlphaRecursive = (oldParentId: string, newParentId: string) => {
      const children = accountsList
        .filter(a => a.parentId === oldParentId)
        .sort((a, b) => {
          const cmp = a.id.localeCompare(b.id);
          if (cmp !== 0) return cmp;
          const defaults = DEFAULT_ACCOUNTS_ALPHA;
          const idxA = defaults.findIndex(d => d.name.toLowerCase() === a.name.toLowerCase());
          const idxB = defaults.findIndex(d => d.name.toLowerCase() === b.name.toLowerCase());
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return a.name.localeCompare(b.name);
        });

      children.forEach((child, idx) => {
        const prefix = newParentId + (newParentId.endsWith('-') ? '' : '-');
        const newId = `${prefix}${(idx + 1) * 100}`;
        
        result.push({
          ...child,
          id: newId,
          parentId: newParentId
        });

        processChildrenAlphaRecursive(child.id, newId);
      });
    };

    const rootAccounts = accountsList
      .filter(a => !a.parentId)
      .sort((a, b) => {
        const idxA = ACCOUNT_TYPES.indexOf(a.type);
        const idxB = ACCOUNT_TYPES.indexOf(b.type);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.id.localeCompare(b.id);
      });

    rootAccounts.forEach(root => {
      result.push(root);
      processChildrenAlphaRecursive(root.id, root.id);
    });

    const processedIds = new Set(result.map(r => r.id));
    accountsList.forEach(acc => {
      if (!processedIds.has(acc.id)) {
        result.push(acc);
      }
    });

    return result;
  } else {
    // Numeric
    const existingNumericRoot = accountsList.find(a => !a.parentId);
    const rootLength = existingNumericRoot ? existingNumericRoot.id.length : 5;

    const result: CoaAccount[] = [];

    const rootAccounts = accountsList
      .filter(a => !a.parentId)
      .sort((a, b) => {
        const idxA = ACCOUNT_TYPES.indexOf(a.type);
        const idxB = ACCOUNT_TYPES.indexOf(b.type);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.id.localeCompare(b.id);
      });

    const processChildrenNumericRecursive = (oldParentId: string, newParentId: string) => {
      const children = accountsList
        .filter(a => a.parentId === oldParentId)
        .sort((a, b) => {
          const cmp = a.id.localeCompare(b.id);
          if (cmp !== 0) return cmp;
          const defaults = DEFAULT_ACCOUNTS;
          const idxA = defaults.findIndex(d => d.name.toLowerCase() === a.name.toLowerCase());
          const idxB = defaults.findIndex(d => d.name.toLowerCase() === b.name.toLowerCase());
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return a.name.localeCompare(b.name);
        });

      if (children.length === 0) return;

      const match = newParentId.match(/^(.*?)(0+)$/);
      let prefix = newParentId;
      let zeroCount = 0;
      if (match) {
        prefix = match[1];
        zeroCount = match[2].length;
      }

      let step = 1;
      if (zeroCount > 1) {
        step = Math.pow(10, zeroCount - 1);
      }

      children.forEach((child, idx) => {
        let childNewId = '';
        if (zeroCount > 0) {
          const suffixNum = (idx + 1) * step;
          const suffixStr = String(suffixNum).padStart(zeroCount, '0');
          childNewId = prefix + suffixStr;
        } else {
          childNewId = newParentId + String(idx + 1);
        }

        if (childNewId.length > rootLength) {
          childNewId = childNewId.slice(0, rootLength);
        } else if (childNewId.length < rootLength) {
          childNewId = childNewId.padEnd(rootLength, '0');
        }

        result.push({
          ...child,
          id: childNewId,
          parentId: newParentId
        });

        processChildrenNumericRecursive(child.id, childNewId);
      });
    };

    rootAccounts.forEach((root, idx) => {
      const rootIdVal = String(idx + 1).padEnd(rootLength, '0');
      const newRoot = {
        ...root,
        id: rootIdVal
      };
      result.push(newRoot);
      processChildrenNumericRecursive(root.id, rootIdVal);
    });

    const processedIds = new Set(result.map(r => r.id));
    accountsList.forEach(acc => {
      if (!processedIds.has(acc.id)) {
        result.push(acc);
      }
    });

    return result;
  }
}

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
    const computedId = idPrefix + idSuffix.padEnd(suffixPlaceholder.length, '0');
    if (!computedId || !newName || !newType) {
      alert("Please fill out Account Code and Name.");
      return;
    }
    if (accounts.some(a => a.id === computedId && a.parentId === addingParentId && a.name.toLowerCase() === newName.toLowerCase())) {
      alert("This exact sub-account already exists!");
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

    const children = currentList.filter(a => a.parentId === oldId);
    for (const child of children) {
      let childNewId = child.id;
      if (childNewId.startsWith(oldPrefix)) {
        childNewId = newPrefix + childNewId.slice(oldPrefix.length);
        const targetLength = child.id.length; // target length is same as child.id because length diffs were already globally applied
        
        if (childNewId.length > targetLength) {
          childNewId = childNewId.slice(0, targetLength);
        } else if (childNewId.length < targetLength) {
          childNewId = childNewId.padEnd(targetLength, '0');
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
    
    const editedAccount = accounts.find(a => a.id === oldId);
    const isMainAccount = editedAccount && !editedAccount.parentId;
    const isNumeric = (!currentClient.coaFormat || currentClient.coaFormat === 'numeric');

    let finalEditCode = editCode;
    const existingRoot = accounts.find(a => !a.parentId);
    const uniformLength = existingRoot ? existingRoot.id.length : 5;

    if (isNumeric) {
      finalEditCode = finalEditCode.replace(/\D/g, '');
      if (/\D/.test(finalEditCode) || finalEditCode.length === 0) {
        alert("Account Code must contain only numbers.");
        return;
      }
      
      if (!isMainAccount) {
        // Sub-accounts must match the current uniform length of root accounts
        if (finalEditCode.length > uniformLength) {
          finalEditCode = finalEditCode.slice(0, uniformLength);
        } else if (finalEditCode.length < uniformLength) {
          finalEditCode = finalEditCode.padEnd(uniformLength, '0');
        }
      }
    }

    const lengthDiff = (isNumeric && isMainAccount) ? finalEditCode.length - oldId.length : 0;
    
    // Direct collision check using finalEditCode
    if (finalEditCode !== oldId && lengthDiff === 0 && accounts.some(a => a.id === finalEditCode && a.name.toLowerCase() === editName.toLowerCase())) {
       alert("An account with this code and name already exists!");
       return;
    }

    let updatedAccounts = [...accounts];

    // 1. If length changed in a numeric chart on editing a main account, apply that length diff universally to ALL accounts.
    if (lengthDiff !== 0) {
      updatedAccounts = updatedAccounts.map(account => {
        let newId = account.id;
        let newParentId = account.parentId;
        
        if (lengthDiff > 0) {
          const pad = '0'.repeat(lengthDiff);
          newId += pad;
          if (newParentId) newParentId += pad;
        } else {
          const toRemove = Math.abs(lengthDiff);
          newId = newId.slice(0, newId.length - toRemove);
          if (newParentId) {
            newParentId = newParentId.slice(0, newParentId.length - toRemove);
          }
        }
        return { ...account, id: newId, parentId: newParentId };
      });
    }

    // Determine what oldId is known as NOW (after the global padding applies)
    let adjustedOldId = oldId;
    if (isNumeric && isMainAccount) {
      if (lengthDiff > 0) {
        adjustedOldId += '0'.repeat(lengthDiff);
      } else if (lengthDiff < 0) {
        const toRemove = Math.abs(lengthDiff);
        adjustedOldId = adjustedOldId.slice(0, adjustedOldId.length - toRemove);
      }
    }
    
    // 2. Perform the specific user edit
    const index = updatedAccounts.findIndex(a => a.id === adjustedOldId);
    if (index !== -1) {
      updatedAccounts[index] = { ...updatedAccounts[index], id: finalEditCode, name: editName };
      
      if (finalEditCode !== adjustedOldId) {
        // Since adjustedOldId and finalEditCode now have the same length,
        // updateDescendants will ONLY do prefix replacement.
        updatedAccounts = updateDescendants(updatedAccounts, adjustedOldId, finalEditCode);
      }
      handleSaveAccounts(updatedAccounts);
    }
    setEditingId(null);
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const missingTypes = ACCOUNT_TYPES.filter(t => !accounts.some(a => a.type === t && !a.parentId));

  const handleRestoreMainAccount = (type: string) => {
    const isAlpha = currentClient.coaFormat === 'alphanumeric';
    const defaults = isAlpha ? DEFAULT_ACCOUNTS_ALPHA : DEFAULT_ACCOUNTS;
    
    // In numeric mode, if there are existing root accounts, we might need to adjust the ID length
    const existingRoot = accounts.find(a => !a.parentId);
    const rootLength = existingRoot ? existingRoot.id.length : 4;
    
    const parentToRestore = defaults.find(a => a.type === type && !a.parentId);
    if (!parentToRestore) return;

    let restoredId = parentToRestore.id;
    if (!isAlpha && restoredId.length !== rootLength) {
      if (restoredId.length < rootLength) {
        restoredId = restoredId + '0'.repeat(rootLength - restoredId.length);
      } else {
        const toRemove = restoredId.length - rootLength;
        if (restoredId.endsWith('0'.repeat(toRemove))) {
          restoredId = restoredId.slice(0, restoredId.length - toRemove);
        }
      }
    }

    if (accounts.some(a => a.id === restoredId)) {
      alert(`An account with the ID ${restoredId} already exists. Cannot restore automatically.`);
      return;
    }

    const parentNode = { ...parentToRestore, id: restoredId };

    const childrenToRestore = defaults.filter(a => a.parentId === parentToRestore.id).map(child => {
      let childNewId = child.id;
      if (!isAlpha) {
         const oldPrefix = parentToRestore.id.replace(/0+$/, '');
         const newPrefix = restoredId.replace(/0+$/, '');
         if (childNewId.startsWith(oldPrefix)) {
           childNewId = newPrefix + childNewId.slice(oldPrefix.length);
         }
         const lengthDiff = restoredId.length - parentToRestore.id.length;
         if (lengthDiff > 0) {
           childNewId = childNewId + '0'.repeat(lengthDiff);
         } else if (lengthDiff < 0) {
           const toRemove = Math.abs(lengthDiff);
           if (childNewId.endsWith('0'.repeat(toRemove))) {
              childNewId = childNewId.slice(0, childNewId.length - toRemove);
           }
         }
      }
      return { ...child, id: childNewId, parentId: restoredId };
    });

    const safeChildren = childrenToRestore.filter(c => !accounts.some(a => a.id === c.id));
    
    const updatedAccounts = [...accounts, parentNode, ...safeChildren];
    handleSaveAccounts(updatedAccounts);
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
                (() => {
                  const isMain = !account.parentId;
                  const existingNumericRoot = accounts.find(a => !a.parentId);
                  const uniformLength = existingNumericRoot ? existingNumericRoot.id.length : 5;
                  return (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={editCode} 
                        onChange={e => {
                          let val = e.target.value;
                          if (currentClient.coaFormat === 'numeric') {
                            val = val.replace(/\D/g, '');
                            if (!isMain && val.length > uniformLength) {
                              val = val.slice(0, uniformLength);
                            }
                          }
                          setEditCode(val);
                        }}
                        maxLength={(!isMain && currentClient.coaFormat === 'numeric') ? uniformLength : undefined}
                        onKeyDown={e => {
                          if (currentClient.coaFormat === 'numeric' && !/[\d]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                            e.preventDefault();
                          }
                        }}
                        className="form-input py-0.5 px-2 text-sm w-28 font-mono"
                        placeholder="Code"
                      />
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        className="form-input py-0.5 px-2 text-sm max-w-[200px]"
                      />
                    </div>
                  );
                })()
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
                      let suggestedSuffix = "";
                      
                      const children = accounts.filter(a => a.parentId === account.id);

                      const match = account.id.match(/^(.+?)(0+)$/);
                      if (match && currentClient.coaFormat !== 'alphanumeric') {
                        prefix = match[1];
                        placeholder = match[2];
                        const zeroCount = placeholder.length;
                        
                        const childNums = children
                          .map(c => c.id.substring(prefix.length))
                          .filter(s => s.length === zeroCount)
                          .map(s => parseInt(s, 10))
                          .filter(n => !isNaN(n));
                          
                        let step = Math.pow(10, Math.max(0, zeroCount - 1));
                        if (step < 1) step = 1;
                        let nextNum = step;
                        // Start checking from the step, find first gap
                        while (childNums.includes(nextNum)) {
                          nextNum += step;
                        }
                        if (nextNum < Math.pow(10, zeroCount)) {
                          suggestedSuffix = nextNum.toString().padStart(zeroCount, '0');
                        }
                      } else {
                        prefix = account.id + (account.id.includes('-') ? '' : '-');
                        placeholder = "100";
                        
                        const childNums = children
                          .map(c => c.id.substring(prefix.length))
                          .map(s => parseInt(s, 10))
                          .filter(n => !isNaN(n));
                          
                        let step = 100;
                        if (childNums.length > 0 && Math.min(...childNums) < 100) step = 10;
                        
                        let nextNum = step;
                        while (childNums.includes(nextNum)) {
                          nextNum += step;
                        }
                        suggestedSuffix = nextNum.toString();
                      }
                      
                      setIdPrefix(prefix);
                      setIdSuffix(suggestedSuffix);
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
                      onKeyDown={e => {
                        if (currentClient.coaFormat === 'numeric' && !/[\d]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                          e.preventDefault();
                        }
                      }}
                      className={cn("w-full form-input font-mono", idPrefix ? "rounded-l-none" : "")}
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

        {missingTypes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Restore Missing Main Accounts</p>
            <div className="flex flex-wrap gap-2">
              {missingTypes.map(type => (
                <button
                  key={type}
                  onClick={() => handleRestoreMainAccount(type)}
                  className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3 h-3" /> {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
