import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { Users, TrendingUp, Key, Lightbulb, BookOpen, BookText, LineChart, Scale, Plus, Building2, Save, X, RotateCcw } from 'lucide-react';
import { Client } from '../../types';
import { RDO_CODES } from '../../lib/utils';

export function ExtraModals() {
  const { clients, currentClientId, setCurrentClientId, addClient, openModal, currentClient, saveClient } = useAccounting();
  const [newClientName, setNewClientName] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const handleEditClient = (client: Client) => {
    setEditingClient({ ...client });
  };

  const handleSaveProfile = () => {
    if (editingClient) {
      saveClient(editingClient.id, editingClient);
      setEditingClient(null);
    }
  };

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
        {editingClient ? (
          <div className="bg-slate-100 dark:bg-slate-900 -m-6 p-6 h-full min-h-[600px] flex flex-col font-sans">
            {/* Form Header */}
            <div className="bg-slate-300 dark:bg-slate-800 p-2 border-b border-slate-400 dark:border-slate-700 flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Company Information</span>
              <button 
                onClick={() => setEditingClient(null)}
                className="hover:bg-slate-400 dark:hover:bg-slate-700 rounded p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              <h2 className="text-2xl font-bold text-red-800 mb-6 border-b border-red-200 pb-2">Owner's Information</h2>

              <div className="grid grid-cols-12 gap-4 mb-4">
                <div className="col-span-5">
                  <label className="form-label">Tin:</label>
                  <div className="flex items-center gap-1">
                    <input 
                      type="text" 
                      maxLength={3}
                      value={(editingClient.tin || '').split('-')[0] || ''} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        const parts = (editingClient.tin || '').split('-');
                        parts[0] = val;
                        setEditingClient({...editingClient, tin: parts.join('-')});
                      }}
                      className="w-16 px-2 py-1.5 border border-slate-400 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-center font-mono"
                    />
                    <span>-</span>
                    <input 
                      type="text" 
                      maxLength={3}
                      value={(editingClient.tin || '').split('-')[1] || ''} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        const parts = (editingClient.tin || '').split('-');
                        parts[1] = val;
                        setEditingClient({...editingClient, tin: parts.join('-')});
                      }}
                      className="w-16 px-2 py-1.5 border border-slate-400 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-center font-mono"
                    />
                    <span>-</span>
                    <input 
                      type="text" 
                      maxLength={3}
                      value={(editingClient.tin || '').split('-')[2] || ''} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        const parts = (editingClient.tin || '').split('-');
                        parts[2] = val;
                        setEditingClient({...editingClient, tin: parts.join('-')});
                      }}
                      className="w-16 px-2 py-1.5 border border-slate-400 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-center font-mono"
                    />
                  </div>
                </div>
                <div className="col-span-7">
                  <label className="form-label">Taxpayer Classification:</label>
                  <select 
                    value={editingClient.taxpayerClassification || ''}
                    onChange={e => setEditingClient({...editingClient, taxpayerClassification: e.target.value})}
                    className="form-input"
                  >
                    <option value="">Select Classification</option>
                    <option value="Individual">Individual</option>
                    <option value="Non-Individual">Non-Individual</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Registered Name:</label>
                <input 
                  type="text" 
                  value={editingClient.registeredName || ''} 
                  onChange={e => {
                    const val = e.target.value;
                    setEditingClient({...editingClient, registeredName: val, name: val || editingClient.name});
                  }}
                  className="form-input border-slate-400 dark:border-slate-600"
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Taxpayer Name:</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center">
                    <input 
                      type="text" 
                      value={editingClient.lastName || ''} 
                      onChange={e => setEditingClient({...editingClient, lastName: e.target.value})}
                      className="form-input border-slate-400 dark:border-slate-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Last Name</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <input 
                      type="text" 
                      value={editingClient.firstName || ''} 
                      onChange={e => setEditingClient({...editingClient, firstName: e.target.value})}
                      className="form-input border-slate-400 dark:border-slate-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold">First Name</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <input 
                      type="text" 
                      value={editingClient.middleName || ''} 
                      onChange={e => setEditingClient({...editingClient, middleName: e.target.value})}
                      className="form-input border-slate-400 dark:border-slate-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Middle Name</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Trade Name:</label>
                <input 
                  type="text" 
                  value={editingClient.tradeName || ''} 
                  onChange={e => setEditingClient({...editingClient, tradeName: e.target.value})}
                  className="form-input border-slate-400 dark:border-slate-600"
                />
              </div>

              <div className="bg-slate-200 dark:bg-slate-800/80 p-4 rounded border border-slate-300 dark:border-slate-700 mb-4">
                <label className="form-label text-slate-800 dark:text-slate-300 mb-3 font-bold">Registered/Business Address:</label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="flex flex-col items-center">
                    <input 
                      value={editingClient.substreet || ''} 
                      onChange={e => setEditingClient({...editingClient, substreet: e.target.value})}
                      className="form-input border-slate-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold text-center">Substreet</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <input 
                      value={editingClient.street || ''} 
                      onChange={e => setEditingClient({...editingClient, street: e.target.value})}
                      className="form-input border-slate-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold text-center">Street</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <input 
                      value={editingClient.barangay || ''} 
                      onChange={e => setEditingClient({...editingClient, barangay: e.target.value})}
                      className="form-input border-slate-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold text-center">Barangay</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center">
                    <input 
                      value={editingClient.district || ''} 
                      onChange={e => setEditingClient({...editingClient, district: e.target.value})}
                      className="form-input border-slate-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold text-center leading-tight">District/Municipality</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <input 
                      value={editingClient.city || ''} 
                      onChange={e => setEditingClient({...editingClient, city: e.target.value})}
                      className="form-input border-slate-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold text-center leading-tight">City/Province</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <input 
                      value={editingClient.zipCode || ''} 
                      onChange={e => setEditingClient({...editingClient, zipCode: e.target.value})}
                      className="form-input border-slate-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold text-center">Zip Code</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 items-end mb-6">
                <div className="col-span-3">
                  <label className="form-label">RDO Code:</label>
                  <select 
                    value={editingClient.rdoCode || ''}
                    onChange={e => setEditingClient({...editingClient, rdoCode: e.target.value})}
                    className="form-input border-slate-400"
                  >
                    <option value="">Select RDO</option>
                    {RDO_CODES.map(code => (
                      <option key={code} value={code.split(' - ')[0]}>{code}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-5 flex items-center gap-6 py-3 px-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      className="w-4 h-4"
                      name="accountingType" 
                      checked={editingClient.accountingType === 'Calendar'}
                      onChange={() => setEditingClient({...editingClient, accountingType: 'Calendar'})}
                    />
                    <span className="text-xs font-bold uppercase tracking-tight">Calendar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      className="w-4 h-4"
                      name="accountingType" 
                      checked={editingClient.accountingType === 'Fiscal'}
                      onChange={() => setEditingClient({...editingClient, accountingType: 'Fiscal'})}
                    />
                    <span className="text-xs font-bold uppercase tracking-tight">Fiscal</span>
                  </label>
                </div>
                <div className="col-span-4">
                  <label className="form-label">Fiscal Month End:</label>
                  <select 
                    disabled={editingClient.accountingType !== 'Fiscal'}
                    value={editingClient.fiscalMonthEnd || 12}
                    onChange={e => setEditingClient({...editingClient, fiscalMonthEnd: parseInt(e.target.value)})}
                    className="form-input disabled:opacity-50 border-slate-400"
                  >
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i+1} value={i+1}>{i+1}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="border-t border-slate-300 dark:border-slate-700 pt-4 flex justify-end gap-3 px-4">
              <button 
                onClick={handleSaveProfile}
                className="bg-slate-200 dark:bg-slate-700 font-bold px-6 py-2 rounded border border-slate-400 dark:border-slate-600 shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save
              </button>
              <button 
                onClick={() => setEditingClient({...clients[editingClient.id]})}
                className="bg-slate-200 dark:bg-slate-700 font-bold px-6 py-2 rounded border border-slate-400 dark:border-slate-600 shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Revert
              </button>
              <button 
                onClick={() => setEditingClient(null)}
                className="bg-slate-200 dark:bg-slate-700 font-bold px-6 py-2 rounded border border-slate-400 dark:border-slate-600 shadow-sm hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center gap-2"
              >
                Close
              </button>
            </div>
            <div className="mt-4 text-xs font-bold text-slate-500 uppercase px-4">
              NOTE: This does not replace TRU
            </div>
          </div>
        ) : (
          <>
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
              {Object.values(clients).map((client: Client) => (
                <div
                  key={client.id}
                  className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${currentClientId === client.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{client.name}</span>
                    <button 
                      onClick={() => handleEditClient(client)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400"
                      title="Edit Profile"
                    >
                      <Building2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {client.sales.length} Sales | {client.purchases.length} Purchases
                  </span>
                  <button
                    onClick={() => {
                      setCurrentClientId(client.id);
                      openModal(null);
                    }}
                    className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline text-left"
                  >
                    Select as Active
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
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
