import React from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, type Toast } from '../hooks/useToast';

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  warn:    AlertTriangle,
  info:    Info,
};

const STYLES = {
  success: 'bg-emerald-500 text-white',
  error:   'bg-red-500 text-white',
  warn:    'bg-amber-500 text-white',
  info:    'bg-blue-500 text-white',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = ICONS[toast.type];
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl min-w-[260px] max-w-[340px] ${STYLES[toast.type]}`}
      style={{ animation: 'toast-in 0.2s ease' }}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, remove } = useToastStore();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={remove} />
        </div>
      ))}
    </div>
  );
}
