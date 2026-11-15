import React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';

export default function ErrorMessage({ error, onDismiss }) {
  if (!error) return null;

  const errorType = error.error_type || 'Compilation Error';
  const message = error.message || String(error);
  const line = error.line;
  const col = error.col;

  return (
    <div className="error-banner" role="alert">
      <div className="error-banner-header">
        <div className="error-banner-title">
          <AlertCircle size={15} className="error-icon" />
          <span className="error-type">{errorType}</span>
          {line !== null && line !== undefined && (
            <span className="error-location">
              Line {line}{col !== null && col !== undefined ? `, Col ${col}` : ''}
            </span>
          )}
        </div>
        {onDismiss && (
          <button className="error-dismiss-btn" onClick={onDismiss} title="Dismiss error">
            <XCircle size={14} />
          </button>
        )}
      </div>
      <p className="error-message-body">{message}</p>
      <div className="error-tip">
        Check syntax according to standard C subset rules: variable declarations, arithmetic expressions, control structures (if-else, while, for), and valid blocks with braces.
      </div>
    </div>
  );
}
