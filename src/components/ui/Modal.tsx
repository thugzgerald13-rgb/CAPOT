import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useAccounting } from '../../context/AccountingContext';

interface ModalProps {
  id: string;
  title: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  maxWidth?: string;
  badge?: ReactNode;
}

export function Modal({ id, title, children, icon, maxWidth = 'max-w-4xl', badge }: ModalProps) {
  const { activeModal, openModal, activeDevice } = useAccounting();
  const isActive = activeModal === id || (id === 'bir-forms' && activeModal?.startsWith('bir-'));
  const isMobile = activeDevice === 'mobile';

  const handleClose = () => openModal(null);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className={cn(
              "w-full bg-white dark:bg-slate-800 flex flex-col overflow-hidden transition-all",
              isMobile 
                ? "h-full max-h-screen rounded-none border-0" 
                : cn("rounded-3xl shadow-2xl max-h-[90vh]", maxWidth)
            )}
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={isMobile ? { type: "tween", duration: 0.25 } : { type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 shrink-0">
              <div className="flex items-center gap-3">
                {icon && <span className="text-xl">{icon}</span>}
                <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {title}
                  {badge}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className={cn("p-4 md:p-6 overflow-y-auto flex-1", isMobile ? "pb-24" : "")}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
