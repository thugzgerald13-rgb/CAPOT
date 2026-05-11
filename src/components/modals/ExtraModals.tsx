import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { Users, TrendingUp, Key, Lightbulb, BookOpen, BookText, LineChart, Scale, Plus } from 'lucide-react';

export function ExtraModals() {
  const { clients, currentClientId, setCurrentClientId, addClient, openModal, currentClient } = useAccounting();
  const [newClientName, setNewClientName] = useState('');

  const handleAddClient = () => {
    if (newClientName.trim()) {
      addClient(newClientName);
      setNewClientName('');
    }
  };

  const salesTotal = currentClient?.sales.reduce((s,i)=>s+i.amount,0) || 0;
  const purchasesTotal = currentClient?.purchases.reduce((s,i)=>s+i.amount,0) || 0;
  const totalIpTax = currentClient?.purchases.reduce((s,i)=>s+(i.inputTax||0),0) || 0;
  const gp = salesTotal - purchasesTotal;
  const gm = salesTotal ? ((gp/salesTotal)*100).toFixed(2) : 0;
  
  return (
    <>
      <Modal id="clients" title="Client Profiles" icon={<Users className="text-blue-500" />}>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl mb-6 flex gap-4">
          <input 
            type="text" 
            placeholder="New Client Name" 
            value={newClientName}
            onChange={e => setNewClientName(e.target.value)}
            className="form-input flex-1"
          />
          <button onClick={handleAddClient} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700">
            <Plus className="w-5 h-5" /> Add
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Object.values(clients).map(client => (
             <button
               key={client.id}
               onClick={() => {
                 setCurrentClientId(client.id);
                 openModal(null);
               }}
               className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${currentClientId === client.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400'}`}
             >
               <span className="font-bold text-slate-800 dark:text-slate-100">{client.name}</span>
               <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                 {client.sales.length} Sales | {client.purchases.length} Purchases
               </span>
             </button>
          ))}
        </div>
      </Modal>

      <Modal id="pl" title="Profit & Loss" icon={<TrendingUp className="text-emerald-500" />}>
         <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="data-table">
              <tbody>
                <tr>
                  <td className="font-semibold py-4">Total Revenue / Sales</td>
                  <td className="text-right font-bold py-4 text-emerald-600">₱{salesTotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="font-semibold py-4">Total Purchases / COGS</td>
                  <td className="text-right font-bold py-4 text-amber-600">₱{purchasesTotal.toLocaleString()}</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-600">
                  <td className="font-extrabold text-lg py-4">Gross Profit</td>
                  <td className="text-right font-extrabold text-lg py-4 text-blue-600">₱{gp.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
         </div>
      </Modal>

      <Modal id="ratios" title="Financial Ratios" icon={<Key className="text-indigo-500" />}>
         <div className="grid grid-cols-2 gap-4">
           <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-6 rounded-2xl text-center">
             <div className="text-sm font-semibold text-indigo-500 mb-2 uppercase tracking-wide">Gross Margin</div>
             <div className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-400">{gm}%</div>
           </div>
         </div>
      </Modal>

      <Modal id="taxnotes" title="Tax Notes & Estimates" icon={<Lightbulb className="text-yellow-500" />}>
         <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm">
               <span className="font-semibold text-slate-700 dark:text-slate-300">Estimated Income Tax (25% based on Gross)</span>
               <span className="font-extrabold text-lg text-red-600">₱{(gp > 0 ? gp * 0.25 : 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm">
               <span className="font-semibold text-slate-700 dark:text-slate-300">Available Input VAT (from current DAT)</span>
               <span className="font-extrabold text-lg text-blue-600">₱{totalIpTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
         </div>
      </Modal>

      {/* Placeholders for deep accounting features that were blank in the original HTML */}
      <Modal id="coa" title="Chart of Accounts" icon={<BookOpen />}>
         <p className="text-center p-8 text-slate-500">Standard COA integration coming soon. This module manages ledger accounts.</p>
      </Modal>
      <Modal id="journal" title="Journal Entry" icon={<BookText />}>
         <p className="text-center p-8 text-slate-500">General Journal module coming soon. Create manual double-entry records.</p>
      </Modal>
      <Modal id="ledger" title="General Ledger" icon={<LineChart />}>
         <p className="text-center p-8 text-slate-500">General Ledger sync mechanism coming soon.</p>
      </Modal>
      <Modal id="trialbalance" title="Trial Balance" icon={<Scale />}>
         <p className="text-center p-8 text-slate-500">Trial Balance computation based on Journal and Ledger.</p>
         <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-center font-mono">
            <strong>Debits:</strong> ₱{salesTotal.toLocaleString()} &nbsp; | &nbsp; <strong>Credits:</strong> ₱{purchasesTotal.toLocaleString()}
         </div>
      </Modal>
    </>
  );
}
