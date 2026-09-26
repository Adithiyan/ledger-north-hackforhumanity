import * as store from "../store/store.js";
import { COMMUNITIES } from "../data/seed.js";

// The community a view is about: the device's own, or the one the regional user picked.
export function myCommunity() {
  const as = store.getAs();
  return as === "region" ? store.getPref("focus") || "Inukjuak" : as;
}

// Only shown in the regional view.
export function FocusSelect({ label = "Community", style }) {
  if (store.getAs() !== "region") return null;
  return (
    <>
      <label className="f" htmlFor="focusSel">{label}</label>
      <select className="field" id="focusSel" style={style} value={myCommunity()}
        onChange={(e) => store.setPref("focus", e.target.value)}>
        {COMMUNITIES.map((c) => <option key={c.name}>{c.name}</option>)}
      </select>
    </>
  );
}
