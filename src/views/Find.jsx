// F5 Find a part + transfer request + approve. Ranked by estimated arrival by air, not km.
import { useEffect, useState } from "react";
import * as store from "../store/store.js";
import { COMMUNITIES, CONNECTIVITY, HUBS, PARTS } from "../data/seed.js";
import { C, DAY, ago, estArrivalDays, km, lastSeen, sharing, stock } from "../store/derive.js";
import { isHighRisk, loadWeather, riskOf } from "../weather.js";
import { myCommunity, FocusSelect, PART_OPTIONS } from "./common.jsx";
import { toast } from "../toast.js";
import { getLang, t } from "../i18n.js";

const RISK = { high: ["b-bad", "High risk"], some: ["b-warn", "Some risk"], ok: ["b-ok", "Flyable"] };
const STALE_DAYS = 7;

function Weather({ name, online }) {
  const [wx, setWx] = useState(undefined);
  useEffect(() => {
    let live = true; setWx(undefined);
    loadWeather(name, online).then((w) => { if (live) setWx(w); });
    return () => { live = false; };
  }, [name, online]);
  if (wx === undefined) return <div className="wx"><div className="note">Loading…</div></div>;
  if (wx === null) return <div className="wx"><div className="note">No forecast saved yet. It downloads next time you are online.</div></div>;
  return (
    <div className="wx">
      {wx.days.map((d) => {
        const r = RISK[riskOf(d)];
        return (
          <div key={d.t}>
            <strong>{new Date(d.t + "T12:00").toLocaleDateString(getLang(), { weekday: "short" })}</strong><br />
            Gusts {Math.round(d.g)} km/h<br />Snow {d.s.toFixed(1)} cm<br />
            <span className={"badge " + r[0]}>{r[1]}</span>
          </div>
        );
      })}
      {!wx.live && <p className="note" style={{ flexBasis: "100%" }}>Saved forecast from {ago(wx.at)}.</p>}
    </div>
  );
}

export default function Find() {
  const ev = store.getEvents(); const as = store.getAs(); const dev = store.getDevice();
  const me = myCommunity(); const part = store.getPref("part") || "P01";
  const mine = stock(ev, me, part);
  const reqs = ev.filter((e) => e.type === "request");

  const others = COMMUNITIES.filter((c) => c.name !== me).map((c) => ({
    c, s: stock(ev, c.name, part), share: sharing(ev, c.name), km: km(C(me), c),
    eta: estArrivalDays(c.name, me, part, isHighRisk), seen: lastSeen(ev, c.name),
  })).sort((a, b) => (a.eta?.days ?? 99) - (b.eta?.days ?? 99) || a.km - b.km);

  function request(from) {
    store.addEvent({ type: "request", community: me, from, to: me, part });
    toast(store.getDevice().online ? "Request sent." : "Request saved. It will be sent when you are back online.");
  }

  const incoming = reqs.filter((r) => r.from === me || r.to === me || as === "region");

  return (
    <>
      <h1>{t("findTitle")}</h1>
      <p className="lede">See your own stock first, then the communities a part can reach soonest by air. Every number shows how old it is.</p>
      <div className="grid2">
        <div>
          <FocusSelect label="Community that needs the part" />
          <label className="f" htmlFor="partSel">Part</label>
          <select className="field" id="partSel" value={part} onChange={(e) => store.setPref("part", e.target.value)}>
            {PART_OPTIONS}
          </select>
          <div className="sheet" style={{ marginTop: 14 }}>
            <strong>{me}</strong>: {mine.q} {PARTS[part].toLowerCase()} in stock<br />
            <span className="note">Updated {ago(mine.last)}</span>
          </div>
          <h2>Weather at {me}, next 3 days</h2>
          <Weather name={me} online={dev.online} />
          <p className="note">Strong gusts or heavy snow can ground small planes. Thresholds are settings to agree on with local staff.</p>
        </div>
        <div>
          <h2>Other communities</h2>
          <p className="note">Sorted by estimated arrival by air. Flight frequencies are sample data.</p>
          <ul className="list">
            {others.map((o) => {
              const conn = CONNECTIVITY[o.c.name] === "fibre" ? "Fibre" : "Satellite";
              const eta = o.eta
                ? `~${o.eta.days} day${o.eta.days > 1 ? "s" : ""} by air${o.eta.via.length ? ` via ${o.eta.via.join(", ")}` : ", direct"}${o.eta.weather ? " (+1 day weather)" : ""}`
                : "Sealift only (too heavy to fly)";
              const where = <><strong>{o.c.name}</strong>{HUBS[o.c.name] ? " · hub" : ""} · {eta}<br /><span className="note">{o.km} km · {conn}, synced {ago(o.seen)}</span></>;
              if (!o.share) return (
                <li key={o.c.name}>
                  <span>{where}<br /><span className="note">This community has not chosen to share its stock yet.</span></span>
                  <span className="badge b-grey">Not shared</span>
                </li>
              );
              const pending = reqs.find((r) => r.to === me && r.from === o.c.name && r.part === part);
              const stale = o.s.last && Date.now() - o.s.last > STALE_DAYS * DAY;
              return (
                <li key={o.c.name}>
                  <span>
                    {where}<br />
                    <span className="note">{o.s.q} in stock · updated {ago(o.s.last)}</span>
                    {stale && o.s.q > 0 && <><br /><span className="warnline">⚠ This count may be outdated. Confirm by radio or phone before requesting.</span></>}
                  </span>
                  {pending ? <span className="badge b-warn">Requested</span>
                    : o.s.q > 0 ? <button className="btn" onClick={() => request(o.c.name)}>Request 1</button>
                    : <span className="badge b-grey">None</span>}
                </li>
              );
            })}
          </ul>
          {incoming.length > 0 && (
            <>
              <h2>Transfer requests</h2>
              <ul className="list">
                {incoming.map((r) => (
                  <li key={r.id}>
                    <span>{r.to} asks {r.from} for 1 {PARTS[r.part].toLowerCase()}<br /><span className="note">{ago(r.ts)} · {r.status || "Waiting for reply"}</span></span>
                    {!r.status && (as === r.from || as === "region") &&
                      <button className="btn ghost" onClick={() => { store.approveRequest(r.id); toast("Approved."); }}>Approve</button>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}
