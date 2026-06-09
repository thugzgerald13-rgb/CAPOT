import React, { useEffect, useState } from 'react';
import { ShieldAlert, Download, Users, RefreshCw, Mail, Calendar } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  userRole?: string;
  lastLogin?: any;
  updatedAt?: any;
}

export function AdminSettingsModal() {
  const { currentClient } = useAccounting();
  const { isAdmin, userRole, setUserRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(userList);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleBackup = () => {
    const dataStr = JSON.stringify(users, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `capotbooks_users_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClientBackup = () => {
    if (!currentClient) {
      alert("No active client selected to backup.");
      return;
    }

    const snapshot = {
      backupType: "client_data_snapshot",
      timestamp: new Date().toISOString(),
      client: {
        id: currentClient.id,
        name: currentClient.name,
        tin: currentClient.tin || "",
        taxpayerClassification: currentClient.taxpayerClassification || "",
        registeredName: currentClient.registeredName || "",
        tradeName: currentClient.tradeName || "",
        accountingType: currentClient.accountingType || "Calendar",
        coaFormat: currentClient.coaFormat || "numeric",
        
        accounts: currentClient.accounts || [],
        sales: currentClient.sales || [],
        purchases: currentClient.purchases || [],
        expenses: currentClient.expenses || [],
        
        crjColumns: currentClient.crjColumns || [],
        crjEntries: currentClient.crjEntries || [],
        cdjColumns: currentClient.cdjColumns || [],
        cdjEntries: currentClient.cdjEntries || [],
        pjColumns: currentClient.pjColumns || [],
        pjEntries: currentClient.pjEntries || [],
        gjColumns: currentClient.gjColumns || [],
        gjEntries: currentClient.gjEntries || [],
        glAccounts: currentClient.glAccounts || [],
        plData: currentClient.plData || null,
        
        tinLibrary: currentClient.tinLibrary || { customers: [], suppliers: [] }
      }
    };

    const dataStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const safeName = currentClient.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    link.download = `capotbooks_backup_${safeName}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (!isAdmin) return null;

  return (
    <Modal id="admin-settings" title="Developer System Config" icon={<ShieldAlert className="text-emerald-500" />}>
      <div className="p-6 overflow-y-auto max-h-[80vh]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Superuser Dashboard</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage users, adjust active view contexts, and perform backups.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={handleBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Backup Firebase users directory"
            >
              <Users className="w-3.5 h-3.5" />
              Backup Directory
            </button>
            <button 
              onClick={handleClientBackup}
              disabled={!currentClient}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
              title="Backup current active client and transaction histories"
            >
              <Download className="w-4 h-4" />
              Backup Data
            </button>
          </div>
        </div>
        
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-8">
          <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium mb-4">
            Authorized Developer: thugz.gerald13@gmail.com
          </p>
          
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
              Current Active View:
            </label>
            <select 
              value={userRole || ''} 
              onChange={(e) => setUserRole(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="owner">Business Owner</option>
              <option value="accountant">Accountant / Bookkeeper</option>
            </select>
          </div>
        </div>

        {/* User List Table */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200">Registered Users ({users.length})</h4>
            </div>
            <button 
              onClick={fetchUsers}
              className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">User</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">Role</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 text-right">Last Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          {u.displayName || 'Anonymous'}
                          {u.email === 'thugz.gerald13@gmail.com' && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[10px] px-1 rounded border border-amber-200">DEV</span>}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {u.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.userRole === 'owner' ? 'bg-cyan-100 text-cyan-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {u.userRole || 'Not Set'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400 tabular-nums">
                      <div className="flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        {u.lastLogin?.toDate ? u.lastLogin.toDate().toLocaleString() : 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                      No users synchronized with central database yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800 flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 dark:text-slate-200">Current Active Client Context</h4>
              <div className="space-y-1">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-400 mr-2">Client ID:</span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{currentClient ? currentClient.id : 'No client selected'}</span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-400 mr-2">Client Name:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{currentClient ? currentClient.name : 'N/A'}</span>
                </p>
                {currentClient && (
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 space-y-1">
                    <p>Accounts in COA: <strong>{(currentClient.accounts || []).length}</strong></p>
                    <p>Total Business Sales: <strong>{(currentClient.sales || []).length}</strong></p>
                    <p>Total Purchases: <strong>{(currentClient.purchases || []).length}</strong></p>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Data structure is currently stored in LocalStorage but will soon migrate to Firestore under `/clients/${currentClient?.id || 'CLIENT_ID'}`.
              </p>
            </div>
            {currentClient && (
              <button
                onClick={handleClientBackup}
                className="w-full flex items-center justify-center gap-2 mt-4 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-150 dark:border-indigo-900/40 rounded-lg text-xs font-bold transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                Download JSON Backup for {currentClient.name}
              </button>
            )}
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2">System Status</h4>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
              Local Database Active
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              Firebase Auth Active
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-2">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Firestore Migration Pending
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
