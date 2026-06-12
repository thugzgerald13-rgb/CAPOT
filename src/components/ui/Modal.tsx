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
  const { activeModal, openModal } = useAccounting();
  const isActive = activeModal === id;

  const handleClose = () => openModal(null);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-1.5 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className={cn(
              "w-full bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[96vh] sm:max-h-[90vh]",
              maxWidth
            )}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                {icon && <span className="text-lg sm:text-xl">{icon}</span>}
                <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-3">
                  {title}
                  {badge}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-3 sm:p-6 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
