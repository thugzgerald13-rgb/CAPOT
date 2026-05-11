import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useAccounting } from '../../context/AccountingContext';
import { FolderClock } from 'lucide-react';
import { MONTHS, getMonthName } from '../../lib/utils';

export function DatModal() {
  const { currentDat, setCurrentDat, openModal } = useAccounting();
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 10 + i);

  const [selectedMonth, setSelectedMonth] = useState((currentDat?.month || new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState((currentDat?.year || currentYear).toString());

  const handleConfirm = () => {
    setCurrentDat({
      month: parseInt(selectedMonth),
      year: parseInt(selectedYear),
      formatted: `${getMonthName(selectedMonth)} ${selectedYear}`
    });
    // the user flow from the vanilla file automatically transitions to purchases after selecting DAT
    openModal('purchases');
  };

  return (
    <Modal
      id="dat"
      title="DAT File Selection"
      icon={<FolderClock className="w-5 h-5 text-cyan-500" />}
      badge={<span className="bg-cyan-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">Month & Year</span>}
      maxWidth="max-w-md"
    >
      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-center text-white mb-6 shadow-lg">
        <h3 className="text-xl font-bold mb-6">Select DAT File Period</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-left">
            <label className="text-sm font-semibold text-cyan-100 mb-1 block">Month</label>
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
            <label className="text-sm font-semibold text-cyan-100 mb-1 block">Year</label>
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
        
        <p className="text-cyan-100 text-xs mt-4">
          💡 Select the month and year for your purchases.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={handleConfirm}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl transition-colors shadow-sm"
        >
          Confirm & Proceed
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
