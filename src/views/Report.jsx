// F7 Evidence report.
import * as store from "../store/store.js";
import { DAY } from "../store/derive.js";
import { myCommunity, FocusSelect } from "./common.jsx";
import { toast } from "../toast.js";
import { t } from "../i18n.js";

export default function Report() {
  const ev = store.getEvents(); const me = myCommunity(); const since = Date.now() - 90 * DAY;
  const fixed = new Map(ev.filter((e) => e.type === "fixed").map((e) => [e.ref, e.ts]));
  const bs = ev.filter((e) => e.type === "breakdown" && e.community === me && e.ts >= since);
  const days = (b) => ((fixed.get(b.id) || Date.now()) - b.ts) / DAY;
  const total = Math.round(bs.reduce((s, b) => s + days(b), 0));
  const longest = bs.length ? Math.round(Math.max(...bs.map(days))) : 0;
  const open = bs.filter((b) => !fixed.has(b.id)).length;
  const trucks = bs.filter((b) => /truck/.test(b.asset)).length;
  const reqs = ev.filter((e) => e.type === "request" && e.to === me).length;
  const text = `Equipment reliability summary: ${me}, last 90 days

• ${bs.length} breakdowns logged (${trucks} water or sewage trucks, ${bs.length - trucks} plant equipment).
• ${total} equipment-days out of service in total; the longest single outage was ${longest} days.
• ${open} still out of service today.
• ${reqs} spare parts requested from other communities.

These records support the municipality's case for its water pipeline (Resolution #2025-29): the trucked system depends on equipment that fails often and on parts that take weeks to arrive.
Source: Ledger North breakdown log. Sample data for demonstration.`;

  return (
    <>
      <h1>{t("reportTitle")}</h1>
      <p className="lede">A plain summary of breakdowns and delays, ready to attach to funding applications.</p>
      <FocusSelect style={{ maxWidth: 320 }} />
      <pre className="report">{text}</pre>
      <div className="btn-row">
        <button className="btn" onClick={() => { navigator.clipboard?.writeText(text); toast("Report copied."); }}>Copy report</button>
      </div>
    </>
  );
}
