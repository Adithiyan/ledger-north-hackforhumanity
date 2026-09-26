// F1 Regional board. Shown as a section of the Overview page.
import * as store from "../store/store.js";
import { COMMUNITIES } from "../data/seed.js";
import { ago, isWaterTruck, openBreakdowns, sharing, trucksRunning, truckStatus } from "../store/derive.js";
import { t } from "../i18n.js";

export const BADGE = { normal: "b-ok", reduced: "b-warn", critical: "b-bad" };

export default function Board() {
  const ev = store.getEvents(); const dev = store.getDevice(); const as = store.getAs();
  const order = [...COMMUNITIES].sort((a, b) => (b.name === as) - (a.name === as));
  return (
    <section aria-labelledby="boardH">
      <h2 id="boardH">{t("boardTitle")}</h2>
      <p className="note">
        Green blocks are trucks running; striped blocks are out of service. Critical means half or fewer are running.
        {!dev.online && ` You are offline: this is the region as of your last sync, ${ago(dev.lastSync)}.`}
      </p>
      <div className="board">
        {order.map((c) => {
          const run = trucksRunning(ev, c.name); const st = truckStatus(run, c.water);
          const other = openBreakdowns(ev, c.name).filter((o) => !isWaterTruck(o.asset)).map((o) => o.asset).join(", ");
          return (
            <div key={c.name} className={"crow" + (c.name === as ? " mine" : "")}>
              <div>
                <div className="cname">{c.name}{c.name === as && <span className="note"> (you)</span>}</div>
                <div className="cmeta">Water trucks running: <strong>{run} of {c.water}</strong>{other && ` · Also down: ${other}`}</div>
                <div className="trucks" aria-hidden="true">
                  {Array.from({ length: c.water }, (_, i) => (
                    <span key={i} className={"truck" + (i >= run ? " down" : "")} title={i >= run ? "Out of service" : "Running"} />
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={"badge " + BADGE[st]}>{t(st)}</span>
                <div className="cmeta" style={{ marginTop: 6 }}>{sharing(ev, c.name) ? "Shares stock" : "Not sharing yet"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
