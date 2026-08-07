import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { formatTIN, MONTHS, getMonthName } from '../../lib/utils';
import { Receipt, Search, Trash2, Plus, FolderClock } from 'lucide-react';

export function SalesModal() {
  const { currentClient, currentClientId, currentDat, setCurrentDat, saveClient, showToast, activeDevice } = useAccounting();

  const currentYear = new Date().getFullYear();
  const periodYears = Array.from({ length: 11 }, (_, i) => currentYear - 10 + i);
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [ref, setRef] = useState('');
  const [paymentType, setPaymentType] = useState('Cash');
  const [buyerTin, setBuyerTin] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoLoadMsg, setAutoLoadMsg] = useState('');
  const [dateWarning, setDateWarning] = useState<string | null>(null);

  // Default to the current month/year if no period has been picked yet,
  // so Save works immediately without requiring the user to touch the picker.
  useEffect(() => {
    if (!currentDat) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      setCurrentDat({ month, year, formatted: `${getMonthName(month)} ${year}` });
    }
  }, []);

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
      setDateWarning(`⚠️ Transaction year (${y}) is earlier than DAT year (${currentDat.year}).`);
    } else if (m > currentDat.month) {
      setDateWarning(`⚠️ Transaction month cannot be later than DAT month`);
    } else if (m < currentDat.month) {
      setDateWarning(`⚠️ Transaction month is earlier than DAT month.`);
    } else {
      setDateWarning(null);
    }
  }, [date, currentDat]);

  // Auto-fill buyer name from TIN library
  useEffect(() => {
    if (buyerTin.length === 11 && currentClient) {
      const found = currentClient.tinLibrary.customers.find(c => c.tin === buyerTin);
      if (found) {
        setBuyerName(found.name);
        setAutoLoadMsg(`Loaded: ${found.name}`);
        const t = setTimeout(() => setAutoLoadMsg(''), 2000);
        return () => clearTimeout(t);
      }
    }
  }, [buyerTin, currentClient]);

  const handleAddSale = () => {
    if (!currentClient || !currentClientId || !currentDat) return;
    if (!date || !amount || !buyerName) {
      alert('Enter date, buyer name, and amount');
      return;
    }
    if (dateWarning) {
      alert('Please fix date warning before saving.');
      return;
    }

    const newSale = {
      id: Date.now(),
      datMonthYear: currentDat.formatted,
      date,
      ref,
      paymentType,
      buyerName,
      buyerTin,
      amount: parseFloat(amount),
      desc,
      outputTax: parseFloat(amount) * 0.12 // Standard 12% for Sales if applicable, or keep as is
    };

    const updatedClient = {
      ...currentClient,
      sales: [...currentClient.sales, newSale]
    };

    saveClient(currentClientId, updatedClient);
    showToast('Sales entry added');
    
    // Reset Form
    setRef('');
    setBuyerName('');
    setBuyerTin('');
    setAmount('');
    setDesc('');
  };

  const handleDelete = (id: number) => {
    if (!currentClient || !currentClientId) return;
    const updatedClient = {
      ...currentClient,
      sales: currentClient.sales.filter(s => s.id !== id)
    };
    saveClient(currentClientId, updatedClient);
    showToast('Sale deleted');
  };

  const sales = currentClient?.sales || [];
  const filteredSales = sales.filter(s => 
    s.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.ref.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);

  return (
    <Modal
      id="sales"
      title="Income"
      icon={<Receipt className="w-5 h-5 text-emerald-500" />}
      badge={<span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">Revenue</span>}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl mb-6 gap-4 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
          <FolderClock className="w-5 h-5 text-cyan-500" />
          <span>Period:</span>
          <select
            value={currentDat?.month || new Date().getMonth() + 1}
            onChange={e => {
              const month = parseInt(e.target.value);
              const year = currentDat?.year || currentYear;
              setCurrentDat({ month, year, formatted: `${getMonthName(month)} ${year}` });
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={currentDat?.year || currentYear}
            onChange={e => {
              const year = parseInt(e.target.value);
              const month = currentDat?.month || new Date().getMonth() + 1;
              setCurrentDat({ month, year, formatted: `${getMonthName(month)} ${year}` });
            }}
            className="px-3 py-1.5 rounded-lg text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none"
          >
            {periodYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {!currentDat && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Pick a period to enable saving</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div>
          <label className="form-label">Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            min={currentDat ? `${currentDat.year}-${String(currentDat.month).padStart(2, '0')}-01` : undefined}
            max={currentDat ? `${currentDat.year}-${String(currentDat.month).padStart(2, '0')}-${String(new Date(currentDat.year, currentDat.month, 0).getDate()).padStart(2, '0')}` : undefined}
            className="form-input" 
          />
          {dateWarning && <p className="text-xs text-amber-600 mt-1">{dateWarning}</p>}
        </div>
        <div>
          <label className="form-label">Invoice #</label>
          <input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="INV-001" className="form-input" />
        </div>
        <div>
          <label className="form-label">Payment Type</label>
          <select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="form-input">
            <option>Cash</option>
            <option>Check</option>
            <option>Credit Card</option>
            <option>Bank Transfer</option>
          </select>
        </div>
        <div>
          <label className="form-label">Amount (₱)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="form-input" />
        </div>
        <div className="lg:col-span-2 relative">
          <label className="form-label">Buyer TIN</label>
          <input 
            type="text" 
            value={buyerTin} 
            onChange={e => setBuyerTin(formatTIN(e.target.value))} 
            placeholder="000-000-000" 
            className="form-input font-mono" 
            maxLength={11}
          />
          {autoLoadMsg && (
            <span className="absolute top-8 right-3 text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded">
              {autoLoadMsg}
            </span>
          )}
        </div>
        <div className="lg:col-span-2">
          <label className="form-label">Buyer Name</label>
          <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Company / Full Name" className="form-input" />
        </div>
        <div className="lg:col-span-4">
          <label className="form-label">Description</label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Products or Services details" className="form-input" />
        </div>
        <div className="lg:col-span-4 mt-2">
          <button onClick={handleAddSale} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-sm shadow-emerald-500/20 flex justify-center items-center gap-2">
            <Plus className="w-5 h-5" /> Add Income Entry
          </button>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">Income Transactions</h4>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search income..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {activeDevice === 'mobile' ? (
          <div className="flex flex-col gap-3">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex flex-col gap-2 relative shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full inline-block mb-1">{sale.date}</span>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100">{sale.buyerName}</h5>
                    <p className="text-xs text-slate-500 font-mono">TIN: {sale.buyerTin || '—'}</p>
                    {sale.ref && <p className="text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-lg px-2 py-0.5 mt-1 inline-block">INV #: {sale.ref}</p>}
                    {sale.desc && <p className="text-xs text-slate-400 mt-1 italic">"{sale.desc}"</p>}
                  </div>
                  <button 
                    onClick={() => handleDelete(sale.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700/60 pt-2.5 mt-1.5 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount:</span>
                  <span className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">₱{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
            {filteredSales.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">No income entries found.</div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice #</th>
                  <th>Buyer TIN</th>
                  <th>Buyer Name</th>
                  <th className="text-right">Amount</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                    <td>{sale.date}</td>
                    <td>{sale.ref || '—'}</td>
                    <td className="font-mono text-xs">{sale.buyerTin || '—'}</td>
                    <td className="font-medium">{sale.buyerName}</td>
                    <td className="text-right font-bold">₱{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="text-center">
                      <button 
                        onClick={() => handleDelete(sale.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No sales records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-6 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex justify-between items-center">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Total Income</span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ₱{totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </Modal>
  );
}
