import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Plus, Trash2, ChevronRight, ChevronDown, RefreshCcw, Edit2, Filter, ExternalLink, Pin, RotateCw, Minus, X, FileText, Search, CreditCard, Scale, Check } from 'lucide-react';
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

export function getParentPrefix(parentId: string): string {
  const match = parentId.match(/^(.+?)(0+)$/);
  return match ? match[1] : parentId;
}

export function resequenceAccounts(
  accountsList: CoaAccount[],
  coaFormat: 'numeric' | 'alphanumeric'
): CoaAccount[] {
  const isAlpha = coaFormat === 'alphanumeric';

  if (isAlpha) {
    const result: CoaAccount[] = [];
    const visited = new Set<string>();

    const processChildrenAlphaRecursive = (oldParentId: string, newParentId: string) => {
      if (visited.has(oldParentId)) return;
      visited.add(oldParentId);

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

      children.forEach((child) => {
        result.push(child);

        processChildrenAlphaRecursive(child.id, child.id);
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
    const result: CoaAccount[] = [];
    const visited = new Set<string>();

    const rootAccounts = accountsList
      .filter(a => !a.parentId)
      .sort((a, b) => {
        const idxA = ACCOUNT_TYPES.indexOf(a.type);
        const idxB = ACCOUNT_TYPES.indexOf(b.type);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.id.localeCompare(b.id);
      });

    const processChildrenNumericRecursive = (oldParentId: string, newParentId: string) => {
      if (visited.has(oldParentId)) return;
      visited.add(oldParentId);

      const children = accountsList
        .filter(a => a.parentId === oldParentId)
        .sort((a, b) => a.id.localeCompare(b.id));

      children.forEach((child) => {
        const childNewId = child.id;
        
        result.push({
          ...child,
          id: childNewId,
          parentId: newParentId
        });

        processChildrenNumericRecursive(child.id, childNewId);
      });
    };

    rootAccounts.forEach((root) => {
      const rootIdVal = root.id;

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
        result.push({ ...acc });
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
  const [typeFilter, setTypeFilter] = useState<string>('All');

  const [editingId, setEditingId] = useState<string | null>(null);

  const [formKeyword, setFormKeyword] = useState('');
  const [formDrOrCr, setFormDrOrCr] = useState<'Dr' | 'Cr'>('Dr');
  const [formAccountLevel, setFormAccountLevel] = useState('Sub Account');
  const [formCategory, setFormCategory] = useState('I/S');
  const [formOperationType, setFormOperationType] = useState<'Income' | 'Payment' | 'Deposit' | 'None'>('None');
  const [formParentFS, setFormParentFS] = useState('');
  const [formParentOp, setFormParentOp] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  const [remarksModalAccount, setRemarksModalAccount] = useState<CoaAccount | null>(null);
  const [remarksList, setRemarksList] = useState<{code: string, name: string}[]>([]);

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
    try {
      setFormError(null);
      const isNumericFormat = !currentClient.coaFormat || currentClient.coaFormat === 'numeric';
      const computedId = (idPrefix + (isNumericFormat ? idSuffix.padEnd(suffixPlaceholder.length, '0') : idSuffix)).replace(/[^0-9A-Za-z_-]/g, '');
      
      if (!idSuffix.trim() || !newName) {
        setFormError("Please fill out Account Code and Name.");
        return;
      }

      if (editingId) {
        // Editing Mode
        const editedAccount = accounts.find(a => a.id === editingId);
        const isMainAccount = editedAccount && !editedAccount.parentId;
        
        let finalEditCode = computedId.replace(/[^0-9A-Za-z_-]/g, '');
        const hasLetters = /[A-Za-z_-]/.test(finalEditCode);
        const isNumeric = !hasLetters && isNumericFormat;

        if (finalEditCode.length === 0) {
          setFormError("Account Code cannot be empty.");
          return;
        }

        if (isNumeric) {
          if (!isMainAccount) {
            // Sub-account must start with its parent prefix to maintain integrity
            if (editedAccount?.parentId) {
              const parentAccount = accounts.find(a => a.id === editedAccount.parentId);
              if (parentAccount) {
                const parentPrefix = getParentPrefix(parentAccount.id);
                if (!finalEditCode.startsWith(parentPrefix)) {
                  setFormError(`Sub-account code must start with its parent prefix: "${parentPrefix}"`);
                  return;
                }
              }
            }
          }
        }

        if (finalEditCode !== editingId && accounts.some(a => a.id === finalEditCode)) {
           setFormError("An account with this code already exists!");
           return;
        }

        let updatedAccounts = [...accounts];

        let adjustedOldId = editingId;
        const index = updatedAccounts.findIndex(a => a.id === adjustedOldId);
        if (index !== -1) {
          const typeChanged = updatedAccounts[index].type !== newType;
          updatedAccounts[index] = {
            ...updatedAccounts[index],
            id: finalEditCode,
            name: newName,
            type: newType,
            keyword: formKeyword,
            drOrCr: formDrOrCr,
            accountLevel: formAccountLevel,
            accountCategory: formCategory,
            operationType: formOperationType,
            parentAccountFS: formParentFS,
            parentAccountOp: formParentOp
          };
          
          if (finalEditCode !== adjustedOldId || (typeChanged && isMainAccount)) {
            updatedAccounts = updateDescendants(updatedAccounts, adjustedOldId, finalEditCode, isMainAccount && typeChanged ? newType : undefined);
          }
        }

        handleSaveAccounts(updatedAccounts);
      } else {
        // Adding Mode
        if (accounts.some(a => a.id === computedId)) {
          setFormError(`An account with the code "${computedId}" already exists!`);
          return;
        }

        let finalType = newType;
        if (addingParentId) {
          const parent = accounts.find(a => a.id === addingParentId);
          if (parent) finalType = parent.type;
        }

        const newAccountObj: CoaAccount = {
          id: computedId,
          name: newName,
          type: finalType,
          parentId: addingParentId,
          keyword: formKeyword,
          drOrCr: formDrOrCr,
          accountLevel: formAccountLevel,
          accountCategory: formCategory,
          operationType: formOperationType,
          parentAccountFS: formParentFS,
          parentAccountOp: formParentOp
        };

        const updatedAccounts = [...accounts, newAccountObj];
        handleSaveAccounts(updatedAccounts);
      }

      setIsAdding(false);
      setEditingId(null);
      setIdPrefix('');
      setIdSuffix('');
      setSuffixPlaceholder('');
      setNewName('');
      setAddingParentId(undefined);

      // Reset fields
      setFormKeyword('');
      setFormDrOrCr('Dr');
      setFormAccountLevel('Sub Account');
      setFormCategory('I/S');
      setFormOperationType('None');
      setFormParentFS('');
      setFormParentOp('');
    } catch (err: any) {
      console.error("Error in handleAddAccount:", err);
      setFormError(err.message || String(err));
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this account? This will also delete any sub-accounts.")) {
      const deletedAccount = accounts.find(a => a.id === id);
      const parentId = deletedAccount?.parentId;

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
      
      let updatedAccounts = accounts.filter(a => !idsToDelete.has(a.id));

      const isNumeric = (!currentClient.coaFormat || currentClient.coaFormat === 'numeric');
      if (isNumeric && parentId && deletedAccount) {
        const siblings = updatedAccounts
          .filter(a => a.parentId === parentId)
          .sort((a, b) => a.id.localeCompare(b.id));

        if (siblings.length > 0) {
          const match = parentId.match(/^(.+?)(0+)$/);
          let prefix = parentId;
          let zeroCount = 0;
          if (match) {
            prefix = match[1];
            zeroCount = match[2].length;
          }

          let step = 1;
          if (zeroCount > 1) {
            step = Math.pow(10, zeroCount - 1);
          }

          siblings.forEach((sib, idx) => {
            let childNewId = '';
            if (zeroCount > 0) {
              const suffixNum = (idx + 1) * step;
              const suffixStr = String(suffixNum).padStart(zeroCount, '0');
              childNewId = prefix + suffixStr;
            } else {
              childNewId = parentId + String(idx + 1);
            }

            if (childNewId !== sib.id) {
              updatedAccounts = updatedAccounts.map(acc => {
                if (acc.id === sib.id) {
                  return { ...acc, id: childNewId };
                }
                if (acc.parentId === sib.id) {
                  return { ...acc, parentId: childNewId };
                }
                return acc;
              });
              updatedAccounts = updateDescendants(updatedAccounts, sib.id, childNewId);
            }
          });
        }
      }

      handleSaveAccounts(updatedAccounts);
    }
  };

  const updateDescendants = (accountsList: CoaAccount[], oldId: string, newId: string, parentNewType?: string): CoaAccount[] => {
    // Collect all descendants of oldId to process (arbitrary depth)
    const descendants = new Set<string>();
    let added = true;
    const parentIds = new Set([oldId]);

    while (added) {
      added = false;
      accountsList.forEach(a => {
        if (a.parentId && parentIds.has(a.parentId) && !descendants.has(a.id)) {
          descendants.add(a.id);
          parentIds.add(a.id);
          added = true;
        }
      });
    }

    const isNumeric = !currentClient.coaFormat || currentClient.coaFormat === 'numeric';
    const oldPrefix = isNumeric ? oldId.replace(/0+$/, '') : oldId;
    const newPrefix = isNumeric ? newId.replace(/0+$/, '') : newId;

    return accountsList.map(a => {
      if (a.id === oldId) return a;

      let rId = a.id;
      let rParentId = a.parentId;
      let rType = a.type;

      if (descendants.has(a.id)) {
        if (a.parentId === oldId) {
          rParentId = newId;
        }
        
        if (a.id.startsWith(oldPrefix)) {
          rId = newPrefix + a.id.slice(oldPrefix.length);
        }
        
        if (a.parentId && a.parentId !== oldId && a.parentId.startsWith(oldPrefix)) {
          rParentId = newPrefix + a.parentId.slice(oldPrefix.length);
        }

        if (parentNewType) {
          rType = parentNewType;
        }
      }

      return {
        ...a,
        id: rId,
        parentId: rParentId,
        type: rType
      };
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const missingTypes = ACCOUNT_TYPES.filter(t => !accounts.some(a => a.type === t && !a.parentId));

  const handleRestoreMainAccount = (type: string) => {
    setFormError(null);
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
      setFormError(`An account with the ID ${restoredId} already exists. Cannot restore automatically.`);
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
    let levelAccounts = accounts.filter(a => a.parentId === parentId).sort((a, b) => a.id.localeCompare(b.id));
    if (!parentId && typeFilter !== 'All') {
      levelAccounts = levelAccounts.filter(a => a.type === typeFilter);
    }

    return levelAccounts.map(account => {
      const hasChildren = accounts.some(a => a.parentId === account.id);
      const isExpanded = expanded[account.id] !== false;

      return (
        <React.Fragment key={account.id}>
          <div className={cn(
            "flex items-center justify-between p-2.5 border-b border-slate-100 dark:border-slate-800 transition-all duration-150 group",
            depth === 0
              ? "bg-slate-50/90 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 font-bold border-l-2 border-l-blue-500"
              : "even:bg-slate-50/30 odd:bg-white dark:even:bg-slate-900/40 dark:odd:bg-slate-900/10 text-slate-700 dark:text-slate-300",
            "hover:bg-blue-50/50 dark:hover:bg-slate-800/60"
          )}>
            <div className="flex items-center gap-2 flex-1" style={{ paddingLeft: `${depth * 1.5}rem` }}>
              {hasChildren ? (
                <button onClick={() => toggleExpand(account.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <div className="w-6" /> // spacer
              )}
              <>
                <span className="text-slate-600 dark:text-slate-400 font-mono text-sm font-semibold">{account.id}</span>
                <span className="text-slate-800 dark:text-slate-200">{account.name}</span>
                {depth === 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-705 text-slate-600 dark:text-slate-400">
                    {account.type}
                  </span>
                )}
              </>
            </div>
            
            <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 ml-auto mr-1">
              <>
                <button
                  onClick={() => {
                    setFormError(null);
                    setAddingParentId(undefined);
                    setEditingId(account.id);
                    setNewName(account.name);
                    setIdPrefix('');
                    setIdSuffix(account.id);
                    setSuffixPlaceholder('');
                    setNewType(account.type);
                    setFormKeyword(account.keyword || '');
                    setFormDrOrCr(account.drOrCr || (['Assets', 'Costs', 'Expenses'].includes(account.type) ? 'Dr' : 'Cr'));
                    setFormAccountLevel(account.accountLevel || (account.parentId ? 'Sub Account' : 'Main Account'));
                    setFormCategory(account.accountCategory || (['Income', 'Expenses', 'Costs'].includes(account.type) ? 'I/S' : 'B/S'));
                    setFormOperationType(account.operationType || (account.type === 'Income' ? 'Income' : account.type === 'Expenses' ? 'Payment' : 'None'));
                    setFormParentFS(account.parentAccountFS || (account.parentId ? (accounts.find(a => a.id === account.parentId)?.name || '') : ''));
                    setFormParentOp(account.parentAccountOp || '');
                    setIsAdding(true);
                  }}
                  className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                  title="Edit Account"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                  <button 
                    onClick={() => {
                      setFormError(null);
                      setEditingId(null);
                      setNewName('');
                      
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
                        // For non-zero-ending parent or alphanumeric format
                        if (currentClient.coaFormat === 'alphanumeric') {
                          prefix = account.id + (account.id.endsWith('-') ? '' : '-');
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
                        } else {
                          // Pure numeric format - NO hyphen!
                          prefix = account.id;
                          placeholder = "01";
                          
                          const childNums = children
                             .map(c => c.id.substring(prefix.length))
                             .filter(s => /^\d+$/.test(s))
                             .map(s => parseInt(s, 10))
                             .filter(n => !isNaN(n));
                             
                          let nextNum = 1;
                          if (childNums.length > 0) {
                            nextNum = Math.max(...childNums) + 1;
                          }
                          suggestedSuffix = nextNum.toString().padStart(2, '0');
                        }
                      }
                      
                      setIdPrefix(prefix);
                      setIdSuffix(suggestedSuffix);
                      setSuffixPlaceholder(placeholder);
                      
                      setFormKeyword('');
                      setFormDrOrCr(account.drOrCr || (['Assets', 'Costs', 'Expenses'].includes(account.type) ? 'Dr' : 'Cr'));
                      setFormAccountLevel('Sub Account');
                      setFormCategory(['Income', 'Expenses', 'Costs'].includes(account.type) ? 'I/S' : 'B/S');
                      setFormOperationType(account.type === 'Income' ? 'Income' : account.type === 'Expenses' ? 'Payment' : 'None');
                      setFormParentFS(account.name);
                      setFormParentOp('');
                      
                      setIsAdding(true);
                    }}
                    className="text-[10px] sm:text-xs px-1.5 py-1 sm:px-2 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-lg flex items-center gap-1 transition-colors"
                    title="Add Sub-account"
                  >
                    <Plus className="w-3 h-3" /> <span className="hidden sm:inline">Sub-account</span><span className="sm:hidden">Sub</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(account.id)}
                    className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              </div>
              <div className="w-24 flex items-center justify-center shrink-0 ml-2">
                <button
                  onClick={() => {
                    setRemarksModalAccount(account);
                    setRemarksList(account.remarks || []);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {account.remarks?.length ? `${account.remarks.length} Remarks` : 'Save'}
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
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

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setFormError(null);
                setAddingParentId(undefined);
                setEditingId(null);
                setIdPrefix('');
                setIdSuffix('');
                setSuffixPlaceholder('');
                setNewName('');
                setNewType(typeFilter !== 'All' ? typeFilter : 'Assets');
                setFormKeyword('');
                setFormDrOrCr('Dr');
                setFormAccountLevel('Main Account');
                setFormCategory('B/S');
                setFormOperationType('None');
                setFormParentFS('');
                setFormParentOp('');
                setIsAdding(true);
              }}
              className="text-xs font-bold bg-[#005fa3] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Account
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <select
                id="coa-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="form-select text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              >
                <option value="All">All Types</option>
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#f0f4f8] dark:bg-slate-900 w-full max-w-xl shadow-2xl border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col font-sans">
              
              {/* Window-Style Title Bar */}
              <div className="bg-[#005fa3] dark:bg-indigo-950 px-3.5 py-2 flex items-center justify-between text-white border-b border-blue-600/30">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-200" />
                  <span className="text-xs sm:text-sm font-bold tracking-wide">{editingId ? "Edit Account" : "Add Account"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => {
                      setIsAdding(false);
                      setEditingId(null);
                      setFormError(null);
                    }} 
                    className="p-1 hover:bg-red-500/80 rounded transition-colors" 
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5 text-blue-200 hover:text-white" />
                  </button>
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-2.5 mx-4 mt-3 mb-1 shadow-sm">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-2">
                      <p className="text-xs text-red-700 dark:text-red-200 font-semibold">
                        {formError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Content Area */}
              <div className="p-4 bg-[#f8fafc] dark:bg-slate-900 flex-1 overflow-y-auto max-h-[480px]">
                
                <div className="space-y-4">
                  {/* Pink highlighted border around Account Code & Name (matching image highlight) */}
                  <div className="border border-rose-300 dark:border-rose-950 bg-rose-50/10 dark:bg-rose-950/5 p-4 rounded-lg space-y-3.5 shadow-xs">
                    
                    {/* Account Code row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 sm:w-28 shrink-0">
                        Account Code
                      </label>
                      <div className="flex items-center flex-1">
                        {idPrefix && (
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 border-r-0 rounded-l text-slate-500 font-mono text-xs font-bold leading-relaxed shrink-0">
                            {idPrefix}
                          </span>
                        )}
                        <input 
                          type="text" 
                          maxLength={15}
                          value={idSuffix} 
                          onChange={e => {
                            let val = e.target.value.replace(/[^0-9A-Za-z_-]/g, '');
                            setIdSuffix(val);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddAccount();
                          }}
                          onBlur={() => {
                            if (!currentClient.coaFormat || currentClient.coaFormat === 'numeric') {
                              if (idSuffix.length < suffixPlaceholder.length && idSuffix.length > 0) {
                                setIdSuffix(idSuffix.padEnd(suffixPlaceholder.length, '0'));
                              }
                            }
                          }}
                          className={cn(
                            "w-full px-2.5 py-1 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-mono rounded focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-blue-500",
                            idPrefix ? "rounded-l-none" : ""
                          )}
                          placeholder={suffixPlaceholder || (currentClient.coaFormat === 'alphanumeric' ? "A-100" : "8400")}
                        />
                      </div>
                    </div>

                    {/* Account Name row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 sm:w-28 shrink-0">
                        Account Name
                      </label>
                      <input 
                        type="text" 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        className="flex-1 px-2.5 py-1 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-blue-500"
                        placeholder="Events Expenses"
                      />
                    </div>

                    {/* Account Type row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 sm:w-28 shrink-0">
                        Account Type
                      </label>
                      <select 
                        value={newType} 
                        onChange={e => setNewType(e.target.value)} 
                        disabled={!!addingParentId || (!!editingId && accounts.find(a => a.id === editingId)?.parentId != null)}
                        className="flex-1 px-2.5 py-1 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded focus:ring-1 focus:ring-blue-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                      >
                        {['Assets', 'Liabilities', 'Equity', 'Income', 'Costs', 'Expenses'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Footer */}
              <div className="bg-slate-50 dark:bg-slate-850 px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2.5 justify-end">
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setFormError(null);
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 font-bold border border-slate-300 dark:border-slate-600 text-xs rounded transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddAccount}
                  className="px-4 py-2 bg-[#005fa3] hover:bg-blue-700 text-white font-bold text-xs rounded shadow-xs transition-colors"
                >
                  Save
                </button>
              </div>

            </div>
          </div>
        )}

        {remarksModalAccount && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-[#f0f4f8] dark:bg-slate-900 w-full max-w-sm shadow-2xl border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col font-sans">
              <div className="bg-[#005fa3] dark:bg-indigo-950 px-3.5 py-2 flex items-center justify-between text-white border-b border-blue-600/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-200" />
                  <span className="text-xs sm:text-sm font-bold tracking-wide">Remarks List - {remarksModalAccount.id}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => {
                      setRemarksModalAccount(null);
                      setRemarksList([]);
                    }} 
                    className="p-1 hover:bg-red-500/80 rounded transition-colors" 
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5 text-blue-200 hover:text-white" />
                  </button>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <span className="text-sm font-bold">Remarks List</span>
                </div>
              </div>
              
              <div className="p-2 bg-[#f8fafc] dark:bg-slate-900 flex-1 overflow-y-auto max-h-[480px]">
                <table className="w-full text-xs text-left border-collapse border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2 border-r border-slate-200 dark:border-slate-700 w-16 text-center font-bold text-slate-500">Remarks Code</th>
                      <th className="p-2 font-bold text-slate-500">Remarks Name</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {remarksList.map((rm, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-700 hover:bg-rose-50/50 dark:hover:bg-rose-950/20">
                        <td className="p-1.5 border-r border-slate-200 dark:border-slate-700 text-center text-blue-600 dark:text-blue-400 font-medium">
                          <input
                            type="text"
                            value={rm.code}
                            onChange={e => {
                              const newArr = [...remarksList];
                              newArr[idx].code = e.target.value;
                              setRemarksList(newArr);
                            }}
                            className="w-full text-center bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 outline-none"
                            placeholder="01"
                          />
                        </td>
                        <td className="p-1.5 text-slate-700 dark:text-slate-300">
                          <input
                            type="text"
                            value={rm.name}
                            onChange={e => {
                              const newArr = [...remarksList];
                              newArr[idx].name = e.target.value;
                              setRemarksList(newArr);
                            }}
                            className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5 outline-none"
                            placeholder="Company Dinner Expense"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            onClick={() => {
                              setRemarksList(remarksList.filter((_, i) => i !== idx));
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-850 px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex gap-2 justify-between">
                <div>
                  <button 
                    onClick={() => {
                      const nextCode = (remarksList.length + 1).toString().padStart(2, '0');
                      setRemarksList([...remarksList, { code: nextCode, name: '' }]);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005fa3] hover:bg-blue-700 text-white font-bold text-xs rounded shadow-xs transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setRemarksList([]);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 border border-slate-300 dark:border-slate-600 font-bold text-xs rounded transition-colors"
                  >
                    Clear All
                  </button>
                  <button 
                    onClick={() => {
                      const updatedAccounts = accounts.map(a => 
                        a.id === remarksModalAccount.id 
                          ? { ...a, remarks: remarksList.filter(r => r.code.trim() && r.name.trim()) } 
                          : a
                      );
                      handleSaveAccounts(updatedAccounts);
                      setRemarksModalAccount(null);
                      setRemarksList([]);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded shadow-xs transition-colors"
                  >
                    Save Remarks
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="flex text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex-1" style={{ paddingLeft: '2.5rem' }}>Account Name</div>
            <div className="w-24 text-center shrink-0 ml-2">Remarks</div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {accounts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No accounts defined. Use the preset selection above or add an account.
              </div>
            ) : (() => {
              const rootMatches = accounts.filter(a => !a.parentId && (typeFilter === 'All' || a.type === typeFilter));
              if (rootMatches.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">No {typeFilter} accounts found.</span>
                    <span className="text-xs text-slate-400">Try changing the filter type.</span>
                  </div>
                );
              }
              return renderAccounts();
            })()}
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
