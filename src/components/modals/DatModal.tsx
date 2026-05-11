import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { FolderClock, FileDown } from 'lucide-react';
import { MONTHS, getMonthName, generateCSV } from '../../lib/utils';

export function DatModal() {
  const { currentDat, setCurrentDat, openModal, currentClient, showToast } = useAccounting();
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 10 + i);

  const [selectedMonth, setSelectedMonth] = useState((currentDat?.month || new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState((currentDat?.year || currentYear).toString());

  const handleConfirm = () => {
    const formatted = `${getMonthName(selectedMonth)} ${selectedYear}`;
    setCurrentDat({
      month: parseInt(selectedMonth),
      year: parseInt(selectedYear),
      formatted
    });
    // the user flow from the vanilla file automatically transitions to purchases after selecting DAT
    openModal('purchases');
  };

  const handleGenerateDAT = () => {
    if (!currentClient) return;

    const formatted = `${getMonthName(selectedMonth)} ${selectedYear}`;
    const periodMonth = parseInt(selectedMonth);
    const periodYear = parseInt(selectedYear);

    const periodSales = (currentClient.sales || []).filter(s => s.datMonthYear === formatted);
    const periodPurchases = (currentClient.purchases || []).filter(p => p.datMonthYear === formatted);

    if (periodSales.length === 0 && periodPurchases.length === 0) {
      alert(`No transactions found for ${formatted}`);
      return;
    }

    let csvRows = [];
    csvRows.push(['RELIEF SYSTEM DAT FILE SUMMARY']);
    csvRows.push(['Client Name', currentClient.name]);
    csvRows.push(['Taxpayer TIN', currentClient.tin || '']);
    csvRows.push(['Period', formatted]);
    csvRows.push(['Generated At', new Date().toLocaleString()]);
    csvRows.push([]);

    // Sales Section
    csvRows.push(['--- INCOME / SALES ---']);
    csvRows.push(['Date', 'Invoice #', 'Customer TIN', 'Customer Name', 'Amount', 'Output Tax']);
    let totalSalesAmt = 0;
    let totalSalesTax = 0;
    periodSales.forEach(s => {
      totalSalesAmt += s.amount;
      totalSalesTax += s.outputTax;
      csvRows.push([s.date, s.invoiceNo, s.customerTin, s.customerName, s.amount.toFixed(2), s.outputTax.toFixed(2)]);
    });
    csvRows.push(['TOTAL INCOME', '', '', '', totalSalesAmt.toFixed(2), totalSalesTax.toFixed(2)]);
    csvRows.push([]);

    // Purchases Section
    csvRows.push(['--- EXPENSES / PURCHASES ---']);
    csvRows.push(['Date', 'Invoice #', 'Supplier TIN', 'Supplier Name', 'Amount', 'Input Tax']);
    let totalPurchasesAmt = 0;
    let totalPurchasesTax = 0;
    periodPurchases.forEach(p => {
      totalPurchasesAmt += p.amount;
      totalPurchasesTax += (p.inputTax || 0);
      csvRows.push([p.date, p.invoiceNo || '', p.supplierTin || '', p.supplierName, p.amount.toFixed(2), (p.inputTax || 0).toFixed(2)]);
    });
    csvRows.push(['TOTAL EXPENSES', '', '', '', totalPurchasesAmt.toFixed(2), totalPurchasesTax.toFixed(2)]);

    generateCSV(`DAT_${formatted.replace(/ /g, '_')}_${currentClient.name.replace(/ /g, '_')}.csv`, csvRows);
    showToast(`DAT File generated for ${formatted}`);
  };

  return (
    <Modal
      id="dat"
      title="DAT File Selection"
      icon={<FolderClock className="w-5 h-5 text-cyan-500" />}
      maxWidth="max-w-md"
    >
      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-center text-white mb-6 shadow-lg">
        <h3 className="text-xl font-bold mb-6">Select DAT File Period</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-left">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 border-none outline-none font-medium"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="text-left">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 border-none outline-none font-medium"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white/20 rounded-full px-4 py-2 inline-block font-semibold backdrop-blur-sm shadow-inner mt-2">
          Current: {getMonthName(selectedMonth)} {selectedYear}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleConfirm}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl transition-colors shadow-sm"
        >
          Confirm & Proceed
        </button>
        <button
          onClick={handleGenerateDAT}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <FileDown className="w-5 h-5" /> Generate DAT File
        </button>
        <button
          onClick={() => openModal(null)}
          className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-3 rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
