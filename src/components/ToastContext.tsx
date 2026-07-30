import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, title?: string) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const toast = {
    success: useCallback((message: string, title?: string) => addToast(message, 'success', title), [addToast]),
    error: useCallback((message: string, title?: string) => addToast(message, 'error', title), [addToast]),
    info: useCallback((message: string, title?: string) => addToast(message, 'info', title), [addToast]),
    warning: useCallback((message: string, title?: string) => addToast(message, 'warning', title), [addToast]),
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toast }}>
      {children}

      {/* Toast Floating Overlay */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
                t.type === 'success'
                  ? 'bg-emerald-900/90 dark:bg-emerald-950/90 border-emerald-500/40 text-emerald-100 ring-1 ring-emerald-500/20'
                  : t.type === 'error'
                  ? 'bg-rose-900/90 dark:bg-rose-950/90 border-rose-500/40 text-rose-100 ring-1 ring-rose-500/20'
                  : t.type === 'warning'
                  ? 'bg-amber-900/90 dark:bg-amber-950/90 border-amber-500/40 text-amber-100 ring-1 ring-amber-500/20'
                  : 'bg-slate-900/90 dark:bg-slate-900/90 border-slate-700/60 text-slate-100 ring-1 ring-slate-700/30'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {t.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {t.title && <h4 className="text-xs font-extrabold tracking-tight mb-0.5">{t.title}</h4>}
                <p className="text-xs font-medium opacity-90 leading-relaxed break-words">{t.message}</p>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return {
    ...context.toast,
    addToast: context.addToast,
    removeToast: context.removeToast,
    toast: context.toast,
    success: context.toast.success,
    error: context.toast.error,
    info: context.toast.info,
    warning: context.toast.warning,
  };
}
