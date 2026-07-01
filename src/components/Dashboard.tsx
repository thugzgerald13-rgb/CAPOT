import { useAccounting } from '../context/AccountingContext';
import { motion } from 'motion/react';
import { TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';

export function Dashboard() {
  const { currentClient } = useAccounting();

  const totalSales = currentClient?.sales.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalPurchases = currentClient?.purchases.reduce((sum, item) => sum + item.amount, 0) || 0;
  const grossProfit = totalSales - totalPurchases;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-2 relative overflow-hidden"
      >
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center opacity-50 blur-xl"></div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">
          <TrendingUp className="w-4 h-4 text-emerald-500" /> Total Income
        </div>
        <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {formatCurrency(totalSales)}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-2 relative overflow-hidden"
      >
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center opacity-50 blur-xl"></div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">
          <ShoppingBag className="w-4 h-4 text-amber-500" /> Total Expenses
        </div>
        <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {formatCurrency(totalPurchases)}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-2 relative overflow-hidden"
      >
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full flex items-center justify-center opacity-50 blur-xl ${grossProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}></div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">
          <DollarSign className={`w-4 h-4 ${grossProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} /> {grossProfit >= 0 ? 'Profit' : 'Loss'}
        </div>
        <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
          {formatCurrency(grossProfit)}
        </div>
      </motion.div>
    </div>
  );
}
