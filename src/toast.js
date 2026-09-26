// Tiny event bus for toast messages, so the store can announce sync results.
const listeners = new Set();
export function onToast(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function toast(msg) { listeners.forEach((fn) => fn(msg)); }
