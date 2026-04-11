import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { ToastState } from '../types';

interface ToastProps {
  toast: ToastState;
}

export default function Toast({ toast }: ToastProps) {
  return (
    <AnimatePresence>
      {toast.visible && (
        <motion.div
          initial={{ y: 20, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: 20, opacity: 0, x: '-50%' }}
          className="fixed bottom-8 left-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-medium shadow-2xl z-[200] flex items-center gap-3"
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <span>{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
