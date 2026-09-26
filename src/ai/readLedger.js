// Ledger page reading: Gemini vision (online + key), demo reader (no key), or deferred (offline). SPEC §8, F2.
import { PARTS } from "../data/seed.js";

const PROMPT = `You read photos of handwritten spare-parts ledger pages from a municipal garage.
Return ONLY a JSON array. One object per ledger row:
{"date":"YYYY-MM-DD or null","part":"string","qty_in":number,"qty_out":number,"initials":"string or null","confidence":0.0-1.0,"raw_text":"exactly what you read"}
If a value is unclear, make your best guess and set confidence below 0.7. Never invent rows. Ignore crossed-out rows.`;

// The team's handwritten demo page (SPEC §13). 4th row is deliberately messy.
const DEMO_ROWS = [
  { date: "2026-09-24", part: "Tank heater element", qty_in: 4, qty_out: 0, initials: "JK", confidence: 0.93 },
  { date: "2026-09-25", part: "Hydraulic hose kit", qty_in: 0, qty_out: 1, initials: "MA", confidence: 0.88 },
  { date: "2026-09-25", part: "Water pump", qty_in: 0, qty_out: 1, initials: "MA", confidence: 0.81 },
  { date: "2026-09-26", part: "Filter cartridges", qty_in: 6, qty_out: 0, initials: "JK", confidence: 0.58, raw_text: "Filtr cartrdg" },
];

// Fuzzy match: catalogue part sharing the most words (> 2 letters) with what was read.
export function matchPart(name) {
  const n = (name || "").toLowerCase(); let best = "P01", score = -1;
  Object.entries(PARTS).forEach(([k, v]) => {
    const s = v.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && n.includes(w)).length;
    if (s > score) { score = s; best = k; }
  });
  return best;
}

export async function readPage(photoData, { key, model }) {
  let rows;
  if (key) {
    const [meta, b64] = photoData.split(","); const mime = meta.match(/data:(.*?);/)[1];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || "gemini-2.5-flash")}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: b64 } }] }],
          generationConfig: { response_mime_type: "application/json" },
        }),
      }
    );
    if (!res.ok) throw new Error("The AI service returned " + res.status + ". Check the key and model name.");
    const data = await res.json();
    const txt = data.candidates[0].content.parts.map((p) => p.text || "").join("");
    rows = JSON.parse(txt.replace(/```json|```/g, "").trim());
  } else {
    await new Promise((r) => setTimeout(r, 900));
    rows = DEMO_ROWS.map((r) => ({ ...r }));
  }
  return rows.map((r) => ({ ...r, pid: matchPart(r.part) }));
}
