import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warn' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let externalAdd: ((type: ToastType, message: string) => void) | null = null;

// Global singleton — call toast.success/error/warn from anywhere without prop-drilling
export const toast = {
  success: (message: string) => externalAdd?.('success', message),
  error:   (message: string) => externalAdd?.('error',   message),
  warn:    (message: string) => externalAdd?.('warn',    message),
  info:    (message: string) => externalAdd?.('info',    message),
};

export function useToastStore() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => {
      // max 3 visible at once — drop oldest
      const next = prev.length >= 3 ? prev.slice(1) : prev;
      return [...next, { id, type, message }];
    });
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Wire the global singleton to this store instance
  externalAdd = add;

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, remove };
}
