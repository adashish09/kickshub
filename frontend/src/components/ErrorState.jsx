import React from 'react';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'Unable to load catalog products.',
  onRetry,
}) {
  const isTimeoutOrNetwork =
    typeof message === 'string' &&
    (message.toLowerCase().includes('timeout') ||
      message.toLowerCase().includes('network error') ||
      message.toLowerCase().includes('unable to connect') ||
      message.toLowerCase().includes('cloud') ||
      message.toLowerCase().includes('server'));

  return (
    <div className="state-container error-state" role="alert">
      <div className="state-icon error-icon" aria-hidden="true">
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 className="state-title">
        {isTimeoutOrNetwork ? 'Server Took Longer Than Usual' : title}
      </h3>
      <p className="state-message">
        {message}
      </p>
      {isTimeoutOrNetwork && (
        <p className="state-hint">
          Render free cloud services spin down when idle and take ~45–60 seconds to awaken on the first visit. Since the wake-up process has already begun, retrying now should connect quickly.
        </p>
      )}
      <div className="state-actions">
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-state-action btn-state-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Try Again
          </button>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-state-action btn-state-secondary"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
