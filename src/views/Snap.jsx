// F2 Snap ledger → confirm → save.
import { useEffect, useRef, useState } from "react";
import * as store from "../store/store.js";
import { PROVIDERS, readPage } from "../ai/readLedger.js";
import { toast } from "../toast.js";
import { t } from "../i18n.js";
import { PART_OPTIONS } from "./common.jsx";


const BUILT_IN_GROQ = import.meta.env.VITE_GROQ_KEY || "";

export default function Snap() {
  const as = store.getAs();
  const [photo, setPhoto] = useState(null);
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  // Saved reader settings (per provider), and the draft being edited in Settings.
  // Optional built-in key from the GROQ_KEY repo secret (free tier, revoked after the event); a key saved here wins.
  const provider = store.getPref("provider") || (BUILT_IN_GROQ ? "groq" : "demo");
  const key = store.getPref("key:" + provider) || (provider === "groq" ? BUILT_IN_GROQ : "");
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

  async function onFile(e) {
    const f = e.target.files[0]; if (!f) return;
    if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
      setMsg("Opening the PDF…");
      try { setPhoto(await pdfToImage(f)); setMsg("First page of the PDF is ready to read."); }
      catch { setMsg("Could not open this PDF. Try a photo or image instead."); }
      return;
    }
    const r = new FileReader(); r.onload = () => setPhoto(r.result); r.readAsDataURL(f);
  }

  // Fallback when the AI service fails (limit reached, network down), so the demo never dead-ends.
  async function onSample() {
    setFailed(false); setMsg("Reading the sample page…");
    const out = await readPage(null, { provider: "demo" });
    setRows(out); setMsg(`Found ${out.length} rows (sample reading). Check the highlighted ones.`);
  }

  async function onRead() {
    setFailed(false);
    if (!store.getDevice().online) { setMsg("Photo saved on this device. It will be read when you are back online."); return; }
    setMsg(aiOn ? `Reading the page with ${PROVIDERS[provider].label.split(" (")[0]}…` : "Reading the sample page…");
    try {
      const out = await readPage(photo, { provider, key, model });
      setRows(out); setMsg(`Found ${out.length} rows${aiOn ? "" : " (demo reader: fixed sample page)"}. Check the highlighted ones.`);
    } catch (err) {
      setMsg("Could not read the page: " + err.message + " Use the sample reading or add rows by hand.");
      setFailed(true);
    }
  }

  // Editing a row marks it as checked by a person.
  const edit = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v, checked: true } : r)));
  const removeRow = (i) => setRows((rs) => rs.filter((_, j) => j !== i));

  function onSave() {
    if (rows.some((r) => !r.pid)) { setSaveErr("Choose a part for every row, or remove the rows you do not need."); return; }
    const wasOnline = store.getDevice().online;
    let n = 0;
    rows.forEach((r) => {
      const delta = (+r.qty_in || 0) - (+r.qty_out || 0);
      if (delta) { n++; store.addEvent({ type: "stock", community: as, part: r.pid, delta, reason: "ledger page", by: (r.initials || "") + " via ledger photo" }); }
    });
    setRows(null); setPhoto(null); setMsg(""); setSaveErr("");
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

  const addRow = () => setRows((rs) => [...(rs || []), { date: new Date().toISOString().slice(0, 10), part: "", qty_in: 0, qty_out: 0, initials: "", confidence: 1, pid: "", added: true }]);

  return (
    <>
      <h1>{t("snapTitle")}</h1>
      <p className="lede">Keep writing in your ledger. Take a photo of the page and we turn it into entries you check before saving. The paper ledger stays yours; this makes a copy the municipality can use.</p>
      {!rows ? (
        <div className="grid2">
          <div>
            <div className="drop">
              {camOn ? <Camera onShot={(d) => { setPhoto(d); setCamOn(false); }} onClose={() => setCamOn(false)} /> : (
                <div className="btn-row" style={{ justifyContent: "center", marginTop: 0 }}>
                  <button className="btn" onClick={() => setCamOn(true)}>Use camera</button>
                  <label className="btn ghost" htmlFor="photo">Choose a picture or PDF</label>
                </div>
              )}
              <input id="photo" type="file" accept="image/*,application/pdf,.pdf" className="sr" onChange={onFile} />
              <p className="note">{aiOn
                ? `Reading with ${PROVIDERS[provider].label.split(" (")[0]} when online.`
                : "Demo reader: no AI key set, so a fixed sample page is used. Add a Groq or Gemini key under Settings below."}{" "}
                Need a page to photograph? Open the <a href="sample-ledger.html" target="_blank" rel="noopener">sample ledger page</a>.</p>
              {photo && <img className="photo" src={photo} alt="Photo of the ledger page" />}
            </div>
            <div className="btn-row"><button className="btn" onClick={onRead} disabled={!photo && aiOn}>Read this page</button>
              <button className="btn ghost" onClick={addRow}>Type entries by hand</button></div>
            <p className="note" role="status" aria-live="polite">{msg}</p>
            {failed && <div className="btn-row"><button className="btn" onClick={onSample}>Use the sample reading instead</button></div>}
          </div>
          <div><PhoneHint /></div>
        </div>
      ) : (
        <section className="review" aria-labelledby="reviewH">
          {photo && (
            <figure className="review-photo">
              <img src={photo} alt="The ledger page you photographed" />
              <figcaption className="note">Compare each row with the page.</figcaption>
            </figure>
          )}
          <div>
            <h2 id="reviewH" style={{ marginTop: 0 }}>Check before saving</h2>
            <p className="note" role="status" aria-live="polite">{msg || "Change anything that is wrong. Nothing is saved until you tap Save."}</p>
            <ol className="rowcards">
              {rows.map((r, i) => <RowCard key={i} r={r} i={i} edit={edit} remove={removeRow} />)}
            </ol>
            <div className="btn-row">
              <button className="btn ghost" onClick={addRow}>+ Add a row</button>
            </div>
            {saveErr && <p className="warnline" role="alert">{saveErr}</p>}
            <div className="btn-row savebar">
              <button className="btn" onClick={onSave} disabled={!rows.length}>Save {rows.length} {rows.length === 1 ? "entry" : "entries"}</button>
              <button className="btn ghost" onClick={() => { setRows(null); setMsg(""); setSaveErr(""); }}>Discard and read another page</button>
            </div>
          </div>
        </section>
      )}
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

// Live camera (laptop webcam or phone camera). Falls back to the file picker if no camera is allowed.
function Camera({ onShot, onClose }) {
  const video = useRef(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let stream;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } } })
      .then((s) => { stream = s; if (video.current) video.current.srcObject = s; })
      .catch(() => setErr("No camera available or permission was denied. Use “Choose a picture” instead."));
    if (!navigator.mediaDevices) setErr("This browser cannot open the camera. Use “Choose a picture” instead.");
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);
  function shoot() {
    const v = video.current; if (!v || !v.videoWidth) return;
    const cv = document.createElement("canvas"); cv.width = v.videoWidth; cv.height = v.videoHeight;
    cv.getContext("2d").drawImage(v, 0, 0); onShot(cv.toDataURL("image/jpeg", 0.9));
  }
  return (
    <div>
      {err ? <p className="note" role="alert">{err}</p>
        : <video ref={video} autoPlay playsInline muted className="photo" style={{ width: "100%", margin: "0 auto 10px" }} aria-label="Camera preview" />}
      <div className="btn-row" style={{ justifyContent: "center" }}>
        {!err && <button className="btn" onClick={shoot}>Capture page</button>}
        <button className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// Suggest the phone: scan to open this page there and photograph a real ledger page.
function PhoneHint() {
  const url = location.origin + location.pathname + "#snap";
  return (
    <details className="phone-hint">
      <summary>Better on a phone: scan to open Ledger North there</summary>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <img src={"https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=" + encodeURIComponent(url)} width="140" height="140" alt={"QR code linking to " + url} />
        <p className="note" style={{ flex: "1 1 180px", margin: 0 }}>Open this on your phone, tap <em>Use camera</em>, and photograph the <a href="sample-ledger.html" target="_blank" rel="noopener">sample ledger page</a> on this screen or on paper.</p>
      </div>
    </details>
  );
}

// Scanned ledger pages often arrive as PDF: render page 1 to a JPEG with pdf.js (loaded only when needed).
const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/";
async function pdfToImage(file) {
  const pdfjs = await import(/* @vite-ignore */ PDFJS + "pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(3, 1600 / Math.max(base.width, base.height)) });
  const cv = document.createElement("canvas"); cv.width = viewport.width; cv.height = viewport.height;
  const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
  // "print" intent renders without requestAnimationFrame, so it also finishes in a background tab.
  await page.render({ canvasContext: ctx, viewport, intent: "print" }).promise;
  return cv.toDataURL("image/jpeg", 0.9);
}

// One ledger row as an editable card: part, in/out steppers, date, initials.
function RowCard({ r, i, edit, remove }) {
  const n = i + 1;
  const unsure = r.confidence < 0.7 && !r.checked;
  const net = (+r.qty_in || 0) - (+r.qty_out || 0);
  const effect = !r.pid ? "Choose a part" : net > 0 ? `Adds ${net} to stock` : net < 0 ? `Takes ${-net} out of stock` : "No change to stock";
  return (
    <li className={"rowcard" + (unsure ? " unsure" : "") + (!r.pid ? " nopart" : "")} aria-label={`Row ${n}`}>
      <div className="rowhead">
        <span className="rownum">Row {n}</span>
        {r.added ? <span className="badge b-grey">Added by hand</span>
          : unsure ? <span className="badge b-warn">⚠ Check this row</span>
          : <span className="badge b-ok">✓ {r.checked ? "Checked" : "Looks right"}</span>}
        <button className="linkbtn rowremove" onClick={() => remove(i)} aria-label={`Remove row ${n}`}>Remove</button>
      </div>
      {!r.added && (r.raw_text || unsure) && <p className="readas">Read from the page as: “{r.raw_text || r.part}”</p>}
      <div className="rowfields">
        <label className="fld part">
          <span>Part</span>
          <select value={r.pid} onChange={(e) => edit(i, "pid", e.target.value)}>
            {!r.pid && <option value="">Choose a part…</option>}
            {PART_OPTIONS}
          </select>
        </label>
        <Stepper label="In" n={n} value={+r.qty_in || 0} onChange={(v) => edit(i, "qty_in", v)} />
        <Stepper label="Out" n={n} value={+r.qty_out || 0} onChange={(v) => edit(i, "qty_out", v)} />
        <label className="fld">
          <span>Date</span>
          <input type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(r.date || "") ? r.date : ""} onChange={(e) => edit(i, "date", e.target.value)} />
        </label>
        <label className="fld by">
          <span>Written by</span>
          <input value={r.initials || ""} maxLength={6} placeholder="Initials" onChange={(e) => edit(i, "initials", e.target.value.toUpperCase())} />
        </label>
      </div>
      <p className={"effect" + (net ? "" : " none")}>{effect}</p>
    </li>
  );
}

// Big minus / plus buttons for gloved hands, with a number field in between.
function Stepper({ label, n, value, onChange }) {
  return (
    <div className="fld stepper" role="group" aria-label={`${label}, row ${n}`}>
      <span>{label}</span>
      <div>
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`${label} minus one`} disabled={value <= 0}>−</button>
        <input type="number" inputMode="numeric" min="0" value={value} aria-label={`${label} quantity`} onChange={(e) => onChange(Math.max(0, +e.target.value || 0))} />
        <button type="button" onClick={() => onChange(value + 1)} aria-label={`${label} plus one`}>+</button>
      </div>
    </div>
  );
}
