// Open-Meteo 3-day forecast, cached per community for offline use (SPEC F5).
import { getJSON, setJSON } from "./store/store.js";
import { C } from "./store/derive.js";

// High > 60 km/h gusts or > 10 cm snow; Some > 40 km/h or > 4 cm.
export function riskOf(d) {
  return d.g > 60 || d.s > 10 ? "high" : d.g > 40 || d.s > 4 ? "some" : "ok";
}

// Returns { days, live, at } or null if nothing is cached and we're offline.
export async function loadWeather(name, online) {
  const c = C(name); const ck = "wx:" + name;
  if (online) {
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=wind_gusts_10m_max,snowfall_sum&timezone=auto&forecast_days=3`;
      const d = (await (await fetch(u)).json()).daily;
      const days = d.time.map((t, i) => ({ t, g: d.wind_gusts_10m_max[i] || 0, s: d.snowfall_sum[i] || 0 }));
      const at = Date.now();
      setJSON(ck, { at, days });
      return { days, live: true, at };
    } catch { /* fall through to cache */ }
  }
  const cached = getJSON(ck);
  return cached ? { ...cached, live: false } : null;
}

// Today's cached risk for a community; used by the arrival-time estimate.
export function isHighRisk(name) {
  const c = getJSON("wx:" + name);
  return !!(c && c.days && c.days[0] && riskOf(c.days[0]) === "high");
}
