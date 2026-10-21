import React from 'react';

export default function ErrorState({ message = 'Unable to load catalog products.', onRetry }) {
  return (
    <div className="state-container error-state" role="alert">
      <div className="state-icon error-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 className="state-title">Something went wrong</h3>
      <p className="state-message">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-state-action">
          Try Again
        </button>
      )}
    </div>
  );
}
