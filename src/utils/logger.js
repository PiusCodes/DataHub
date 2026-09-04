export function logEvent(eventName, details = {}) {
  const payload = {
    event: eventName,
    details,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== 'undefined' && window.location) {
    payload.url = window.location.href;
  }

  console.info('[app-log]', payload);

  if (typeof fetch !== 'undefined') {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Fail silently to avoid breaking the UI.
    });
  }
}
