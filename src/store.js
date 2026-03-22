const listeners = new Map();

export function subscribe(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);
  return () => listeners.get(event).delete(callback);
}

export function emit(event, data) {
  const cbs = listeners.get(event);
  if (cbs) {
    cbs.forEach((cb) => cb(data));
  }
}

// Events:
// 'entries-changed' — when entries are added/updated/deleted
// 'settings-changed' — when settings change
// 'measurements-changed' — when measurements change
// 'navigate' — route change
