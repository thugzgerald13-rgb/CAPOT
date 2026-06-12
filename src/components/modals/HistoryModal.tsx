import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { Search, Trash2, Receipt, ShoppingCart, FolderClock, History, FileDown, FileSpreadsheet } from 'lucide-react';
import { cn, MONTHS, generateCSV, formatTIN } from '../../lib/utils';
import * as XLSX from 'xlsx';

type HistoryTab = 'expenses' | 'income' | 'slp' | 'sls';

export function HistoryModal() {
  const { currentClient, currentClientId, currentDat, saveClient, showToast, openModal, setCurrentDat, historyTab, setHistoryTab } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDat?.month || new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDat?.year || new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i);

  useEffect(() => {
    if (currentDat) {
      setSelectedMonth(currentDat.month);
      setSelectedYear(currentDat.year);
    }
  }, [currentDat]);

  const handleLoadPeriod = () => {
    const formatted = `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
    setCurrentDat({
      month: selectedMonth,
      year: selectedYear,
      formatted
    });
    showToast(`Loaded data for ${formatted}`);
  };

  const activeTab = historyTab as HistoryTab;
  const setActiveTab = (tab: HistoryTab) => setHistoryTab(tab);

  if (!currentClient) return null;

  const TabConfig = {
    expenses: { label: 'Expense History', icon: ShoppingCart, color: 'text-amber-600', bg: 'bg-amber-50' },
    income: { label: 'Income History', icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    slp: { label: 'Summary List of Purchases (SLP)', icon: FolderClock, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    sls: { label: 'Summary List of Sales (SLS)', icon: FolderClock, color: 'text-indigo-600', bg: 'bg-indigo-50' }
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

  const handleExportSLP = () => {
    if (!purchases.length || !currentDat || !currentClient) return;

    const workbook = XLSX.utils.book_new();
    
    // Header Info as shown in image
    const headerRows = [
      ['PURCHASE TRANSACTION'],
      ['RECONCILIATION OF LISTING FOR ENFORCEMENT'],
      [''],
      [`TIN : ${currentClient.tin || ''}`],
      [`OWNER'S NAME : ${currentClient.proprietor || currentClient.name}`],
      [`OWNER'S TRADE NAME : ${currentClient.name}`],
      [`OWNER'S ADDRESS : ${currentClient.address || ''}`],
      [''],
      [
        '(1) TAXABLE MONTH', 
        '(2) TAXPAYER IDENTIFICATION NUMBER', 
        '(3) REGISTERED NAME', 
        '(4) NAME OF SUPPLIER (Last Name, First Name, Middle Name)', 
        '(5) SUPPLIER\'S ADDRESS', 
        '(6) AMOUNT OF GROSS PURCHASE', 
        '(7) AMOUNT OF EXEMPT PURCHASE', 
        '(8) AMOUNT OF ZERO-RATED PURCHASE', 
        '(9) AMOUNT OF TAXABLE PURCHASE', 
        '(10) AMOUNT OF PURCHASE OF SERVICES', 
        '(11) AMOUNT OF PURCHASE OF CAPITAL GOODS', 
        '(12) AMOUNT OF PURCHASE OF GOODS OTHER THAN CAPITAL GOODS', 
        '(13) AMOUNT OF INPUT TAX', 
        '(14) AMOUNT OF GROSS TAXABLE PURCHASE'
      ]
    ];
    
    const dataRows = purchases.map(p => {
      const isVat = p.vatType === 'vat';
      const isNonVat = p.vatType === 'non-vat';
      const isZeroRated = p.vatType === 'zero-rated';
      const isServices = p.expenseType === 'Services';
      const isCapital = p.expenseType === 'Capital Goods';
      const isOthers = p.expenseType === 'Others';
      const grossTotal = p.amount + (p.inputTax || 0);
      
      const monthStr = p.date.split('/')[0] + '/' + p.date.split('/')[1] + '/' + p.date.split('/')[2];
      
      return [
        monthStr,
        p.supplierTin,
        '',
        p.supplierName,
        p.supplierAddress,
        grossTotal,
        isNonVat ? p.amount : 0,
        isZeroRated ? p.amount : 0,
        isVat ? p.amount : 0,
        (isVat && isServices) ? p.amount : 0,
        (isVat && isCapital) ? p.amount : 0,
        (isVat && isOthers) ? p.amount : 0,
        p.inputTax || 0,
        isVat ? grossTotal : 0
      ];
    });

    const totalRow = [
      'Grand Total :', '', '', '', '',
      purchases.reduce((s, p) => s + p.amount + (p.inputTax || 0), 0),
      purchases.filter(p => p.vatType === 'non-vat').reduce((s, p) => s + p.amount, 0),
      purchases.filter(p => p.vatType === 'zero-rated').reduce((s, p) => s + p.amount, 0),
      purchases.filter(p => p.vatType === 'vat').reduce((s, p) => s + p.amount, 0),
      purchases.filter(p => p.vatType === 'vat' && p.expenseType === 'Services').reduce((s, p) => s + p.amount, 0),
      purchases.filter(p => p.vatType === 'vat' && p.expenseType === 'Capital Goods').reduce((s, p) => s + p.amount, 0),
      purchases.filter(p => p.vatType === 'vat' && p.expenseType === 'Others').reduce((s, p) => s + p.amount, 0),
      purchases.reduce((s, p) => s + (p.inputTax || 0), 0),
      purchases.filter(p => p.vatType === 'vat').reduce((s, p) => s + p.amount + (p.inputTax || 0), 0)
    ];

    const finalData = [...headerRows, ...dataRows, totalRow, [''], ['END OF REPORT']];
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 40 }, { wch: 40 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'SLP');
    XLSX.writeFile(workbook, `SLP_${currentDat.formatted.replace(' ', '_')}.xlsx`);
  };

  const handleExportSLS = () => {
    if (!sales.length || !currentDat || !currentClient) return;

    const workbook = XLSX.utils.book_new();
    
    const headerRows = [
      ['SALES TRANSACTION'],
      ['RECONCILIATION OF LISTING FOR ENFORCEMENT'],
      [''],
      [`TIN : ${currentClient.tin || ''}`],
      [`OWNER'S NAME : ${currentClient.proprietor || currentClient.name}`],
      [`OWNER'S TRADE NAME : ${currentClient.name}`],
      [`OWNER'S ADDRESS : ${currentClient.address || ''}`],
      [''],
      [
        '(1) TAXABLE MONTH',
        '(2) TAXPAYER IDENTIFICATION NUMBER',
        '(3) REGISTERED NAME',
        '(4) NAME OF CUSTOMER',
        '(5) CUSTOMER ADDRESS',
        '(6) AMOUNT OF GROSS SALES',
        '(7) AMOUNT OF EXEMPT SALES',
        '(8) AMOUNT OF ZERO-RATED SALES',
        '(9) AMOUNT OF TAXABLE SALES',
        '(10) AMOUNT OF OUTPUT TAX',
        '(11) AMOUNT OF GROSS TAXABLE SALES'
      ]
    ];
    
    const dataRows = sales.map(s => {
      const outputTax = s.amount * 0.12; 
      const grossTotal = s.amount + outputTax;
      
      return [
        s.date,
        s.buyerTin || '',
        '',
        s.buyerName || s.customerName,
        s.buyerAddress || s.customerAddress || '',
        grossTotal,
        0,
        0,
        s.amount,
        outputTax,
        grossTotal
      ];
    });

    const totalRow = [
      'Grand Total :', '', '', '', '',
      sales.reduce((sum, s) => sum + s.amount + (s.amount * 0.12), 0),
      0,
      0,
      sales.reduce((sum, s) => sum + s.amount, 0),
      sales.reduce((sum, s) => sum + (s.amount * 0.12), 0),
      sales.reduce((sum, s) => sum + s.amount + (s.amount * 0.12), 0)
    ];

    const finalData = [...headerRows, ...dataRows, totalRow, [''], ['END OF REPORT']];
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);
    
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 40 }, { wch: 40 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'SLS');
    XLSX.writeFile(workbook, `SLS_${currentDat.formatted.replace(' ', '_')}.xlsx`);
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
          {!['slp', 'sls'].includes(activeTab) ? (
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
                      {activeTab === 'expenses' ? (
                        <>
                          <th className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">Date</th>
                          <th className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">Invoice No.</th>
                          <th className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 text-left">Supplier Info</th>
                          <th className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 text-left">Payment</th>
                          <th className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 text-left">Classification</th>
                          <th className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 text-right whitespace-nowrap">Gross Amount</th>
                          <th className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 text-right whitespace-nowrap">Net Amount</th>
                          <th className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 text-right whitespace-nowrap">Input Tax</th>
                          <th className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 w-12 sticky right-0 bg-white dark:bg-slate-900 z-10"></th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Date</th>
                          <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Reference</th>
                          <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Account Title</th>
                          <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">Name/Entity</th>
                          <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-right">Amount</th>
                          <th className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 w-16 sticky right-0 bg-white dark:bg-slate-900 z-10"></th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeTab === 'expenses' ? (
                      filteredPurchases.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 align-top whitespace-nowrap">{p.date}</td>
                          <td className="px-3 py-3 text-xs font-medium text-slate-800 dark:text-slate-200 align-top whitespace-nowrap">{p.invoiceNo || p.referenceNo || '—'}</td>
                          
                          <td className="px-3 py-3 text-xs align-top">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{p.supplierName}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">TIN: {p.supplierTin || '—'}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 max-w-[180px] truncate" title={p.supplierAddress}>{p.supplierAddress || '—'}</div>
                            {p.transactionDetails && (
                              <div className="text-[10px] text-indigo-500/80 italic leading-tight mt-1">Note: {p.transactionDetails}</div>
                            )}
                          </td>

                          <td className="px-3 py-3 text-xs align-top">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                              {p.paymentMethod || '—'}
                            </span>
                            {p.paymentMethod === 'Check' && p.checkNumber && (
                              <div className="text-[10px] text-slate-500 font-mono mt-1 w-max">
                                {p.bankName ? `${p.bankName} - ` : ''}# {p.checkNumber}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-3 text-xs align-top">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-[9px] uppercase max-w-[140px] truncate" title={p.accountTitle}>
                                {p.accountTitle || 'General Expense'}
                              </span>
                              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold uppercase">{p.vatType || '—'}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-semibold uppercase">{p.expenseType || '—'}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-3 text-sm font-bold text-amber-600 dark:text-amber-400 text-right align-top whitespace-nowrap bg-amber-50/30 dark:bg-amber-900/10">
                            ₱{(p.amount + (p.inputTax || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-slate-900 dark:text-white text-right align-top whitespace-nowrap">
                            ₱{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 text-sm text-blue-600 dark:text-blue-400 text-right align-top whitespace-nowrap">
                            ₱{(p.inputTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 text-center align-top sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 z-10 border-l border-slate-100 dark:border-slate-800">
                            <button 
                              onClick={() => handleDeleteExpense(p.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Delete Entry"
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
                        <td colSpan={activeTab === 'expenses' ? 9 : 6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
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
          ) : activeTab === 'slp' ? (
            <div className="flex flex-col">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                    <FolderClock className="w-4 h-4 text-cyan-500" />
                    Summary List of Purchases (SLP)
                  </h3>
                  <div className="flex items-center gap-2">
                    <select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 min-w-[100px]"
                    >
                      {MONTHS.map((m, idx) => (
                        <option key={m} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                    <select 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleLoadPeriod}
                      className="px-3 py-1.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Load
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {purchases.length > 0 && (
                    <button 
                      onClick={handleExportSLP}
                      className="px-3 py-1.5 text-xs font-bold bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-3 h-3" /> Export Excel
                    </button>
                  )}
                </div>
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
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-center sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 leading-tight">TAXABLE<br/>MONTH</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-center leading-tight">TAXPAYER<br/>IDENTIFICATION<br/>NUMBER</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 leading-tight">REGISTERED NAME</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 leading-tight">NAME OF SUPPLIER<br/>(Last Name, First Name, Middle Name)</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 leading-tight">SUPPLIER'S ADDRESS</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right leading-tight">AMOUNT OF<br/>GROSS PURCHASE</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right leading-tight">AMOUNT OF<br/>EXEMPT PURCHASE</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right leading-tight">AMOUNT OF<br/>ZERO-RATED PURCHASE</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right leading-tight">AMOUNT OF<br/>TAXABLE PURCHASE</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right leading-tight">AMOUNT OF<br/>PURCHASE OF SERVICES</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right leading-tight">AMOUNT OF<br/>PURCHASE OF CAPITAL GOODS</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right leading-tight">AMOUNT OF PURCHASE OF GOODS<br/>OTHER THAN CAPITAL GOODS</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right leading-tight">AMOUNT OF<br/>INPUT TAX</th>
                        <th className="px-2 py-3 text-right leading-tight">AMOUNT OF<br/>GROSS TAXABLE PURCHASE</th>
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
          ) : (
            <div className="flex flex-col">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                    <FolderClock className="w-4 h-4 text-indigo-500" />
                    Summary List of Sales (SLS)
                  </h3>
                  <div className="flex items-center gap-2">
                    <select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 min-w-[100px]"
                    >
                      {MONTHS.map((m, idx) => (
                        <option key={m} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                    <select 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleLoadPeriod}
                      className="px-3 py-1.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Load
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sales.length > 0 && (
                    <button 
                      onClick={handleExportSLS}
                      className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-3 h-3" /> Export Excel
                    </button>
                  )}
                </div>
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
              ) : sales.length === 0 ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="font-bold">No Records in {currentDat.formatted}</p>
                  <p className="text-sm">Add some income entries to see the summary here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-[10px] text-left border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-tighter border-b border-slate-200 dark:border-slate-700">
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-center sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">Month</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-center">Taxpayer TIN</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700">Registered Name</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700">Name of Customer</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700">Customer Address</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Gross Sales</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Exempt Sales</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Zero-Rated Sales</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Taxable Sales</th>
                        <th className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Output Tax</th>
                        <th className="px-2 py-3 text-right">Gross Taxable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sales.map((s) => {
                        // Assuming 12% output tax for Taxable Sales
                        // We will need to compute this better if we store more details
                        const isVat = true; // simplified
                        const outputTax = s.amount * 0.12; 
                        const grossTotal = s.amount + outputTax;
                        const monthNum = currentDat?.month?.toString().padStart(2, '0') || '—';

                        return (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-center font-bold sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40">{monthNum}</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-center font-mono">{s.buyerTin || '—'}</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-slate-400 italic">—</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 font-medium">{s.buyerName || s.customerName}</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-[9px] max-w-[200px] truncate">{s.buyerAddress || s.customerAddress || '—'}</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right font-bold">
                              {grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right text-slate-500">0.00</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right text-slate-500">0.00</td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right text-slate-500">
                              {s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-800 text-right text-indigo-600 font-bold">
                              {outputTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-2 py-2 text-right bg-slate-50 dark:bg-slate-800/20 font-black">
                              {grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-black text-slate-700 dark:text-slate-200 border-t-2 border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={5} className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">TOTAL PERIOD SUMMARY:</td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right">
                          ₱{sales.reduce((sum, s) => sum + s.amount + (s.amount * 0.12), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right font-normal">0.00</td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right font-normal">0.00</td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right font-normal">
                          {sales.reduce((sum, s) => sum + s.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-200 dark:border-slate-700 text-right text-indigo-600">
                          {sales.reduce((sum, s) => sum + (s.amount * 0.12), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-3 text-right text-indigo-700">
                          {sales.reduce((sum, s) => sum + s.amount + (s.amount * 0.12), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
        {!['slp', 'sls'].includes(activeTab) && (
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
