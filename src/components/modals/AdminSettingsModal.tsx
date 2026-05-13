import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { useAuth } from '../../context/AuthContext';

export function AdminSettingsModal() {
  const { currentClient } = useAccounting();
  const { isAdmin } = useAuth();
  
  if (!isAdmin) return null;

  return (
    <Modal id="admin-settings" title="Developer System Config" icon={<ShieldAlert className="text-emerald-500" />}>
      <div className="p-6">
        <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">Superuser Dashboard</h3>
        
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
            You are logged in as the primary developer. Soon, this panel will allow you to manage global users, configure Firebase database rules, view global usage limits, and monitor system health.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2">Current Active Client Context</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {currentClient ? currentClient.id : 'No client selected'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Data structure is currently stored in LocalStorage but will soon migrate to Firestore under `/clients/${currentClient?.id || 'CLIENT_ID'}`.
            </p>
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
