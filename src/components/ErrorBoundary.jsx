import React from 'react';

// Catches a crash in the part of the page it wraps, so one broken screen shows a
// message with a Reload button instead of a blank white page. The error is sent
// to the server log (pm2 logs) as "[Client Error]" so it can be fixed.
const reportError = (where, error, info) => {
  try {
    fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        where,
        message: String(error?.message || error || '').slice(0, 500),
        stack: String(error?.stack || '').slice(0, 2000),
        componentStack: String(info?.componentStack || '').slice(0, 2000),
        url: window.location.pathname,
        userAgent: navigator.userAgent.slice(0, 300),
      }),
    }).catch(() => {});
  } catch (_) { /* reporting must never throw */ }
};

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`[${this.props.name || 'App'}] crashed:`, error, info?.componentStack);
    reportError(this.props.name || 'app', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { onClose, closeLabel = 'Back to store', fullScreen } = this.props;
    return (
      <div className={`eb-wrap${fullScreen ? ' eb-full' : ''}`} role="alert">
        <div className="eb-card">
          <div className="eb-icon" aria-hidden="true">!</div>
          <h2 className="eb-title">Something went wrong</h2>
          <p className="eb-sub">This screen hit an error. Reloading usually fixes it.</p>
          <code className="eb-msg">{String(error?.message || error).slice(0, 300)}</code>
          <div className="eb-actions">
            <button type="button" className="eb-btn eb-btn-primary" onClick={() => window.location.reload()}>Reload</button>
            {onClose && (
              <button type="button" className="eb-btn" onClick={() => { this.setState({ error: null }); onClose(); }}>{closeLabel}</button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
