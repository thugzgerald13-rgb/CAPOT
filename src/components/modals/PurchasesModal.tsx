import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { formatTIN, generateCSV } from '../../lib/utils';
import { ShoppingCart, Search, Trash2, Plus, Download } from 'lucide-react';
import { cn } from '../../lib/utils';

export function PurchasesModal() {
  const { currentClient, currentClientId, currentDat, saveClient, showToast } = useAccounting();
  
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
  const [inputTax, setInputTax] = useState(0);

  const [dateWarning, setDateWarning] = useState<string | null>(null);
  const [autoLoadMsg, setAutoLoadMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
      inputTax
    };

    const updatedClient = {
      ...currentClient,
      purchases: [...currentClient.purchases, newPurchase]
    };
    saveClient(currentClientId, updatedClient);
    showToast('Purchase entry added');

    // Reset most form fields, keeping dates
    setInvoiceNo('');
    setSupplierTin('');
    setSupplierName('');
    setSupplierAddress('');
    setAmount('');
    setCheckNumber('');
  };

  const handleDelete = (id: number) => {
    if (!currentClient || !currentClientId) return;
    const updatedClient = {
      ...currentClient,
      purchases: currentClient.purchases.filter(p => p.id !== id)
    };
    saveClient(currentClientId, updatedClient);
    showToast('Purchase deleted');
  };

  const handleExportDAT = () => {
    if (!currentClient || !currentDat) return;
    const purchases = (currentClient.purchases || []).filter(p => p.datMonthYear === currentDat.formatted);
    if (purchases.length === 0) {
      alert(`No transactions found for ${currentDat.formatted}`);
      return;
    }

    let csvRows = [];
    csvRows.push(['DAT File Period', currentDat.formatted]);
    csvRows.push(['Generated Date', new Date().toLocaleString()]);
    csvRows.push(['Client', currentClient.name]);
    csvRows.push([]);
    csvRows.push(['Transaction Date', 'Payment Method', 'Check #', 'Invoice #', 'Supplier TIN', 'Supplier Name', 'Supplier Address', 'VAT Type', 'Expense Classification', 'Amount (PHP)', 'Input Tax (PHP)']);
    
    let totalAmt = 0;
    let totalTax = 0;

    purchases.forEach(p => {
      totalAmt += p.amount;
      totalTax += p.inputTax || 0;
      csvRows.push([
        p.date,
        p.paymentMethod,
        p.checkNumber || '',
        p.invoiceNo || '',
        p.supplierTin || '',
        p.supplierName,
        p.supplierAddress || '',
        p.vatType === 'vat' ? 'VAT 12%' : (p.vatType === 'non-vat' ? 'Non-VAT' : '0-Rated'),
        p.expenseType || 'Others',
        p.amount.toFixed(2),
        (p.inputTax || 0).toFixed(2)
      ]);
    });

    csvRows.push([]);
    csvRows.push(['TOTAL', '', '', '', '', '', '', '', '', totalAmt.toFixed(2), totalTax.toFixed(2)]);

    generateCSV(`DAT_${currentDat.formatted.replace(/ /g, '_')}_${currentClient.name.replace(/ /g, '_')}.csv`, csvRows);
    showToast('DAT exported successfully');
  };


  const purchases = (currentClient?.purchases || []).filter(p => p.datMonthYear === currentDat?.formatted);
  const filteredPurchases = purchases.filter(p => 
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
  const totalIpTax = purchases.reduce((sum, p) => sum + (p.inputTax || 0), 0);

  return (
    <Modal
      id="purchases"
      title="Purchases Module"
      icon={<ShoppingCart className="w-5 h-5 text-amber-500" />}
      badge={
        <span className="bg-amber-500 text-slate-900 px-2 py-0.5 rounded-full text-xs font-bold leading-tight">
          VAT & Expense
        </span>
      }
    >
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-xl mb-6">
        <div className="flex items-center gap-3 font-semibold text-sm">
          <span>Active DAT:</span>
          {currentDat ? (
            <span className="bg-cyan-500 text-white px-3 py-1 rounded-full">{currentDat.formatted}</span>
          ) : (
            <span className="text-red-500">None Selected</span>
          )}
        </div>
        <button onClick={handleExportDAT} className="text-sm font-bold bg-white dark:bg-slate-700 px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" /> Export DAT
        </button>
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
          <label className="form-label text-red-500">Amount (₱) *</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="form-input font-bold" />
        </div>

        <div className="lg:col-span-2">
          <label className="form-label text-red-500">Supplier Name *</label>
          <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Supplier Full Name" className="form-input" />
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

        <div className="lg:col-span-3 flex justify-between items-center mt-2 border-t border-slate-200 dark:border-slate-700 pt-4">
           <div className="flex gap-4 items-center">
             <span className="text-sm font-semibold text-slate-500">Computed Input Tax:</span>
             <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                ₱ {inputTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </span>
           </div>
           
           <button onClick={handleAddPurchase} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-8 py-2.5 rounded-xl transition-colors shadow-sm shadow-amber-500/20 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Entry
          </button>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">DAT Transactions</h4>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search purchases..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>VAT</th>
                <th>Expense</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Input Tax</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                  <td>{p.date}</td>
                  <td className="font-medium">
                     {p.supplierName} 
                     <span className="block text-xs font-normal text-slate-400">{p.invoiceNo} {p.paymentMethod === 'Check' ? `(Check)`: ''}</span>
                  </td>
                  <td>
                    <span className={cn("px-2 py-0.5 rounded text-xs font-bold", 
                      p.vatType === 'vat' ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"
                    )}>
                      {p.vatType === 'vat' ? 'VAT 12%' : 'No VAT'}
                    </span>
                  </td>
                  <td className="text-xs">{p.expenseType}</td>
                  <td className="text-right font-bold">₱{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="text-right text-blue-600 dark:text-blue-400">₱{(p.inputTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="text-center">
                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No purchase records found for this DAT.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex justify-around items-center divide-x divide-slate-300 dark:divide-slate-600">
          <div className="flex flex-col items-center flex-1">
             <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase">Total Purchases</span>
             <span className="text-xl font-extrabold text-amber-600 dark:text-amber-500">
               ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </span>
          </div>
          <div className="flex flex-col items-center flex-1">
             <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase">Total Input Tax</span>
             <span className="text-xl font-extrabold text-blue-600 dark:text-blue-500">
               ₱{totalIpTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
