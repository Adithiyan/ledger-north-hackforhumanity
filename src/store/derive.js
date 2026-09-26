// Pure functions: all state is derived from the event list (SPEC §6).
import { COMMUNITIES, DEFAULT_SHARING, FLIGHT_LEGS, SEA_ONLY } from "../data/seed.js";

export const DAY = 864e5;
export const C = (n) => COMMUNITIES.find((c) => c.name === n);

export function stock(ev, c, p) {
  let q = 0, last = 0;
  ev.forEach((e) => { if (e.type === "stock" && e.community === c && e.part === p) { q += e.delta; last = Math.max(last, e.ts); } });
  return { q: Math.max(0, q), last };
}

export function openBreakdowns(ev, c) {
  const fixed = new Set(ev.filter((e) => e.type === "fixed").map((e) => e.ref));
  return ev.filter((e) => e.type === "breakdown" && (!c || e.community === c) && !fixed.has(e.id));
}

export const isWaterTruck = (asset) => /^Water truck/.test(asset);

export function trucksRunning(ev, c) {
  const down = openBreakdowns(ev, c).filter((o) => isWaterTruck(o.asset)).length;
  return Math.max(0, C(c).water - down);
}

// Critical when running ≤ 50% (SPEC F1).
export function truckStatus(run, total) {
  const r = run / total;
  return r <= 0.5 ? "critical" : r < 1 ? "reduced" : "normal";
}

export function sharing(ev, c) {
  let s = !!DEFAULT_SHARING[c];
  ev.filter((e) => e.type === "share" && e.community === c).sort((a, b) => a.ts - b.ts).forEach((e) => (s = e.on));
  return s;
}

// Latest entry from a community = when its data last reached the region.
export function lastSeen(ev, c) {
  let t = 0;
  ev.forEach((e) => { if (e.community === c) t = Math.max(t, e.ts); });
  return t;
}

export function km(a, b) {
  const R = 6371, r = (x) => (x * Math.PI) / 180;
  const d = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(d)));
}

export function ago(ts) {
  if (!ts) return "never";
  const d = Math.floor((Date.now() - ts) / DAY);
  if (d <= 0) { const h = Math.floor((Date.now() - ts) / 36e5); return h <= 0 ? "just now" : `${h} h ago`; }
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

export function poissonQ(l, p = 0.95) {
  let k = 0, term = Math.exp(-l), cdf = term;
  while (cdf < p && k < 500) { k++; term *= l / k; cdf += term; }
  return k;
}

/* ---------- Arrival time by air (F5) ---------- */
// Each leg costs the average wait for its next flight (half the gap between flights)
// plus flight time; each change of plane adds half a day of handling.
function legCost(minutes, perWeek) { return 7 / perWeek / 2 + minutes / 1440; }

// Shortest path (Dijkstra) from supplier to requester. Returns { cost, path } or null.
function airRoute(from, to) {
  const dist = { [from]: 0 }, prev = {}, done = new Set();
  while (true) {
    let u = null;
    for (const n in dist) if (!done.has(n) && (u === null || dist[n] < dist[u])) u = n;
    if (u === null) return null;
    if (u === to) break;
    done.add(u);
    FLIGHT_LEGS.forEach(([a, b, min, fpw]) => {
      const v = a === u ? b : b === u ? a : null;
      if (!v || done.has(v)) return;
      const alt = dist[u] + legCost(min, fpw) + (u === from ? 0 : 0.5);
      if (dist[v] === undefined || alt < dist[v]) { dist[v] = alt; prev[v] = u; }
    });
  }
  const path = [to];
  while (path[0] !== from) path.unshift(prev[path[0]]);
  return { cost: dist[to], path };
}

// Estimated days for a part to reach `to` from `from`. null if sea-only or no route.
// +1 day if weather risk is high at either end (isHighRisk reads the cached forecast).
export function estArrivalDays(from, to, part, isHighRisk = () => false) {
  if (SEA_ONLY[part]) return null;
  const r = airRoute(from, to);
  if (!r) return null;
  const weather = isHighRisk(from) || isHighRisk(to) ? 1 : 0;
  return { days: Math.max(1, Math.ceil(r.cost)) + weather, via: r.path.slice(1, -1), weather: !!weather };
}
