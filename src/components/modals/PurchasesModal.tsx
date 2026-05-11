import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { formatTIN, generateCSV, MONTHS, getMonthName } from '../../lib/utils';
import { ShoppingCart, Plus, ArrowLeft, FolderClock } from 'lucide-react';
import { cn } from '../../lib/utils';

export function PurchasesModal() {
  const { currentClient, currentClientId, currentDat, saveClient, showToast, setCurrentDat, openModal } = useAccounting();
  
  // Single record state (similar to original but react-friendly)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [checkNumber, setCheckNumber] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [supplierTin, setSupplierTin] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [vatType, setVatType] = useState('vat');
  const [expenseType, setExpenseType] = useState('Capital Goods');
  const [accountTitle, setAccountTitle] = useState('');
  const [transactionDetails, setTransactionDetails] = useState('');
  const [inputTax, setInputTax] = useState(0);

  const ACCOUNT_TITLES_MAP: Record<string, string[]> = {
    'Capital Goods': [
      'Land',
      'Building',
      'Machinery and Equipment',
      'Transportation Equipment',
      'Furniture and Fixtures'
    ],
    'Services': [
      'Professional Fees',
      'Security Services',
      'Janitorial Services',
      'Advertising and Promotion',
      'Rent Expense',
      'Communication, Light and Water',
      'Repairs and Maintenance (Services)'
    ],
    'Others': [
      'Supplies Expense',
      'Fuel, Oil and Lubricants',
      'Taxes and Licenses',
      'Communication, Light and Water (Others)',
      'Repairs and Maintenance (Goods)',
      'Freight and Handling'
    ]
  };

  // Reset account title when expense type changes
  useEffect(() => {
    const options = ACCOUNT_TITLES_MAP[expenseType] || [];
    setAccountTitle(options[0] || '');
  }, [expenseType]);

  const [dateWarning, setDateWarning] = useState<string | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState(1);

  // Auto-count sequence number
  useEffect(() => {
    if (currentClient && currentDat) {
      const count = (currentClient.purchases || []).filter(p => p.datMonthYear === currentDat.formatted).length;
      setSequenceNumber(count + 1);
    }
  }, [currentClient?.purchases.length, currentDat?.formatted]);

  const [autoLoadMsg, setAutoLoadMsg] = useState('');

  // Re-compute input tax on amount or vat type change
  useEffect(() => {
    const num = parseFloat(amount) || 0;
    setInputTax(vatType === 'vat' ? num * 0.12 : 0);
  }, [amount, vatType]);

  // Auto-fill from supplier library
  useEffect(() => {
    if (supplierTin.length === 11 && currentClient) {
      const found = currentClient.tinLibrary.suppliers.find(s => s.tin === supplierTin);
      if (found) {
        setSupplierName(found.name);
        if (found.address) setSupplierAddress(found.address);
        setAutoLoadMsg(`Loaded: ${found.name}`);
        const t = setTimeout(() => setAutoLoadMsg(''), 2000);
        return () => clearTimeout(t);
      }
    }
  }, [supplierTin, currentClient]);

  // Date validation against DAT
  useEffect(() => {
    if (!currentDat || !date) {
      setDateWarning(null);
      return;
    }
    const selectedDate = new Date(date);
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth() + 1;

    if (y > currentDat.year) {
      setDateWarning(`⚠️ Transaction year (${y}) cannot be later than DAT year (${currentDat.year})`);
    } else if (y < currentDat.year) {
      setDateWarning(`⚠️ Transaction year (${y}) is earlier than DAT year (${currentDat.year}). Please select a date within ${currentDat.formatted}.`);
    } else if (m > currentDat.month) {
      setDateWarning(`⚠️ Transaction month cannot be later than DAT month`);
    } else if (m < currentDat.month) {
      setDateWarning(`⚠️ Transaction month is earlier than DAT month. Please select a date within ${currentDat.formatted}.`);
    } else {
      setDateWarning(null);
    }
  }, [date, currentDat]);

  const handleAddPurchase = () => {
    if (!currentClient || !currentClientId || !currentDat) return;
    if (!date || !invoiceNo || !supplierTin || !supplierName || !amount) {
      alert('Please fill out all required fields.');
      return;
    }
    if (dateWarning) {
      alert('Please fix date warning before saving.');
      return;
    }

    const newPurchase = {
      id: Date.now(),
      sequenceNumber,
      datMonthYear: currentDat.formatted,
      date,
      paymentMethod,
      checkNumber: paymentMethod === 'Check' ? checkNumber : null,
      invoiceNo,
      supplierTin,
      supplierName,
      supplierAddress,
      amount: parseFloat(amount),
      vatType,
      expenseType,
      accountTitle,
      transactionDetails,
      inputTax
    };

    // Auto-add to TIN Library if new
    let updatedTinLibrary = currentClient.tinLibrary;
    const exists = currentClient.tinLibrary.suppliers.some(s => s.tin === supplierTin);
    if (!exists) {
      updatedTinLibrary = {
        ...currentClient.tinLibrary,
        suppliers: [
          ...currentClient.tinLibrary.suppliers,
          {
            tin: supplierTin,
            name: supplierName,
            address: supplierAddress
          }
        ]
      };
    }

    const updatedClient = {
      ...currentClient,
      purchases: [...currentClient.purchases, newPurchase],
      tinLibrary: updatedTinLibrary
    };
    saveClient(currentClientId, updatedClient);
    showToast(exists ? 'Expense entry added' : 'Expense added & Supplier saved to Library');

    // Reset most form fields, keeping dates
    setInvoiceNo('');
    setSupplierTin('');
    setSupplierName('');
    setSupplierAddress('');
    setAmount('');
    setCheckNumber('');
    setTransactionDetails('');
  };

  const handleDelete = (id: number) => {
    if (!currentClient || !currentClientId) return;
    const updatedClient = {
      ...currentClient,
      purchases: currentClient.purchases.filter(p => p.id !== id)
    };
    saveClient(currentClientId, updatedClient);
    showToast('Expense deleted');
  };

  return (
    <Modal
      id="purchases"
      title="Expense Data Entry Screen"
      icon={<ShoppingCart className="w-5 h-5 text-amber-500" />}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl mb-6 gap-4 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
            <FolderClock className="w-5 h-5 text-cyan-500" />
            <span>DAT Period:</span>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto items-center">
            {currentDat ? (
              <>
                <span className="bg-cyan-500 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow-sm ring-2 ring-cyan-500/20">
                  {currentDat.formatted}
                </span>
                <div className="flex items-center gap-2 ml-2 pl-4 border-l border-slate-300 dark:border-slate-600">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Seq #:</span>
                  <input 
                    type="text" 
                    readOnly 
                    value={sequenceNumber} 
                    className="w-14 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-center font-bold text-amber-600 py-1.5 focus:outline-none shadow-inner"
                  />
                </div>
              </>
            ) : (
              <span className="text-red-500 font-bold animate-pulse italic">No DAT Selected</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 relative">
        <div className="lg:col-span-3 pb-2 mb-2 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between">
            <div className="w-full md:w-1/3">
              <label className="form-label text-red-500">Transaction Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" />
              {dateWarning && <p className="text-xs text-amber-600 bg-amber-100 p-2 mt-1 rounded-lg">{dateWarning}</p>}
            </div>
            
            <div className="w-full md:w-2/3 flex flex-col justify-end">
               <label className="form-label">Payment Method</label>
               <div className="flex items-center gap-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                    <input type="radio" value="Cash" checked={paymentMethod === 'Cash'} onChange={() => setPaymentMethod('Cash')} className="w-4 h-4 text-amber-500" />
                    💵 Cash
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                    <input type="radio" value="Check" checked={paymentMethod === 'Check'} onChange={() => setPaymentMethod('Check')} className="w-4 h-4 text-amber-500" />
                    📝 Check
                  </label>
               </div>
            </div>
        </div>

        {paymentMethod === 'Check' && (
          <div className="lg:col-span-3">
             <label className="form-label text-red-500">Check Number *</label>
             <input type="text" value={checkNumber} onChange={e => setCheckNumber(e.target.value)} placeholder="000123" className="form-input bg-amber-50 dark:bg-amber-900/10 border-amber-200" />
          </div>
        )}

        <div>
           <label className="form-label text-red-500">Invoice # *</label>
           <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="Supplier Invoice" className="form-input" />
        </div>
        
        <div className="relative">
          <label className="form-label text-red-500">Supplier TIN *</label>
          <input 
            type="text" 
            value={supplierTin} 
            onChange={e => setSupplierTin(formatTIN(e.target.value))} 
            placeholder="000-000-000" 
            className="form-input font-mono" 
            maxLength={11}
          />
           {autoLoadMsg && (
            <span className="absolute top-8 right-3 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-1 rounded">
              {autoLoadMsg}
            </span>
          )}
        </div>

        <div>
          <label className="form-label text-red-500">Supplier Name *</label>
          <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Supplier Full Name" className="form-input" />
        </div>

        <div className="lg:col-span-2">
          <label className="form-label">Supplier Address</label>
          <input type="text" value={supplierAddress} onChange={e => setSupplierAddress(e.target.value)} placeholder="Street, City, Province" className="form-input" />
        </div>

        <div>
           <label className="form-label text-red-500">VAT Type *</label>
           <select value={vatType} onChange={e => setVatType(e.target.value)} className="form-input bg-slate-100 dark:bg-slate-900 border-slate-300">
             <option value="vat">VAT 12% (+ Input Tax)</option>
             <option value="non-vat">Non-VAT (0 Tax)</option>
             <option value="zero-rated">0-Rated (0 Tax)</option>
           </select>
        </div>

        <div>
          <label className="form-label text-red-500">Amount (₱) *</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="form-input font-bold" />
        </div>

        <div className="lg:col-span-1">
          <label className="form-label">Expense Class</label>
          <select value={expenseType} onChange={e => setExpenseType(e.target.value)} className="form-input">
            <option value="Capital Goods">🏭 Capital Goods</option>
            <option value="Services">📋 Services</option>
            <option value="Others">📦 Others</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="form-label">Account Title</label>
          <select value={accountTitle} onChange={e => setAccountTitle(e.target.value)} className="form-input bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/50 font-bold text-blue-800 dark:text-blue-300">
            {(ACCOUNT_TITLES_MAP[expenseType] || []).map(title => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="form-label">Transaction Details</label>
          <input 
            type="text" 
            value={transactionDetails} 
            onChange={e => setTransactionDetails(e.target.value)} 
            placeholder="Enter additional details about this transaction..." 
            className="form-input" 
          />
        </div>

        <div className="lg:col-span-3 flex justify-between items-center mt-2 border-t border-slate-200 dark:border-slate-700 pt-4">
           <div className="flex gap-4 items-center">
             <span className="text-sm font-semibold text-slate-500">Computed Input Tax:</span>
             <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                ₱ {inputTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </span>
           </div>
           
           <div className="flex gap-3">
             <button onClick={handleAddPurchase} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-8 py-2.5 rounded-xl transition-colors shadow-sm shadow-amber-500/20 flex items-center gap-2">
               <Plus className="w-5 h-5" /> Add Entry
             </button>
             <button 
               onClick={() => openModal(null)} 
               className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2"
             >
               <ArrowLeft className="w-5 h-5" /> Cancel
             </button>
           </div>
        </div>
      </div>

    </Modal>
  );
}
