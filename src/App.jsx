import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as store from "./store/store.js";
import { COMMUNITIES } from "./data/seed.js";
import { t, getLang, setLang } from "./i18n.js";
import { onToast } from "./toast.js";
import Home from "./views/Home.jsx";
import Snap from "./views/Snap.jsx";
import Find from "./views/Find.jsx";
import Breakdowns from "./views/Breakdowns.jsx";
import Plan from "./views/Plan.jsx";
import Report from "./views/Report.jsx";
import Guide from "./views/Guide.jsx";

const VIEWS = { home: Home, snap: Snap, find: Find, broke: Breakdowns, plan: Plan, report: Report, guide: Guide };
const ICON = {
  home: <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />,
  snap: <><path d="M4 7h3l2-3h6l2 3h3v13H4z" /><circle cx="12" cy="13" r="4" /></>,
  find: <><circle cx="10" cy="10" r="6" /><path d="M15 15l6 6" /></>,
  broke: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></>,
  plan: <path d="M3 17h18l-2 4H5zM6 17V9h12v8M9 9V5h6v4" />,
  report: <path d="M6 3h9l4 4v14H6zM9 12h7M9 16h7" />,
  guide: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
};
const viewFromHash = () => { const v = location.hash.slice(1); return VIEWS[v] ? v : "home"; };

export default function App() {
  useSyncExternalStore(store.subscribe, store.getVersion);
  const [lang, setL] = useState(getLang());
  const [view, setView] = useState(viewFromHash);
  const [toastMsg, setToastMsg] = useState("");
  const mainRef = useRef(null);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    let timer;
    return onToast((msg) => { setToastMsg(msg); clearTimeout(timer); timer = setTimeout(() => setToastMsg(""), 3500); });
  }, []);

  // Visual cue when another device's changes arrive.
  useEffect(() => store.onRemoteUpdate(() => {
    const m = mainRef.current; if (!m) return;
    m.classList.remove("flash"); void m.offsetWidth; m.classList.add("flash");
  }), []);

  useEffect(() => {
    const h = () => setView(viewFromHash());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  const as = store.getAs();
  const dev = store.getDevice();
  const View = VIEWS[view];

  function go(v) { setView(v); location.hash = v; mainRef.current?.focus(); }

  return (
    <>
      <a href="#main" className="skip" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>{t("skip")}</a>
      <header className="strip">
        <div className="strip-row">
          <div className="brand">Ledger North<small>{as === "region" ? t("regional") : t("garage", as)}</small></div>
          <div className="controls">
            <label className="sr" htmlFor="asSel">Viewing as</label>
            <select id="asSel" value={as} onChange={(e) => store.setAs(e.target.value)}>
              <option value="region">{t("regional")}</option>
              {COMMUNITIES.map((c) => <option key={c.name} value={c.name}>{t("garage", c.name)}</option>)}
            </select>
            <label className="sr" htmlFor="langSel">Language</label>
            <select id="langSel" value={lang} onChange={(e) => { setLang(e.target.value); setL(e.target.value); }}>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="iu" disabled>ᐃᓄᒃᑎᑐᑦ (with community review)</option>
            </select>
            <span className="outbox" role="status" hidden={!dev.outboxCount}>{t("waiting", dev.outboxCount)}</span>
            <button className="conn" data-on={dev.online} onClick={() => store.setOnline(!dev.online)}
              aria-label={dev.online ? "Online. Tap to simulate going offline." : "Offline. Tap to reconnect and sync."}>
              <span className="dot" aria-hidden="true" /><span aria-live="polite">{dev.online ? t("online") : t("offline")}</span>
            </button>
          </div>
        </div>
      </header>
      <nav className="tabs" aria-label="Sections">
        {Object.keys(VIEWS).map((v) => (
          <button key={v} aria-current={v === view ? "page" : undefined} onClick={() => go(v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{ICON[v]}</svg>
            <span>{t(v)}</span>
          </button>
        ))}
      </nav>
      <main id="main" tabIndex={-1} ref={mainRef}>
        <View key={as} />
      </main>
      <div className="toast" role="status" aria-live="polite" hidden={!toastMsg}>{toastMsg}</div>
    </>
  );
}
