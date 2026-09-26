// Overview: shortages first (what needs attention), then the regional truck board (F1).
import * as store from "../store/store.js";
import { COMMUNITIES, PARTS } from "../data/seed.js";
import { DAY, bestSource, openBreakdowns, runningLow, trucksRunning, truckStatus, waitingForPart, isWaterTruck } from "../store/derive.js";
import { isHighRisk } from "../weather.js";
import { myCommunity } from "./common.jsx";
import { t } from "../i18n.js";
import Board from "./Board.jsx";

const daysDown = (ts) => { const d = Math.max(1, Math.round((Date.now() - ts) / DAY)); return d === 1 ? "1 day" : `${d} days`; };

function findPart(part, community) {
  if (store.getAs() === "region") store.setPref("focus", community);
  store.setPref("part", part);
  location.hash = "find";
}

function Welcome() {
  if (store.getPref("welcomed")) return null;
  return (
    <div className="welcome" role="region" aria-label="Welcome">
      <p><strong>Water in Nunavik arrives by truck.</strong> When a truck part breaks, a community can go weeks without water, even if the part sits in the next village's paper ledger.</p>
      <p>Ledger North shares those ledgers between communities, works offline, and plans sealift orders. <span className="badge b-grey">Demo · sample data</span></p>
      <div className="btn-row">
        <a className="btn" href="#guide">How it works</a>
        <button className="btn ghost" onClick={() => store.setPref("welcomed", "1")}>Hide</button>
      </div>
    </div>
  );
}

function Tile({ n, label, tone }) {
  return <div className={"tile" + (tone ? " " + tone : "")}><strong>{n}</strong><span>{label}</span></div>;
}

export default function Home() {
  const ev = store.getEvents(); const as = store.getAs(); const region = as === "region";
  const me = myCommunity();
  const places = region ? COMMUNITIES.map((c) => c.name) : [me];

  const waiting = places.flatMap((c) => waitingForPart(ev, c)).sort((a, b) => a.ts - b.ts);
  const trucksDown = places.reduce((s, c) => s + openBreakdowns(ev, c).filter((o) => isWaterTruck(o.asset)).length, 0);
  const low = region ? [] : runningLow(ev, me);

  let tiles;
  if (region) {
    const reduced = COMMUNITIES.filter((c) => truckStatus(trucksRunning(ev, c.name), c.water) !== "normal").length;
    tiles = [
      <Tile key="a" n={`${reduced} of ${COMMUNITIES.length}`} label="communities with reduced water service" tone={reduced ? "warn" : ""} />,
      <Tile key="b" n={trucksDown} label="water trucks out of service" tone={trucksDown ? "warn" : ""} />,
      <Tile key="c" n={waiting.length} label="breakdowns waiting for a part" tone={waiting.length ? "bad" : ""} />,
    ];
  } else {
    const c = COMMUNITIES.find((x) => x.name === me); const run = trucksRunning(ev, me);
    tiles = [
      <Tile key="a" n={`${run} of ${c.water}`} label={`water trucks running (${t(truckStatus(run, c.water)).replace(/^\S+\s/, "")})`} tone={run < c.water ? "warn" : ""} />,
      <Tile key="b" n={waiting.length} label="breakdowns waiting for a part" tone={waiting.length ? "bad" : ""} />,
      <Tile key="c" n={low.length} label="parts running low this winter" tone={low.length ? "warn" : ""} />,
    ];
  }

  return (
    <>
      <Welcome />
      <h1>{region ? t("homeRegion") : t("homeTitle", me)}</h1>
      <p className="lede">What needs attention today. All numbers are sample data for the demo.</p>
      <div className="tiles">{tiles}</div>

      <section aria-labelledby="waitH">
        <h2 id="waitH">Waiting for a part</h2>
        <p className="note">Equipment that is broken and the part needed is not in stock locally.</p>
        {waiting.length ? (
          <ul className="list">
            {waiting.map((b) => {
              const src = bestSource(ev, b.community, b.part, isHighRisk);
              return (
                <li key={b.id}>
                  <span>
                    <strong>{region && `${b.community}: `}{b.asset}</strong> · down {daysDown(b.ts)}<br />
                    <span className="note">Needs {PARTS[b.part].toLowerCase()} · 0 in stock</span><br />
                    <span className="note">{src
                      ? `Fastest: ${src.name}${src.eta ? `, ~${src.eta.days} day${src.eta.days > 1 ? "s" : ""} by air` : ", sealift only"}`
                      : "No community sharing this part has it. Order from a supplier."}</span>
                  </span>
                  <button className="btn" onClick={() => findPart(b.part, b.community)}>Find this part</button>
                </li>
              );
            })}
          </ul>
        ) : <p>Nothing is waiting for a part. ✓</p>}
      </section>

      {!region && (
        <section aria-labelledby="lowH">
          <h2 id="lowH">Running low this winter</h2>
          <p className="note">Parts with less in stock than you usually use in the next 3 winter months. Order now or plan them in the <a href="#plan">sealift plan</a>.</p>
          {low.length ? (
            <ul className="list">
              {low.map((x) => (
                <li key={x.p}>
                  <span><strong>{PARTS[x.p]}</strong><br /><span className="note">{x.have} in stock · usually {x.need} used in the next 3 months</span></span>
                  <span className={"badge " + (x.have === 0 ? "b-bad" : "b-warn")}>{x.have === 0 ? "✕ Out" : "● Low"}</span>
                </li>
              ))}
            </ul>
          ) : <p>Stock covers the next 3 months. ✓</p>}
        </section>
      )}

      <Board />
    </>
  );
}
