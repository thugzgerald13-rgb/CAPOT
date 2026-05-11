import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { Search, Trash2, Receipt, ShoppingCart, FolderClock, History } from 'lucide-react';
import { cn, MONTHS } from '../../lib/utils';

type HistoryTab = 'expenses' | 'income' | 'dat';

export function HistoryModal() {
  const { currentClient, currentClientId, currentDat, saveClient, showToast, openModal, setCurrentDat, historyTab, setHistoryTab } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');

  const activeTab = historyTab as HistoryTab;
  const setActiveTab = (tab: HistoryTab) => setHistoryTab(tab);

  if (!currentClient) return null;

  const TabConfig = {
    expenses: { label: 'Expense History', icon: ShoppingCart, color: 'text-amber-600', bg: 'bg-amber-50' },
    income: { label: 'Income History', icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    dat: { label: 'DAT File History', icon: FolderClock, color: 'text-cyan-600', bg: 'bg-cyan-50' }
  };

  const activeConfig = TabConfig[activeTab];

  const handleDeleteExpense = (id: number) => {
    if (!currentClientId) return;
    const updatedClient = {
      ...currentClient,
      purchases: currentClient.purchases.filter(p => p.id !== id)
    };
    saveClient(currentClientId, updatedClient);
    showToast('Expense deleted');
  };

  const handleDeleteIncome = (id: number) => {
    if (!currentClientId) return;
    const updatedClient = {
      ...currentClient,
      sales: currentClient.sales.filter(s => s.id !== id)
    };
    saveClient(currentClientId, updatedClient);
    showToast('Income deleted');
  };

  const purchases = currentDat ? (currentClient.purchases || []).filter(p => p.datMonthYear === currentDat.formatted) : [];
  const sales = currentDat ? (currentClient.sales || []).filter(s => s.datMonthYear === currentDat.formatted) : [];

  const filteredPurchases = purchases.filter(p => 
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.invoiceNo && p.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSales = sales.filter(s => 
    s.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.ref && s.ref.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.invoiceNo && s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Derive unique DAT periods from transactions
  const allPeriods = Array.from(new Set([
    ...(currentClient.sales || []).map(s => s.datMonthYear),
    ...(currentClient.purchases || []).map(p => p.datMonthYear)
  ])).filter(Boolean);

  const handleSwitchPeriod = (period: string) => {
    const [monthName, yearStr] = period.split(' ');
    const year = parseInt(yearStr);
    const monthIndex = MONTHS.indexOf(monthName);
    if (monthIndex !== -1) {
      setCurrentDat({
        month: monthIndex + 1,
        year,
        formatted: period
      });
      showToast(`Switched to ${period}`);
    }
  };

  return (
    <Modal
      id="history"
      title={activeConfig.label}
      icon={<activeConfig.icon className="w-5 h-5 text-indigo-500" />}
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col gap-6">
        {/* Content Area */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {activeTab !== 'dat' ? (
            <>
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {activeTab === 'expenses' ? 'Expense Records' : activeTab === 'income' ? 'Income Records' : 'DAT File Summary'}
                  {currentDat && (
                    <span className="text-xs font-normal text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                      {currentDat.formatted}
                    </span>
                  )}
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                      <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Date</th>
                      <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Reference</th>
                      <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Account Title</th>
                      <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Name/Entity</th>
                      <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-right">Amount</th>
                      {activeTab === 'expenses' && <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-right">Tax</th>}
                      <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeTab === 'expenses' ? (
                      filteredPurchases.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{p.date}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{p.invoiceNo || '—'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-[10px] uppercase truncate max-w-[120px] inline-block">
                              {p.accountTitle || 'General Expense'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            <div className="font-medium text-slate-700 dark:text-slate-300">{p.supplierName}</div>
                            {p.transactionDetails && (
                              <div className="text-[10px] text-slate-400 italic leading-tight mt-0.5">
                                {p.transactionDetails}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white text-right">
                            ₱{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 text-right">
                            ₱{(p.inputTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => handleDeleteExpense(p.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      filteredSales.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{s.date}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{s.ref || s.invoiceNo || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-400 italic">—</td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{s.buyerName || s.customerName}</td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white text-right">
                            ₱{s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => handleDeleteIncome(s.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                    {((activeTab === 'expenses' && filteredPurchases.length === 0) || (activeTab === 'income' && filteredSales.length === 0)) && (
                      <tr>
                        <td colSpan={activeTab === 'expenses' ? 7 : 6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                          <History className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          <p className="font-medium">No {activeTab} found for this period.</p>
                          <p className="text-xs">Adjust your search or change the DAT File Selection.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                    <FolderClock className="w-4 h-4 text-cyan-500" />
                    Summary List of Purchases (SLP)
                  </h3>
                  {currentDat && (
                    <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full uppercase border border-cyan-100">
                      {currentDat.formatted}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => openModal('dat')}
                  className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Change Period
                </button>
              </div>

              {!currentDat ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <FolderClock className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="font-bold">No DAT Period Selected</p>
                  <p className="text-sm mb-6">Please select a period to view the summary list.</p>
                  <button 
                    onClick={() => openModal('dat')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20"
                  >
                    Select Period Now
                  </button>
                </div>
              ) : purchases.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="font-bold">No Records in {currentDat.formatted}</p>
                  <p className="text-sm">Add some expense entries to see the summary here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-[10px] text-left border-collapse min-w-[1500px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-tighter border-b border-slate-200 dark:border-slate-700">
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-center sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">Month</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-center">Taxpayer TIN</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700">Registered Name</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700">Name of Supplier</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700">Supplier Address</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Gross Purchase</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Exempt Purchase</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Zero-Rated Purchase</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Taxable Purchase</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Purchase Services</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Capital Goods</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Goods Others</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Input Tax</th>
                        <th className="px-2 py-3 text-right">Gross Taxable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {purchases.map((p) => {
                        const isVat = p.vatType === 'vat';
                        const isNonVat = p.vatType === 'non-vat';
                        const isZeroRated = p.vatType === 'zero-rated';
                        const isServices = p.expenseType === 'Services';
                        const isCapital = p.expenseType === 'Capital Goods';
                        const isOthers = p.expenseType === 'Others';

                        const monthNum = currentDat?.month?.toString().padStart(2, '0') || '—';
                        const grossTotal = p.amount + (p.inputTax || 0);

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-center font-bold sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40">{monthNum}</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-center font-mono">{p.supplierTin}</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-slate-400 italic">—</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 font-medium">{p.supplierName}</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-[9px] max-w-[200px] truncate">{p.supplierAddress}</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right font-bold">
                              {grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right text-slate-500">
                              {isNonVat ? p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right text-slate-500">
                              {isZeroRated ? p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right text-slate-500">
                              {isVat ? p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right text-blue-600">
                              {(isVat && isServices) ? p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right text-blue-600">
                              {(isVat && isCapital) ? p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right text-blue-600">
                              {(isVat && isOthers) ? p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right text-indigo-600 font-bold">
                              {(p.inputTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-2 py-2 text-right bg-slate-50 dark:bg-slate-800/20 font-black">
                              {isVat ? grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-black text-slate-700 dark:text-slate-200 border-t-2 border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={5} className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">TOTAL PERIOD SUMMARY:</td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">
                          ₱{purchases.reduce((s, p) => s + p.amount + (p.inputTax || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right font-normal">
                          {purchases.filter(p => p.vatType === 'non-vat').reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right font-normal">
                          {purchases.filter(p => p.vatType === 'zero-rated').reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right font-normal">
                          {purchases.filter(p => p.vatType === 'vat').reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right font-normal">
                          {purchases.filter(p => p.vatType === 'vat' && p.expenseType === 'Services').reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right font-normal">
                          {purchases.filter(p => p.vatType === 'vat' && p.expenseType === 'Capital Goods').reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right font-normal">
                          {purchases.filter(p => p.vatType === 'vat' && p.expenseType === 'Others').reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right text-indigo-600">
                          {purchases.reduce((s, p) => s + (p.inputTax || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 text-right text-indigo-700">
                          {purchases.filter(p => p.vatType === 'vat').reduce((s, p) => s + p.amount + (p.inputTax || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {activeTab !== 'dat' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/50">
              <span className="block text-xs uppercase font-bold text-amber-600 dark:text-amber-400 mb-1">Period Total Expenses</span>
              <span className="text-xl font-black text-amber-700 dark:text-amber-300">
                ₱{purchases.reduce((sum, p) => sum + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
              <span className="block text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1">Period Total Income</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                ₱{sales.reduce((sum, s) => sum + s.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
