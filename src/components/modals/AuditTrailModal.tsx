import { useState, useMemo, Fragment } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { 
  Search, ShieldAlert, FileSpreadsheet, Filter, RefreshCw, 
  Terminal, User, CheckCircle2, ChevronDown, ChevronRight, 
  Trash2, AlertTriangle, Play, HelpCircle, FileText, Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import * as XLSX from 'xlsx';

export function AuditTrailModal() {
  const { currentClient, activeModal, openModal, showToast } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (activeModal !== 'audit_trail' || !currentClient) return null;

  const logs = currentClient.auditLogs || [];

  // Toggle log expansion to view diffs
  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // Derive filtering options dynamically
  const uniqueSections = useMemo(() => {
    const sections = logs.map(l => l.section).filter(Boolean);
    return Array.from(new Set(sections));
  }, [logs]);

  const uniqueRoles = useMemo(() => {
    const roles = logs.map(l => l.userRole).filter(Boolean);
    return Array.from(new Set(roles));
  }, [logs]);

  // Combined filtering
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.userEmail && log.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.section.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesSection = sectionFilter === 'all' || log.section === sectionFilter;
      const matchesRole = roleFilter === 'all' || log.userRole === roleFilter;

      return matchesSearch && matchesAction && matchesSection && matchesRole;
    });
  }, [logs, searchTerm, actionFilter, sectionFilter, roleFilter]);

  // Quick statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const additions = logs.filter(l => l.action === 'Add').length;
    const modifications = logs.filter(l => l.action === 'Update').length;
    const deletions = logs.filter(l => l.action === 'Delete').length;
    return { total, additions, modifications, deletions };
  }, [logs]);

  const handleExportExcel = () => {
    if (!filteredLogs.length) {
      showToast('No logs available to export');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const headers = [
      ['AUDIT TRAIL COMPLIANCE LOGS'],
      [`CLIENT: ${currentClient.name}`],
      [`TIN: ${currentClient.tin || 'N/A'}`],
      [`GENERATED: ${new Date().toLocaleString()}`],
      [''],
      ['Timestamp (UTC)', 'User Email', 'User Role', 'Action', 'Module/Section', 'Description Details']
    ];

    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.userEmail,
      log.userRole,
      log.action,
      log.section,
      log.details
    ]);

    const finalData = [...headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);

    // Styling widths
    worksheet['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 60 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Trail');
    XLSX.writeFile(workbook, `AUDIT_LOG_EXPORT_${currentClient.name.replace(/\s+/g, '_')}.xlsx`);
    showToast('Audit trail exported successfully');
  };

  // Helper colors for action pill
  const getActionStyles = (action: string) => {
    switch(action) {
      case 'Add':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-990/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
      case 'Update':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-990/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
      case 'Delete':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-990/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800';
    }
  };

  // Safe JSON formatting helper
  const renderJSONDiff = (label: string, rawData?: string) => {
    if (!rawData) return null;
    try {
      const parsed = JSON.parse(rawData);
      // Clean system fields to keep it compact and readable
      const cleanData = { ...parsed };
      delete cleanData.id;
      delete cleanData.values?.id;

      return (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
          <pre className="text-slate-600 dark:text-slate-300 select-all whitespace-pre-wrap">
            {JSON.stringify(cleanData, null, 2)}
          </pre>
        </div>
      );
    } catch {
      return (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 font-mono text-[11px] leading-relaxed">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
          <pre className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap select-all">{rawData}</pre>
        </div>
      );
    }
  };

  return (
    <Modal
      id="audit_trail"
      title="Audit Trail or compliance logs"
      icon={<ShieldAlert className="w-5 h-5 text-rose-500" />}
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col gap-6">
        
        {/* Compliance Header Warning */}
        <div className="p-4 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/20 dark:to-amber-950/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 bg-rose-100/80 dark:bg-rose-950/50 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Regulatory Compliance & Verification Audit Path</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This log tracks cryptographic changes, additions, and deletions made to all ledger books, journals, and transaction suites (CRJ, CDJ, PJ, GJ, SLS, SLP). Compliant with national auditing criteria and corporate compliance guidelines. Logs once committed cannot be revised or deleted.
            </p>
          </div>
        </div>

        {/* Analytics Bento Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Logged Actions</span>
            <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">{stats.total}</div>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-1">
            <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Additions</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">+{stats.additions}</div>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-1">
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Modifications</span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">~{stats.modifications}</div>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-1">
            <span className="text-xs font-semibold text-rose-500 uppercase tracking-wide">Record Deletions</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">-{stats.deletions}</div>
          </div>
        </div>

        {/* Filters Controls Panel */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by description, module, user email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            {/* Filter by Action */}
            <div className="flex flex-col gap-1 shrink-0 w-32">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-700 dark:text-slate-300"
              >
                <option value="all">⚡ All Actions</option>
                <option value="Add">Add</option>
                <option value="Update">Update</option>
                <option value="Delete">Delete</option>
              </select>
            </div>

            {/* Filter by Section */}
            <div className="flex flex-col gap-1 shrink-0 w-40">
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-700 dark:text-slate-300"
              >
                <option value="all">📂 All Modules</option>
                {uniqueSections.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>

            {/* Filter by User Role */}
            <div className="flex flex-col gap-1 shrink-0 w-36">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-700 dark:text-slate-300"
              >
                <option value="all">👤 All Roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Excel Export */}
            <button 
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              title="Export filtered compliance audit trail to Excel file"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Database List / Table of Logs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="w-10 px-4 py-3"></th>
                  <th className="px-4 py-3 w-40">Timestamp</th>
                  <th className="px-4 py-3 w-44">User Entity</th>
                  <th className="px-4 py-3 w-28 text-center">Action</th>
                  <th className="px-4 py-3 w-36">Module</th>
                  <th className="px-4 py-3">Audit Trails Description Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const hasDiff = log.originalData || log.newData;

                  return (
                    <Fragment key={log.id}>
                      <tr 
                        onClick={() => hasDiff && toggleExpand(log.id)}
                        className={cn(
                          "hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all text-xs text-slate-600 dark:text-slate-300",
                          hasDiff ? "cursor-pointer group" : "",
                          isExpanded ? "bg-blue-50/20 dark:bg-slate-800/40" : ""
                        )}
                      >
                        <td className="px-4 py-3.5 text-center">
                          {hasDiff && (
                            <div>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] whitespace-nowrap text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          <span className="block text-[9px] text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate max-w-[140px]" title={log.userEmail}>
                              <span className="font-semibold block truncate">{log.userEmail.split('@')[0]}</span>
                              <span className="text-[9px] text-slate-400 truncate block">{log.userRole || 'Staff'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold block w-max mx-auto shadow-sm tracking-wider uppercase", getActionStyles(log.action))}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-wide">
                            {log.section}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 leading-relaxed font-medium text-slate-700 dark:text-slate-200">
                          {log.details}
                          {hasDiff && !isExpanded && (
                            <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase select-none">
                              DIFF DETECTED
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Diff Expander Pane */}
                      {isExpanded && hasDiff && (
                        <tr className="bg-slate-50/30 dark:bg-slate-900/10">
                          <td colSpan={6} className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <Terminal className="w-4 h-4 text-slate-400" />
                                <span>Regulatory Ledger Modification Audit Registry Details</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {log.originalData ? renderJSONDiff('Previous Ledger State (Pre-modifications)', log.originalData) : (
                                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1">
                                    <Info className="w-5 h-5 opacity-40 mb-1" />
                                    <span>No Previous Data</span>
                                    <span className="text-[10px] opacity-80">This transaction was created as a new entry.</span>
                                  </div>
                                )}
                                {log.newData ? renderJSONDiff('Committed Ledger State (Post-modifications)', log.newData) : (
                                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1">
                                    <Info className="w-5 h-5 opacity-40 mb-1" />
                                    <span>Entry Deleted</span>
                                    <span className="text-[10px] opacity-80">This transaction reference was permanently removed from ledger books.</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-slate-400 dark:text-slate-500">
                      <Terminal className="w-12 h-12 mx-auto mb-4 opacity-15" />
                      <p className="font-bold text-sm">No Compliance Audit Logs Registered</p>
                      <p className="text-xs max-w-sm mx-auto mt-1">Adjust your search parameters/filters or create entries in any journal books to populate logs.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Modal>
  );
}
