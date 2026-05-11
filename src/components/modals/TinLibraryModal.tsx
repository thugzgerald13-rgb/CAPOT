import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { formatTIN } from '../../lib/utils';
import { Building2, Search, Trash2, Plus, Users, Factory } from 'lucide-react';
import { cn } from '../../lib/utils';

export function TinLibraryModal() {
  const { currentClient, currentClientId, saveClient, showToast } = useAccounting();
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  
  // Forms
  const [tin, setTin] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const lib = currentClient?.tinLibrary || { customers: [], suppliers: [] };
  const records = activeTab === 'customers' ? lib.customers : lib.suppliers;

  const filtered = records.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.tin.includes(searchTerm)
  );

  const handleAdd = () => {
    if (!currentClient || !currentClientId) return;
    if (!tin || !name) {
      alert('TIN and Name are required');
      return;
    }
    if (tin.length !== 11) {
      alert('TIN must be 9 digits format (XXX-XXX-XXX)');
      return;
    }

    const newRecord = { id: Date.now(), tin, name, address };
    const updatedLib = { ...lib };
    
    if (activeTab === 'customers') {
      updatedLib.customers = [...updatedLib.customers, newRecord];
    } else {
      updatedLib.suppliers = [...updatedLib.suppliers, newRecord];
    }

    saveClient(currentClientId, { ...currentClient, tinLibrary: updatedLib });
    showToast(`Added to ${activeTab} library`);
    setTin('');
    setName('');
    setAddress('');
  };

  const handleDelete = (id: number) => {
     if (!currentClient || !currentClientId) return;
     const updatedLib = { ...lib };
     if (activeTab === 'customers') {
       updatedLib.customers = updatedLib.customers.filter(c => c.id !== id);
     } else {
       updatedLib.suppliers = updatedLib.suppliers.filter(s => s.id !== id);
     }
     saveClient(currentClientId, { ...currentClient, tinLibrary: updatedLib });
     showToast('Record deleted');
  };

  return (
    <Modal
      id="tinlibrary"
      title="TIN Library"
      icon={<Building2 className="w-5 h-5 text-purple-500" />}
      badge={<span className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">Directory</span>}
    >
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('customers')}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all",
            activeTab === 'customers' ? "bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-purple-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Users className="w-4 h-4" /> Customers
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all",
            activeTab === 'suppliers' ? "bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-purple-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Factory className="w-4 h-4" /> Suppliers
        </button>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div>
           <label className="form-label">TIN</label>
           <input type="text" value={tin} onChange={e => setTin(formatTIN(e.target.value))} placeholder="000-000-000" maxLength={11} className="form-input font-mono" />
        </div>
        <div className="flex-1">
           <label className="form-label">{activeTab === 'customers' ? 'Customer' : 'Supplier'} Name</label>
           <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Company or Full Name" className="form-input" />
        </div>
        {activeTab === 'suppliers' && (
          <div className="flex-1">
             <label className="form-label">Address</label>
             <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Business Address" className="form-input" />
          </div>
        )}
        <button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-2 h-[42px]">
          <Plus className="w-5 h-5" /> Add
        </button>
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize">{activeTab} Registry</h4>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
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
                <th>TIN</th>
                <th>Entity Name</th>
                {activeTab === 'suppliers' && <th>Address</th>}
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                  <td className="font-mono text-sm font-semibold">{record.tin}</td>
                  <td className="font-medium">{record.name}</td>
                  {activeTab === 'suppliers' && <td className="text-xs text-slate-500">{record.address || '—'}</td>}
                  <td className="text-center">
                    <button 
                      onClick={() => handleDelete(record.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'suppliers' ? 4 : 3} className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No registry entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
