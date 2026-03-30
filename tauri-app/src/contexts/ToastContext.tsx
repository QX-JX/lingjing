import { createContext, useContext, ReactNode } from 'react';
import { useToast, ToastType } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, showToast, removeToast } = useToast();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}
