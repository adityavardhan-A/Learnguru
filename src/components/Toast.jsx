import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const getStyle = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/10 dark:bg-emerald-950/20',
          glow: 'shadow-emerald-500/5'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-400" />,
          border: 'border-rose-500/30',
          bg: 'bg-rose-500/10 dark:bg-rose-950/20',
          glow: 'shadow-rose-500/5'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          border: 'border-amber-500/30',
          bg: 'bg-amber-500/10 dark:bg-amber-950/20',
          glow: 'shadow-amber-500/5'
        };
      default:
        return {
          icon: <Info className="w-5 h-5 text-indigo-400" />,
          border: 'border-indigo-500/30',
          bg: 'bg-indigo-500/10 dark:bg-indigo-950/20',
          glow: 'shadow-indigo-500/5'
        };
    }
  };

  const { icon, border, bg, glow } = getStyle();

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl backdrop-blur-xl border ${border} ${bg} ${glow} shadow-xl max-w-sm w-full transition-all duration-300 animate-slide-in pointer-events-auto`}
      style={{
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-grow">
        <h4 className="font-semibold text-sm text-foreground">{toast.title}</h4>
        {toast.message && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

// Add standard inline CSS keyframe animation for the toast
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-1rem) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `;
  document.head.appendChild(style);
}
