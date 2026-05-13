import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { AnimatePresence, motion } from 'motion/react';
import { SalesModal } from './components/modals/SalesModal';
import { PurchasesModal } from './components/modals/PurchasesModal';
import { DatModal } from './components/modals/DatModal';
import { TinLibraryModal } from './components/modals/TinLibraryModal';
import { HistoryModal } from './components/modals/HistoryModal';
import { ChartOfAccountsModal } from './components/modals/ChartOfAccountsModal';
import { CashReceiptsJournalModal } from './components/modals/CashReceiptsJournalModal';
import { CashDisbursementsJournalModal } from './components/modals/CashDisbursementsJournalModal';
import { PurchasesJournalModal } from './components/modals/PurchasesJournalModal';
import { GeneralJournalModal } from './components/modals/GeneralJournalModal';
import { GeneralLedgerModal } from './components/modals/GeneralLedgerModal';
import { ProfitAndLossModal } from './components/modals/ProfitAndLossModal';
import { ExtraModals } from './components/modals/ExtraModals';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthContainer } from './components/AuthContainer';

function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { toastMsg } = useAccounting();

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full relative">
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <Dashboard />
        </div>

        {/* Global Toast */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, scale: 0.9, x: '-50%' }}
              className="fixed bottom-6 left-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full font-semibold shadow-xl shadow-emerald-500/20 z-50 flex items-center gap-2"
            >
              ✓ {toastMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Declarations */}
        <DatModal />
        <SalesModal />
        <PurchasesModal />
        <TinLibraryModal />
        <HistoryModal />
        <ChartOfAccountsModal />
        <CashReceiptsJournalModal />
        <CashDisbursementsJournalModal />
        <PurchasesJournalModal />
        <GeneralJournalModal />
        <GeneralLedgerModal />
        <ProfitAndLossModal />
        <ExtraModals />
      </main>
    </div>
  );
}

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthContainer />;
  }

  return (
    <AccountingProvider>
      <AppLayout />
    </AccountingProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}