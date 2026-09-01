const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});
const n0 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const n2 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

export const fmtEur = (v: number) => eur.format(v || 0);
export const fmtInt = (v: number) => n0.format(v || 0);
export const fmtNum = (v: number) => n2.format(v || 0);
export const fmtPct = (v: number) => `${n2.format(v || 0)}%`;
