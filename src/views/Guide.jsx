// Guide: the problem, how the app solves it, how to try the demo, and what is real vs sample.
import * as store from "../store/store.js";
import { t } from "../i18n.js";

const STEPS = [
  ["home", "Dashboard", "Your garage's digital ledger: every part, how many are in stock, what is missing and what will run low this winter."],
  ["snap", "Snap ledger", "Photograph a page of the paper ledger. The app reads it and you check each row before saving. Unclear rows are highlighted."],
  ["find", "Find a part", "See which communities have a missing part, sorted by how fast it can arrive by plane. Request it in one tap."],
];

export default function Guide() {
  const regionHref = `?as=region#home`;
  return (
    <>
      <h1>{t("guideTitle")}</h1>

      <section className="sheet">
        <h2 style={{ marginTop: 0 }}>The problem</h2>
        <ul>
          <li>In Nunavik, most homes get water by <strong>truck</strong>. When a truck or pump breaks, a community can go <strong>weeks</strong> with reduced or no water.</li>
          <li>Spare parts are tracked in <strong>paper ledgers</strong> kept by individual employees. No one else can search them, so a part in the next village is invisible.</li>
          <li>Internet is <strong>uneven</strong> (fibre in some places, satellite in others) and cuts out in storms.</li>
          <li>Heavy parts come once a year by <strong>sealift</strong> ship. Miss the order date and you wait a year or pay for air freight.</li>
        </ul>
      </section>

      <h2>How Ledger North helps</h2>
      <ol className="steps">
        <li><strong>Digitize the ledger.</strong> Staff keep writing on paper. A photo turns the page into digital entries they confirm, and each entry credits the writer.</li>
        <li><strong>Centralize the ledgers.</strong> Every community's ledger lands in one place, so a missing part can be found in another village in seconds.</li>
        <li><strong>Works offline.</strong> Entries save on the phone and sync when a connection returns.</li>
        <li><strong>Communities choose to share.</strong> Each community decides if others can see its stock.</li>
      </ol>

      <h2>What each tab does</h2>
      <ul className="list">
        {STEPS.map(([v, name, text]) => (
          <li key={v}><span><a href={"#" + v}><strong>{name}</strong></a><br /><span className="note">{text}</span></span></li>
        ))}
      </ul>

      <h2>Try the demo in 3 steps</h2>
      <p className="note">This page simulates two devices: a community garage and the regional office (KRG). Use two browser tabs side by side.</p>
      <ol className="steps">
        <li>
          <strong>Open the regional view in a second tab.</strong> This tab is the {store.getAs() === "region" ? "regional office" : `${store.getAs()} garage`}.
          <div className="btn-row"><a className="btn ghost" href={regionHref} target="_blank" rel="noopener">Open regional view in new tab</a></div>
        </li>
        <li>
          <strong>Snap a ledger page, then lose the connection.</strong> Open <a href="#snap">Snap ledger</a> and tap <em>Read this page</em> (no photo needed for the demo). Now tap <em>Online</em> at the top to go Offline, as in a blizzard, and tap <em>Save</em>. The entries wait on this device and the regional tab does not change.
        </li>
        <li>
          <strong>Come back online.</strong> Tap <em>Offline</em> again. The entries sync and the regional tab updates on its own.
        </li>
      </ol>
      <p className="note">Also try: on the <a href="#home">Dashboard</a>, tap <em>Find this part</em> on a missing part, request it, then approve the request in the regional tab.</p>
      <div className="btn-row"><button className="btn ghost" onClick={store.resetDemo}>Reset demo data</button></div>

      <h2>What is real, sample or simulated</h2>
      <div className="tablewrap"><table>
        <thead><tr><th scope="col">Real</th><th scope="col">Sample (made up for the demo)</th><th scope="col">Simulated</th></tr></thead>
        <tbody><tr>
          <td>Community names and locations · Inukjuak has 6 water trucks, Puvirnituq 5 (news reports) · Fibre in Kuujjuarapik, Umiujaq, Inukjuak, Puvirnituq · Live weather (Open-Meteo) · Sealift order date (estimated from the 2026 NEAS schedule)</td>
          <td>Truck counts elsewhere · Stock levels · Usage rates · Breakdowns · Flight frequencies</td>
          <td>Sync: two browser tabs stand in for two devices · Without an AI key, a demo reader returns a fixed sample page</td>
        </tr></tbody>
      </table></div>

      <h2>Words used in the app</h2>
      <dl className="gloss">
        <dt>Ledger</dt><dd>The paper book where garage staff write parts in and out.</dd>
        <dt>Sealift</dt><dd>The yearly summer ship that brings heavy goods. Heavy parts can only come this way.</dd>
        <dt>KRG</dt><dd>Kativik Regional Government, which supports public works across Nunavik.</dd>
        <dt>Sync</dt><dd>Sending entries saved offline to everyone else once a connection returns.</dd>
        <dt>Sharing</dt><dd>A community's choice to let others see its stock. Off by default.</dd>
      </dl>

      <h2>Whose data is it?</h2>
      <p>Each community owns its data and chooses what to share. The paper ledger stays with the employee who writes it, and entries credit the writer. Photos are only read by AI when online; for real use this would run on a no-training plan or a model hosted in Nunavik.</p>
    </>
  );
}
