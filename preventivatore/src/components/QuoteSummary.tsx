import type { QuoteResult } from "../lib/types";
import { fmtEur, fmtInt } from "../lib/format";
import { ConfidenceBar } from "./ConfidenceBar";

export function QuoteSummary({ quote }: { quote: QuoteResult }) {
  const t = quote.totals;
  return (
    <>
      <div className="panel">
        <h2>Preventivo — riepilogo</h2>
        <div className="grid-cards">
          <div className="card">
            <div className="lbl">Tracker</div>
            <div className="big">{fmtInt(t.nTracker)}</div>
          </div>
          <div className="card">
            <div className="lbl">Materiale</div>
            <div className="big">{fmtEur(t.materialCost)}</div>
          </div>
          <div className="card">
            <div className="lbl">Quadri motore (forfait 170 €)</div>
            <div className="big">{fmtEur(t.quadroMotoreCost)}</div>
          </div>
          <div className="card">
            <div className="lbl">Costo totale</div>
            <div className="big">{fmtEur(t.costTotal)}</div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="totrow">
            <span>Materiale (esploso da distinta)</span>
            <span>{fmtEur(t.materialCost)}</span>
          </div>
          <div className="totrow">
            <span>Quadro motore — {fmtInt(t.nTracker)} × 170,00 €</span>
            <span>{fmtEur(t.quadroMotoreCost)}</span>
          </div>
          <div className="totrow">
            <span>Costo totale</span>
            <span>{fmtEur(t.costTotal)}</span>
          </div>
          <div className="totrow">
            <span>Margine {t.marginPct}%</span>
            <span>{fmtEur(t.sellTotal - t.costTotal)}</span>
          </div>
          <div className="totrow grand">
            <span>Prezzo di vendita</span>
            <span>{fmtEur(t.sellTotal)}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Puntualità del preventivo</h2>
        <ConfidenceBar pct={t.confidencePct} />
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          {t.bomLinesMissingPrice > 0 ? (
            <span className="warn">
              {fmtInt(t.bomLinesMissingPrice)} righe di distinta su {fmtInt(t.bomLines)} senza prezzo.
            </span>
          ) : (
            <>Tutte le {fmtInt(t.bomLines)} righe di distinta hanno un costo.</>
          )}{" "}
          Spostare valore da <b>media/bassa</b> a <b>alta</b> confermando i prezzi nella scheda «Prezzi».
        </p>
      </div>

      <div className="panel">
        <h2>Dettaglio per tipologia</h2>
        <table>
          <thead>
            <tr>
              <th>Tipologia</th>
              <th className="num">N.</th>
              <th className="num">Materiale / tracker</th>
              <th className="num">Quadro motore</th>
              <th className="num">Subtotale</th>
              <th className="num">Righe s/prezzo</th>
            </tr>
          </thead>
          <tbody>
            {quote.trackerTypes.map((tt) => (
              <tr key={tt.modules}>
                <td>Tracker {tt.modules} moduli</td>
                <td className="num">{fmtInt(tt.count)}</td>
                <td className="num">{fmtEur(tt.materialPerTracker)}</td>
                <td className="num">{fmtEur(tt.quadroMotore)}</td>
                <td className="num">{fmtEur(tt.subtotal)}</td>
                <td className="num">{tt.linesMissingPrice || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
