import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { formatTIN } from '../../lib/utils';
import { Receipt, Search, Trash2, Plus } from 'lucide-react';

export function SalesModal() {
  const { currentClient, currentClientId, saveClient, showToast } = useAccounting();
  
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
    if (!currentClient || !currentClientId) return;
    if (!date || !amount || !buyerName) {
      alert('Enter date, buyer name, and amount');
      return;
    }

    const newSale = {
      id: Date.now(),
      date,
      ref,
      paymentType,
      buyerName,
      buyerTin,
      amount: parseFloat(amount),
      desc
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
      title="Sales Module"
      icon={<Receipt className="w-5 h-5 text-emerald-500" />}
      badge={<span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">Revenue</span>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div>
          <label className="form-label">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" />
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
            <Plus className="w-5 h-5" /> Add Sales Entry
          </button>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">Sales Transactions</h4>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search sales..." 
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
        
        <div className="mt-6 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex justify-between items-center">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Total Sales</span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ₱{totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </Modal>
  );
}
