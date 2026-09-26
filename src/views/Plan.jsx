// F6 Sealift order plan.
import * as store from "../store/store.js";
import { EMBED, PARTS, SEA_ONLY } from "../data/seed.js";
import { poissonQ, stock } from "../store/derive.js";
import { myCommunity, FocusSelect } from "./common.jsx";
import { t } from "../i18n.js";

export default function Plan() {
  const ev = store.getEvents(); const me = myCommunity(); const rates = EMBED.rates[me] || {};
  const rows = Object.keys(PARTS).map((p) => {
    const [w, s] = rates[p] || [0, 0];
    const exp = w * 6 + s * 6; const need = poissonQ(exp); const on = stock(ev, me, p).q;
    return { p, exp, on, ord: Math.max(0, need - on) };
  }).sort((a, b) => b.ord - a.ord);
  const total = rows.filter((x) => x.ord > 0).length;
  return (
    <>
      <h1>{t("planTitle", me)}</h1>
      <p className="lede">Order by <strong>May 22, 2027</strong> to make the first sailing (estimated from the 2026 NEAS schedule). Quantities cover a year with a 95% chance of not running out, based on past use.</p>
      <FocusSelect style={{ maxWidth: 320 }} />
      <div className="sheet ledger" style={{ marginTop: 12 }}>
        <div className="tablewrap"><table>
          <thead><tr><th scope="col">Part</th><th scope="col">Used per year</th><th scope="col">In stock</th><th scope="col">Order</th><th scope="col">How</th></tr></thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.p}>
                <td>{PARTS[x.p]}</td><td>{x.exp.toFixed(1)}</td><td>{x.on}</td><td><strong>{x.ord}</strong></td>
                <td>{x.ord ? (SEA_ONLY[x.p] ? "Sealift only (too heavy to fly)" : "Sealift; fly only if urgent") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
      <p className="note">{total} parts to order. Usage history is sample data for the demo.</p>
    </>
  );
}
