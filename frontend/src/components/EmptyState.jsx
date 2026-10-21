import React from 'react';

export default function EmptyState({ message = 'No sneakers match your filters.', onReset }) {
  return (
    <div className="state-container empty-state">
      <div className="state-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </div>
      <h3 className="state-title">No Sneakers Found</h3>
      <p className="state-message">{message}</p>
      {onReset && (
        <button type="button" onClick={onReset} className="btn-state-action" id="btn-empty-reset">
          Clear All Filters
        </button>
      )}
    </div>
  );
}
