import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export default function Toast({ toast }) {
  if (!toast) return null;

  const { message, type = 'success' } = toast;

  const icons = {
    error: <AlertCircle size={16} className="text-error" />,
    warning: <AlertTriangle size={16} className="text-warning" />,
    info: <Info size={16} className="text-accent-secondary" />,
    success: <CheckCircle2 size={16} className="text-accent-secondary" />,
  };

  return (
    <div className={`app-toast toast-${type}`} role="alert">
      {icons[type] || icons.info}
      <span className="toast-text">{message}</span>
    </div>
  );
}
