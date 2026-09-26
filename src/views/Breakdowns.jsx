// F4 Breakdown log.
import { useState } from "react";
import * as store from "../store/store.js";
import { PARTS } from "../data/seed.js";
import { C, DAY, openBreakdowns } from "../store/derive.js";
import { myCommunity, FocusSelect } from "./common.jsx";
import { toast } from "../toast.js";
import { t } from "../i18n.js";

export default function Breakdowns() {
  const me = myCommunity();
  return <Log key={me} me={me} />;
}

function Log({ me }) {
  const ev = store.getEvents(); const c = C(me);
  const assets = [
    ...Array.from({ length: c.water }, (_, i) => `Water truck ${i + 1}`),
    ...Array.from({ length: c.sewage }, (_, i) => `Sewage truck ${i + 1}`),
    "Intake pipe heater", "Treatment plant chlorine pump",
  ];
  const [asset, setAsset] = useState(assets[0]);
  const [part, setPart] = useState("P01");
  const open = openBreakdowns(ev, me).sort((a, b) => a.ts - b.ts);

  function log() {
    store.addEvent({ type: "breakdown", community: me, asset, part });
    toast(store.getDevice().online ? "Breakdown logged. The region can see it." : "Breakdown saved on this device.");
  }

  return (
    <>
      <h1>{t("brokeTitle", me)}</h1>
      <p className="lede">Log a failure in a few taps. The regional picture updates, and the time out of service is counted for reports.</p>
      <FocusSelect style={{ maxWidth: 320 }} />
      <div className="grid2" style={{ marginTop: 12 }}>
        <div className="sheet">
          <label className="f" htmlFor="assetSel">What broke</label>
          <select className="field" id="assetSel" value={asset} onChange={(e) => setAsset(e.target.value)}>
            {assets.map((a) => <option key={a}>{a}</option>)}
          </select>
          <label className="f" htmlFor="bpart">Part needed</label>
          <select className="field" id="bpart" value={part} onChange={(e) => setPart(e.target.value)}>
            {Object.entries(PARTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="btn-row"><button className="btn" onClick={log}>Log breakdown</button></div>
        </div>
        <div>
          <h2>Out of service now</h2>
          {open.length ? (
            <ul className="list">
              {open.map((o) => (
                <li key={o.id}>
                  <span><strong>{o.asset}</strong><br />
                    <span className="note">Needs {PARTS[o.part].toLowerCase()} · down {((d) => (d === 1 ? "1 day" : `${d} days`))(Math.max(1, Math.round((Date.now() - o.ts) / DAY)))}</span></span>
                  <button className="btn ghost" onClick={() => store.addEvent({ type: "fixed", ref: o.id, community: me })}>Mark fixed</button>
                </li>
              ))}
            </ul>
          ) : <p>Nothing is out of service. Log a breakdown when one happens.</p>}
        </div>
      </div>
    </>
  );
}
