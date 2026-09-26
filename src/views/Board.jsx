// F1 Regional board.
import * as store from "../store/store.js";
import { COMMUNITIES } from "../data/seed.js";
import { ago, isWaterTruck, openBreakdowns, sharing, trucksRunning, truckStatus } from "../store/derive.js";
import { t } from "../i18n.js";

const BADGE = { normal: "b-ok", reduced: "b-warn", critical: "b-bad" };

export default function Board() {
  const ev = store.getEvents(); const dev = store.getDevice(); const as = store.getAs();
  const order = [...COMMUNITIES].sort((a, b) => (b.name === as) - (a.name === as));
  return (
    <>
      <h1>{t("boardTitle")}</h1>
      <p className="lede">
        {dev.online ? "Live regional picture." : `You are offline. Showing the region as of your last sync, ${ago(dev.lastSync)}.`}{" "}
        Truck counts and stock are sample data for the demo.
      </p>
      <div className="board">
        {order.map((c) => {
          const run = trucksRunning(ev, c.name); const st = truckStatus(run, c.water);
          const other = openBreakdowns(ev, c.name).filter((o) => !isWaterTruck(o.asset)).map((o) => o.asset).join(", ");
          return (
            <div key={c.name} className={"crow" + (c.name === as ? " mine" : "")}>
              <div>
                <div className="cname">{c.name}</div>
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
    </>
  );
}
