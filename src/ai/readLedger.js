// Ledger page reading: Groq or Gemini vision (online + key), or the demo reader (no key). SPEC §8, F2.
// Keys are entered in the app and stay in this browser's localStorage. Never put them in .env:
// Vite bakes env values into the public bundle on GitHub Pages.
import { PARTS } from "../data/seed.js";

export const PROVIDERS = {
  demo: { label: "Demo reader (no key, fixed sample page)" },
  groq: { label: "Groq (free tier)", model: "qwen/qwen3.8-27b" },
  gemini: { label: "Google Gemini (free tier)", model: "gemini-2.5-flash" },
};

const PROMPT = `You read photos of handwritten spare-parts ledger pages from a municipal water garage in Nunavik.
Return ONLY JSON: {"rows":[...]} with one object per ledger row:
{"date":"YYYY-MM-DD or null","part":"string","qty_in":number,"qty_out":number,"initials":"string or null","confidence":0.0-1.0,"raw_text":"exactly what you read"}
Assume year 2026 if missing. If a value is unclear, make your best guess and set confidence below 0.7. Never invent rows. Ignore crossed-out rows and the header row.`;

// The team's handwritten demo page (SPEC §13, public/sample-ledger.html). 4th row is deliberately messy.
const DEMO_ROWS = [
  { date: "2026-09-24", part: "Tank heater element", qty_in: 4, qty_out: 0, initials: "JK", confidence: 0.93 },
  { date: "2026-09-25", part: "Hydraulic hose kit", qty_in: 0, qty_out: 1, initials: "MA", confidence: 0.88 },
  { date: "2026-09-25", part: "Water pump", qty_in: 0, qty_out: 1, initials: "MA", confidence: 0.81 },
  { date: "2026-09-26", part: "Filter cartridges", qty_in: 6, qty_out: 0, initials: "JK", confidence: 0.58, raw_text: "Filtr cartrdg" },
];

// Edit distance, for handwriting misspellings like "filtr" → "filter".
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const words = (s) => (s || "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 2);

// Fuzzy match to the catalogue. Returns "" when nothing is close, so the person picks instead of a wrong guess.
export function matchPart(name) {
  const read = words(name); let best = "", score = 0;
  Object.entries(PARTS).forEach(([k, v]) => {
    const cat = words(v); let s = 0;
    cat.forEach((w) => {
      let m = 0;
      read.forEach((r) => {
        if (r === w) m = 1;
        else if (w.length >= 4 && r.length >= 4 && (w.startsWith(r) || r.startsWith(w))) m = Math.max(m, 0.9);
        else if (w.length >= 4 && r.length >= 4 && lev(r, w) <= 2) m = Math.max(m, 0.8);
      });
      s += m;
    });
    s -= 0.01 * cat.length; // prefer the more specific catalogue name on ties
    if (s > score) { score = s; best = k; }
  });
  return score >= 0.7 ? best : "";
}

// Shrink phone photos (often 5–10 MB) to ~1600 px JPEG: faster on satellite links, within API limits.
function shrink(dataUrl, max = 1600) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      resolve(cv.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function parseRows(txt) {
  const j = JSON.parse(txt.replace(/```json|```/g, "").trim());
  const rows = Array.isArray(j) ? j : j.rows;
  if (!Array.isArray(rows)) throw new Error("The AI answer had no rows.");
  return rows;
}

async function readGroq(photo, key, model) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: model || PROVIDERS.groq.model,
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: photo } }] }],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error("Groq returned " + res.status + ". Check the key and model name.");
  return parseRows((await res.json()).choices[0].message.content);
}

async function readGemini(photo, key, model) {
  const [meta, b64] = photo.split(","); const mime = meta.match(/data:(.*?);/)[1];
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || PROVIDERS.gemini.model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: b64 } }] }],
        generationConfig: { response_mime_type: "application/json" },
      }),
    }
  );
  if (!res.ok) throw new Error("Gemini returned " + res.status + ". Check the key and model name.");
  const data = await res.json();
  return parseRows(data.candidates[0].content.parts.map((p) => p.text || "").join(""));
}

// provider: "demo" | "groq" | "gemini". Returns rows with a matched catalogue part id (pid).
export async function readPage(photo, { provider, key, model }) {
  let rows;
  if (provider === "demo" || !key || !photo) {
    await new Promise((r) => setTimeout(r, 900));
    rows = DEMO_ROWS.map((r) => ({ ...r }));
  } else {
    const small = await shrink(photo);
    rows = provider === "groq" ? await readGroq(small, key, model) : await readGemini(small, key, model);
  }
  return rows.map((r) => ({ ...r, pid: matchPart(r.part) }));
}
