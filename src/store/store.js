// The only module that touches localStorage (SPEC §7).
// Demo sync: a shared "ln:central" key acts as the server; each device (tab, via ?as=)
// keeps its own key with online flag, outbox, cached events and lastSync.
// The `storage` event gives live updates between tabs. Swap this module for a real backend later.
import { SEED_VERSION, seedEvents } from "../data/seed.js";
import { toast } from "../toast.js";

const CKEY = "ln:central";

function read(k) { try { return localStorage.getItem(k); } catch { return null; } }
function write(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } }
function readJSON(k) { try { return JSON.parse(read(k) || "null"); } catch { return null; } }

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

let AS = new URLSearchParams(location.search).get("as") || read("ln:lastAs") || "Inukjuak"; // community or "region"
const dkey = () => "ln:dev:" + AS;

/* ---------- subscribers ---------- */
const listeners = new Set();
const remoteListeners = new Set();
let version = 0;
let memo = null; // cached event list for the current version
function emit() { version++; memo = null; listeners.forEach((fn) => fn()); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const getVersion = () => version;
// Fires when another tab changed the shared store (used for the "flash" cue).
export function onRemoteUpdate(fn) { remoteListeners.add(fn); return () => remoteListeners.delete(fn); }

/* ---------- central + device ---------- */
function central() {
  let c = readJSON(CKEY);
  // Only replace an OLDER seed. A tab still running old code must never wipe a newer seed.
  if (!c || (c.v || 0) < SEED_VERSION) {
    // New or outdated demo seed: start fresh, and drop device copies of the old one.
    Object.keys(localStorage).filter((k) => k.startsWith("ln:dev:")).forEach((k) => localStorage.removeItem(k));
    c = { v: SEED_VERSION, events: seedEvents(uid) }; write(CKEY, JSON.stringify(c));
  }
  return c;
}
function saveCentral(c) { write(CKEY, JSON.stringify(c)); }
function device() {
  let d = readJSON(dkey());
  if (!d) { d = { online: true, outbox: [], cache: central().events, lastSync: Date.now() }; saveDev(d); }
  return d;
}
function saveDev(d) { write(dkey(), JSON.stringify(d)); }

/* ---------- public interface ---------- */
export const getAs = () => AS;
export function setAs(as) {
  AS = as;
  write("ln:lastAs", as);
  const u = new URL(location.href); u.searchParams.set("as", as); history.replaceState(null, "", u);
  emit();
}

export function getEvents() {
  if (memo) return memo;
  const d = device();
  const base = d.online ? central().events : d.cache;
  memo = base.concat(d.outbox);
  return memo;
}

export function getDevice() {
  const d = device();
  return { online: d.online, outboxCount: d.outbox.length, lastSync: d.lastSync };
}

export function addEvent(ev) {
  ev = { ...ev, id: uid(), ts: ev.ts || Date.now(), by: ev.by || (AS === "region" ? "KRG" : AS + " garage") };
  const d = device();
  if (d.online) {
    const c = central(); c.events.push(ev); saveCentral(c);
    d.cache = c.events; d.lastSync = Date.now(); saveDev(d);
  } else {
    d.outbox.push(ev); saveDev(d);
  }
  emit();
  return ev;
}

export function setOnline(on) {
  const d = device();
  if (d.online === on) return;
  d.online = on;
  if (on) {
    const c = central(); const n = d.outbox.length;
    c.events = c.events.concat(d.outbox); saveCentral(c);
    d.outbox = []; d.cache = c.events; d.lastSync = Date.now(); saveDev(d);
    toast(n ? `Synced ${n} entr${n > 1 ? "ies" : "y"} to the region.` : "Back online. Up to date.");
  } else {
    d.cache = central().events; saveDev(d);
    toast("Offline. New entries are saved on this device and sync later.");
  }
  emit();
}

// MVP exception to append-only (SPEC §6 note): request status is updated in place.
// Status goes approved → shipped → received. Stock moves are normal append-only events.
export function setRequestStatus(id, status) {
  const c = central(); const r = c.events.find((e) => e.id === id);
  if (r) {
    r.status = status; saveCentral(c);
    const d = device(); d.cache = c.events; saveDev(d);
  }
  emit();
}

export function resetDemo() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("ln:") && !/^ln:(key|model|provider)/.test(k))
    .forEach((k) => localStorage.removeItem(k));
  location.reload();
}

/* ---------- per-device preferences and caches ---------- */
export const getPref = (name) => read("ln:" + name);
export function setPref(name, v) { write("ln:" + name, v); emit(); }
export const getJSON = (name) => readJSON("ln:" + name);
export const setJSON = (name, v) => write("ln:" + name, JSON.stringify(v));

/* ---------- live updates ---------- */
window.addEventListener("storage", (e) => {
  if (e.key !== CKEY || !device().online) return;
  const d = device(); d.cache = central().events; d.lastSync = Date.now(); saveDev(d);
  emit();
  remoteListeners.forEach((fn) => fn());
});
window.addEventListener("offline", () => setOnline(false));
window.addEventListener("online", () => setOnline(true));
