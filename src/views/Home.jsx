// Dashboard: one community's digital ledger. What is in stock, what is missing, what is running low.
import * as store from "../store/store.js";
import { COMMUNITIES, EMBED, PARTS, PART_SYSTEM, SYSTEMS } from "../data/seed.js";
import { DAY, ago, bestSource, openBreakdowns, sharing, stock, trucksRunning, truckStatus } from "../store/derive.js";
import { isHighRisk } from "../weather.js";
import { myCommunity, FocusSelect } from "./common.jsx";
import { t } from "../i18n.js";

const STATUS = { missing: ["b-bad", "✕ Missing"], low: ["b-warn", "● Low"], ok: ["b-ok", "✓ In stock"] };
const ORDER = ["missing", "low", "ok"];
const SYSTEM_LABEL = Object.fromEntries(SYSTEMS);

// Every catalogue part for one community, with its status.
function inventory(ev, c) {
  const rates = EMBED.rates[c] || {};
  const neededNow = new Map(openBreakdowns(ev, c).map((b) => [b.part, b.asset]));
  return Object.keys(PARTS).map((p) => {
    const s = stock(ev, c, p);
    const need = Math.ceil(3 * ((rates[p] || [0])[0])); // usual use over the next 3 winter months
    const status = s.q === 0 ? "missing" : need > 0 && s.q <= need ? "low" : "ok"; // low = no spare after 3 months' usual use
    return { p, q: s.q, last: s.last, need, status, brokenAsset: neededNow.get(p) };
  });
}

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
      <p>Ledger North turns each garage's paper ledger into a digital one, and puts every community's ledger in one place. <span className="badge b-grey">Demo · sample data</span></p>
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
  const ev = store.getEvents(); const region = store.getAs() === "region";
  const me = myCommunity(); const c = COMMUNITIES.find((x) => x.name === me);
  const inv = inventory(ev, me);
  const missing = inv.filter((x) => x.status === "missing").sort((a, b) => !!b.brokenAsset - !!a.brokenAsset);
  const low = inv.filter((x) => x.status === "low");
  const run = trucksRunning(ev, me);
  const entries = ev.filter((e) => e.type === "stock" && e.community === me).sort((a, b) => b.ts - a.ts).slice(0, 5);

  return (
    <>
      <Welcome />
      <h1>{t("homeTitle", me)}</h1>
      <p className="lede">What this garage has and what it is missing, built from its paper ledger. Sample data for the demo.</p>
      <FocusSelect style={{ maxWidth: 320 }} />

      <div className="tiles">
        <Tile n={`${inv.length - missing.length} of ${inv.length}`} label="parts in stock" />
        <Tile n={missing.length} label="parts missing" tone={missing.length ? "bad" : ""} />
        <Tile n={low.length} label="parts running low this winter" tone={low.length ? "warn" : ""} />
        <Tile n={`${run} of ${c.water}`} label={`water trucks running (${t(truckStatus(run, c.water)).replace(/^\S+\s/, "")})`} tone={run < c.water ? "warn" : ""} />
      </div>
      <p className="note">Ledger last updated {ago(entries[0]?.ts)}.</p>

      <section aria-labelledby="sysH">
        <h2 id="sysH">By water system</h2>
        <p className="note">From the water source to the home, in the order water flows.</p>
        <div className="systems">
          {SYSTEMS.map(([id, label], i) => {
            const parts = inv.filter((x) => PART_SYSTEM[x.p] === id);
            const miss = parts.filter((x) => x.status === "missing").length;
            const lowN = parts.filter((x) => x.status === "low").length;
            const st = miss ? STATUS.missing : lowN ? STATUS.low : STATUS.ok;
            return (
              <a key={id} href={"#sys-" + id} className="system">
                <span className="note">{i + 1}</span>
                <strong>{label}</strong>
                <span>{parts.length - miss} of {parts.length} parts in stock</span>
                <span className={"badge " + st[0]}>{miss ? `✕ ${miss} missing` : lowN ? `● ${lowN} low` : "✓ All in stock"}</span>
              </a>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="missH">
        <h2 id="missH">Missing</h2>
        {missing.length ? (
          <ul className="list">
            {missing.map((x) => {
              const src = bestSource(ev, me, x.p, isHighRisk);
              return (
                <li key={x.p}>
                  <span>
                    <strong>{PARTS[x.p]}</strong> <span className="note">· {SYSTEM_LABEL[PART_SYSTEM[x.p]]}</span>
                    {x.brokenAsset && <><br /><span className="badge b-bad">Needed now: {x.brokenAsset} is down</span></>}<br />
                    <span className="note">{src
                      ? `${src.name} has it${src.eta ? `, ~${src.eta.days} day${src.eta.days > 1 ? "s" : ""} by air` : ", sealift only"}`
                      : "No community sharing its ledger has this part."}</span>
                  </span>
                  <button className="btn" onClick={() => findPart(x.p, me)}>Find this part</button>
                </li>
              );
            })}
          </ul>
        ) : <p>Nothing is missing. ✓</p>}
      </section>

      <section aria-labelledby="invH">
        <h2 id="invH">All parts</h2>
        <div className="sheet ledger">
          <div className="tablewrap"><table>
            <thead><tr><th scope="col">Part</th><th scope="col">In stock</th><th scope="col">Status</th><th scope="col">Updated</th></tr></thead>
            {SYSTEMS.map(([id, label]) => (
              <tbody key={id} id={"sys-" + id}>
                <tr className="group"><th scope="colgroup" colSpan={4}>{label}</th></tr>
                {inv.filter((x) => PART_SYSTEM[x.p] === id).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status)).map((x) => (
                  <tr key={x.p}>
                    <td>{PARTS[x.p]}</td>
                    <td><strong>{x.q}</strong>{x.status === "low" && <span className="note"> · uses ~{x.need} in 3 months</span>}</td>
                    <td><span className={"badge " + STATUS[x.status][0]}>{STATUS[x.status][1]}</span></td>
                    <td className="note">{ago(x.last)}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table></div>
        </div>
        <p className="note">Low means only enough for what this garage usually uses in the next 3 winter months, with no spare.</p>
      </section>

      <section aria-labelledby="recentH">
        <h2 id="recentH">Latest ledger entries</h2>
        <p className="note">Every entry keeps who wrote it, like the paper ledger.</p>
        <ul className="list">
          {entries.map((e) => (
            <li key={e.id}>
              <span><strong>{e.reason === "count" ? `Counted ${e.delta}` : e.delta > 0 ? `+${e.delta} in` : `${-e.delta} out`}</strong> · {PARTS[e.part]}<br /><span className="note">{e.by} · {ago(e.ts)}</span></span>
            </li>
          ))}
        </ul>
        <div className="btn-row"><a className="btn ghost" href="#snap">Add entries from a ledger photo</a></div>
      </section>

      {region && <AllLedgers ev={ev} />}
    </>
  );
}

// Regional view only: every community's ledger in one place.
function AllLedgers({ ev }) {
  return (
    <section aria-labelledby="allH">
      <h2 id="allH">All community ledgers</h2>
      <p className="note">Pick a community to see its dashboard. ⚠ means no update in over 7 days.</p>
      <div className="tablewrap"><table>
        <thead><tr><th scope="col">Community</th><th scope="col">Parts missing</th><th scope="col">Last update</th><th scope="col">Shares stock</th></tr></thead>
        <tbody>
          {COMMUNITIES.map((c) => {
            const inv = inventory(ev, c.name);
            const last = Math.max(0, ...inv.map((x) => x.last));
            return (
              <tr key={c.name}>
                <td><button className="linkbtn" onClick={() => { store.setPref("focus", c.name); window.scrollTo(0, 0); }}>{c.name}</button></td>
                <td>{inv.filter((x) => x.status === "missing").length}</td>
                <td className="note">{ago(last)}{Date.now() - last > 7 * DAY && " ⚠"}</td>
                <td>{sharing(ev, c.name) ? "Yes" : "Not yet"}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </section>
  );
}
