import type { Confidence } from "../lib/types";
import { fmtPct } from "../lib/format";

const LABELS: Record<Confidence, string> = {
  alta: "Prezzo confermato / a catalogo",
  media: "Calcolato peso × €/kg (schede)",
  bassa: "Stima da peso (bulloneria)",
  nulla: "Prezzo mancante",
};

export function ConfidenceBar({ pct }: { pct: Record<Confidence, number> }) {
  const order: Confidence[] = ["alta", "media", "bassa", "nulla"];
  return (
    <div>
      <div className="confbar">
        {order.map((k) =>
          pct[k] > 0 ? (
            <span key={k} className={`seg-${k}`} style={{ width: `${pct[k]}%` }} title={`${LABELS[k]} — ${fmtPct(pct[k])}`}>
              {pct[k] >= 8 ? fmtPct(pct[k]) : ""}
            </span>
          ) : null,
        )}
      </div>
      <div className="conflegend">
        {order.map((k) => (
          <span key={k}>
            <span className={`dot seg-${k}`} />
            {LABELS[k]} · <b>{fmtPct(pct[k])}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
