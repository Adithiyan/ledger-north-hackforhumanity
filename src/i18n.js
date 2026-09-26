// EN/FR UI strings. Inuktitut stays disabled until written and reviewed by speakers — never machine-translate it.
import { getPref, setPref } from "./store/store.js";

const T = {
  en: {
    board: "Region", snap: "Snap ledger", find: "Find a part", broke: "Breakdowns", plan: "Sealift plan", report: "Report",
    online: "Online", offline: "Offline — saving on this device", waiting: (n) => `${n} waiting to sync`,
    regional: "KRG regional view", garage: (c) => `${c} municipal garage`,
    normal: "✓ Normal", reduced: "● Reduced", critical: "⚠ Critical",
    boardTitle: "Water equipment across Nunavik", snapTitle: "Snap a ledger page", findTitle: "Find a part",
    brokeTitle: (c) => `Breakdowns in ${c}`, planTitle: (c) => `Sealift order for ${c}`, reportTitle: "Evidence report",
    skip: "Skip to content",
  },
  fr: {
    board: "Région", snap: "Photo du registre", find: "Trouver une pièce", broke: "Pannes", plan: "Plan de ravitaillement", report: "Rapport",
    online: "En ligne", offline: "Hors ligne — enregistré sur cet appareil", waiting: (n) => `${n} en attente de synchronisation`,
    regional: "Vue régionale ARK", garage: (c) => `Garage municipal de ${c}`,
    normal: "✓ Normal", reduced: "● Réduit", critical: "⚠ Critique",
    boardTitle: "Équipement d'eau au Nunavik", snapTitle: "Photographier une page du registre", findTitle: "Trouver une pièce",
    brokeTitle: (c) => `Pannes à ${c}`, planTitle: (c) => `Commande de ravitaillement pour ${c}`, reportTitle: "Rapport de preuves",
    skip: "Aller au contenu",
  },
};

let lang = getPref("lang") || "en";
export const getLang = () => lang;
export function setLang(l) { lang = l; setPref("lang", l); }
export function t(k, ...args) {
  const v = (T[lang] || T.en)[k] ?? T.en[k];
  return typeof v === "function" ? v(...args) : v;
}
