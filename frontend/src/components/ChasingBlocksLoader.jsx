import React, { useState, useEffect } from 'react';

/**
 * ChasingBlocksLoader
 * 
 * High-performance, premium kinetic geometric loader featuring four blocks
 * chasing each other in a clockwise loop. Specifically designed for cloud-hosted
 * environments (e.g., Render free tier) with built-in time-aware status feedback
 * that keeps users informed during cold-start server boot (~30-60s) instead of
 * presenting a premature network error.
 *
 * @param {Object} props
 * @param {string} [props.title] - Custom primary loading headline
 * @param {string} [props.subtitle] - Custom secondary description
 * @param {string} [props.size='md'] - 'sm' | 'md' | 'lg'
 * @param {boolean} [props.fullPage=false] - If true, renders centered in a full container
 * @param {boolean} [props.compact=false] - If true, renders a condensed inline badge version
 * @param {number} [props.timeoutSeconds=65] - Total expected timeout threshold
 */
export default function ChasingBlocksLoader({
  title,
  subtitle,
  size = 'md',
  fullPage = false,
  compact = false,
  timeoutSeconds = 65,
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Compute dynamic stage message for cloud spin-up transparency
  let dynamicTitle = title || 'Loading Sneaker Drops';
  let dynamicSubtitle = subtitle || 'Fetching authentic catalog items & real-time inventory...';
  let statusBadge = 'Connecting';

  if (!title) {
    if (elapsed >= 35) {
      dynamicTitle = 'Almost Ready — Server Initializing';
      dynamicSubtitle = 'Backend service is finishing initialization and database handshakes (~45–60s).';
      statusBadge = 'Finalizing';
    } else if (elapsed >= 15) {
      dynamicTitle = 'Waking Up Cloud Server';
      dynamicSubtitle = 'Free cloud hosting spins down when idle. Awakening backend instance (~30–50s)...';
      statusBadge = 'Cold Start';
    } else if (elapsed >= 5) {
      dynamicTitle = 'Contacting KicksHub Backend';
      dynamicSubtitle = 'Establishing secure encrypted connection with our cloud database...';
      statusBadge = 'Connecting';
    }
  }

  // Progress percentage capped at 95% until complete
  const progressPercent = Math.min(Math.round((elapsed / timeoutSeconds) * 100), 95);

  if (compact) {
    return (
      <div className="chasing-blocks-compact" role="status" aria-live="polite">
        <div className={`chasing-blocks-anim size-${size}`}>
          <span className="block block-1"></span>
          <span className="block block-2"></span>
          <span className="block block-3"></span>
          <span className="block block-4"></span>
        </div>
        <span className="compact-text">{dynamicTitle}</span>
        {elapsed > 5 && <span className="compact-timer">({elapsed}s)</span>}
      </div>
    );
  }

  return (
    <div
      className={`chasing-blocks-wrapper ${fullPage ? 'is-full-page' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      <div className="chasing-blocks-card">
        {/* Kinetic 4-Block Chasing Graphic */}
        <div className={`chasing-blocks-stage size-${size}`}>
          <div className="chasing-blocks-grid">
            <span className="chasing-block block-top-left" aria-hidden="true"></span>
            <span className="chasing-block block-top-right" aria-hidden="true"></span>
            <span className="chasing-block block-bottom-right" aria-hidden="true"></span>
            <span className="chasing-block block-bottom-left" aria-hidden="true"></span>
          </div>
        </div>

        {/* Informative Header & Context */}
        <div className="chasing-blocks-text">
          <div className="chasing-blocks-header-row">
            <h3 className="chasing-blocks-title">{dynamicTitle}</h3>
            {elapsed >= 5 && (
              <span className={`chasing-status-badge badge-${statusBadge.toLowerCase().replace(/\s+/g, '-')}`}>
                {statusBadge} • {elapsed}s
              </span>
            )}
          </div>
          <p className="chasing-blocks-subtitle">{dynamicSubtitle}</p>
        </div>

        {/* Cold-Start Time-Elapsed Progress Bar */}
        {elapsed >= 4 && (
          <div className="chasing-progress-container" aria-hidden="true">
            <div className="chasing-progress-track">
              <div
                className="chasing-progress-bar"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="chasing-progress-labels">
              <span>Cloud wake-up progress</span>
              <span>{elapsed}s / ~60s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
