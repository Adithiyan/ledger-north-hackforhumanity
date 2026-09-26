// F2 Snap ledger → confirm → save.
import { useState } from "react";
import * as store from "../store/store.js";
import { PROVIDERS, readPage } from "../ai/readLedger.js";
import { toast } from "../toast.js";
import { t } from "../i18n.js";
import { PART_OPTIONS } from "./common.jsx";


export default function Snap() {
  const as = store.getAs();
  const [photo, setPhoto] = useState(null);
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState("");
  // Saved reader settings (per provider), and the draft being edited in Settings.
  const provider = store.getPref("provider") || "demo";
  const key = store.getPref("key:" + provider) || "";
  const model = store.getPref("model:" + provider) || PROVIDERS[provider].model;
  const aiOn = provider !== "demo" && !!key;
  const [provIn, setProvIn] = useState(provider);
  const [keyIn, setKeyIn] = useState(key);
  const [modelIn, setModelIn] = useState(model || "");

  if (as === "region") return (
    <>
      <h1>{t("snapTitle")}</h1>
      <p className="lede">Ledger pages are captured by each community's garage. Switch the view to a community at the top to try it.</p>
    </>
  );

  function onFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => setPhoto(r.result); r.readAsDataURL(f);
  }

  async function onRead() {
    if (!store.getDevice().online) { setMsg("Photo saved on this device. It will be read when you are back online."); return; }
    setMsg(aiOn ? `Reading the page with ${PROVIDERS[provider].label.split(" (")[0]}…` : "Reading the sample page…");
    try {
      const out = await readPage(photo, { provider, key, model });
      setRows(out); setMsg(`Found ${out.length} rows${aiOn ? "" : " (demo reader: fixed sample page)"}. Check the highlighted ones.`);
    } catch (err) {
      setMsg("Could not read the page: " + err.message + " You can add rows by hand instead.");
      setRows([{ date: new Date().toISOString().slice(0, 10), part: "", qty_in: 0, qty_out: 0, initials: "", confidence: 0, pid: "P01" }]);
    }
  }

  const edit = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  function onSave() {
    const wasOnline = store.getDevice().online;
    rows.forEach((r) => {
      const delta = (+r.qty_in || 0) - (+r.qty_out || 0);
      if (delta) store.addEvent({ type: "stock", community: as, part: r.pid, delta, reason: "ledger page", by: (r.initials || "") + " via ledger photo" });
    });
    const n = rows.length; setRows(null); setPhoto(null); setMsg("");
    toast(wasOnline ? `Saved ${n} entries and shared with the region.` : `Saved ${n} entries on this device. They will sync when you are back online.`);
  }

  function onSaveSettings() {
    store.setPref("provider", provIn);
    if (provIn !== "demo") {
      store.setPref("key:" + provIn, keyIn.trim());
      store.setPref("model:" + provIn, modelIn.trim() || PROVIDERS[provIn].model);
    }
    toast("Settings saved on this device.");
  }

  function pickProvider(p) {
    setProvIn(p);
    setKeyIn(store.getPref("key:" + p) || "");
    setModelIn(store.getPref("model:" + p) || PROVIDERS[p].model || "");
  }

  const addRow = () => setRows((rs) => [...(rs || []), { date: new Date().toISOString().slice(0, 10), part: "", qty_in: 0, qty_out: 0, initials: "", confidence: 1, pid: "P01" }]);

  return (
    <>
      <h1>{t("snapTitle")}</h1>
      <p className="lede">Keep writing in your ledger. Take a photo of the page and we turn it into entries you check before saving. The paper ledger stays yours; this makes a copy the municipality can use.</p>
      <div className="grid2">
        <div>
          <div className="drop">
            <label className="btn" htmlFor="photo" style={{ display: "inline-block" }}>Take or choose a photo</label>
            <input id="photo" type="file" accept="image/*" capture="environment" className="sr" onChange={onFile} />
            <p className="note">{aiOn
              ? `Reading with ${PROVIDERS[provider].label.split(" (")[0]} when online.`
              : "Demo reader: no AI key set, so a fixed sample page is used. Add a Groq or Gemini key under Settings below."}{" "}
              Need a page to photograph? Open the <a href="sample-ledger.html" target="_blank" rel="noopener">sample ledger page</a>.</p>
            {photo && <img className="photo" src={photo} alt="Photo of the ledger page" />}
          </div>
          <div className="btn-row"><button className="btn" onClick={onRead} disabled={!photo && aiOn}>Read this page</button>
            <button className="btn ghost" onClick={addRow}>Add a row by hand</button></div>
          <p className="note" role="status" aria-live="polite">{msg}</p>
        </div>
        <div>
          {rows && (
            <div className="sheet ledger">
              <h2 style={{ marginTop: 0 }}>Check before saving</h2>
              <div className="tablewrap"><table>
                <thead><tr><th scope="col">Date</th><th scope="col">Part</th><th scope="col">In</th><th scope="col">Out</th><th scope="col">By</th></tr></thead>
                <tbody>
                  {rows.map((r, i) => {
                    const unsure = r.confidence < 0.7;
                    return (
                      <tr key={i} className={unsure ? "unsure" : ""}>
                        <td><input aria-label={`Date row ${i + 1}`} value={r.date || ""} onChange={(e) => edit(i, "date", e.target.value)} /></td>
                        <td>
                          <select aria-label={`Part row ${i + 1}`} value={r.pid} onChange={(e) => edit(i, "pid", e.target.value)}>{PART_OPTIONS}</select>
                          {unsure && <div className="note">⚠ Unsure, read as “{r.raw_text || r.part}”</div>}
                        </td>
                        <td><input type="number" min="0" aria-label={`Quantity in row ${i + 1}`} value={+r.qty_in || 0} onChange={(e) => edit(i, "qty_in", +e.target.value)} /></td>
                        <td><input type="number" min="0" aria-label={`Quantity out row ${i + 1}`} value={+r.qty_out || 0} onChange={(e) => edit(i, "qty_out", +e.target.value)} /></td>
                        <td><input aria-label={`Initials row ${i + 1}`} value={r.initials || ""} style={{ maxWidth: 70 }} onChange={(e) => edit(i, "initials", e.target.value)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
              <div className="btn-row"><button className="btn" onClick={onSave}>Save {rows.length} entries</button></div>
            </div>
          )}
        </div>
      </div>
      <details style={{ marginTop: 24 }}>
        <summary>Settings</summary>
        <label className="f" htmlFor="provIn">Who reads the photo</label>
        <select className="field" id="provIn" value={provIn} onChange={(e) => pickProvider(e.target.value)}>
          {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {provIn !== "demo" && (
          <>
            <label className="f" htmlFor="keyIn">API key (stays on this device only, never uploaded to the repo)</label>
            <input className="field" id="keyIn" type="password" autoComplete="off" value={keyIn} placeholder={provIn === "groq" ? "gsk_…" : "Gemini API key"} onChange={(e) => setKeyIn(e.target.value)} />
            <label className="f" htmlFor="modelIn">Model</label>
            <input className="field" id="modelIn" value={modelIn} onChange={(e) => setModelIn(e.target.value)} />
          </>
        )}
        <p className="note">Only photograph sample pages during the demo. Free AI tiers may use content to improve their products; real community data should use a no-training plan or a model hosted in Nunavik.</p>
        <div className="btn-row">
          <button className="btn ghost" onClick={onSaveSettings}>Save settings</button>
          <button className="btn ghost" onClick={store.resetDemo}>Reset demo data</button>
        </div>
      </details>
    </>
  );
}
