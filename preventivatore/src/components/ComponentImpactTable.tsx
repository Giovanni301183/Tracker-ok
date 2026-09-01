import { useMemo, useState } from "react";
import type { QuoteResult } from "../lib/types";
import { fmtEur, fmtInt, fmtNum } from "../lib/format";

const SRC_LABEL: Record<string, string> = {
  confermato: "confermato",
  listino: "listino",
  scheda_commerciale: "catalogo",
  scheda_struttura: "peso × €/kg",
  scheda_pezzi_speciali: "peso × €/kg",
  stima_peso: "stima peso",
  mancante: "mancante",
  senza_codice: "senza codice",
};

interface Props {
  quote: QuoteResult;
  confirmed: Record<string, number>;
  onConfirm: (code: string, priceEur: number) => void;
  canWrite: boolean;
}

export function ComponentImpactTable({ quote, confirmed, onConfirm, canWrite }: Props) {
  const [onlyUnconfirmed, setOnlyUnconfirmed] = useState(true);
  const [limit, setLimit] = useState(20);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    let r = quote.byComponent;
    if (onlyUnconfirmed) r = r.filter((x) => x.confidence !== "alta");
    return r.slice(0, limit);
  }, [quote, onlyUnconfirmed, limit]);

  return (
    <div className="panel">
      <h2>Componenti per impatto sul preventivo</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          <input
            type="checkbox"
            checked={onlyUnconfirmed}
            onChange={(e) => setOnlyUnconfirmed(e.target.checked)}
          />{" "}
          solo prezzi non confermati
        </label>
        <label>
          mostra&nbsp;
          <select value={limit} onChange={(e) => setLimit(+e.target.value)}>
            {[20, 50, 100, 999].map((n) => (
              <option key={n} value={n}>{n === 999 ? "tutti" : n}</option>
            ))}
          </select>
        </label>
        {!canWrite && <span className="pill">Supabase non configurato — sola lettura</span>}
      </div>

      <table>
        <thead>
          <tr>
            <th>Codice</th>
            <th>Descrizione</th>
            <th className="num">Q.tà lotto</th>
            <th className="num">Costo unit.</th>
            <th className="num">Importo</th>
            <th>Fonte</th>
            <th className="num">Prezzo confermato</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => {
            const key = x.code ?? x.description;
            return (
              <tr key={key}>
                <td><code>{x.code ?? "—"}</code></td>
                <td>{x.description}</td>
                <td className="num">{fmtInt(x.qty)}</td>
                <td className="num">{fmtNum(x.unitCost)}</td>
                <td className="num">{fmtEur(x.amount)}</td>
                <td><span className="pill">{SRC_LABEL[x.priceSource] ?? x.priceSource}</span></td>
                <td className="num">
                  {x.code ? (
                    <>
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        placeholder={confirmed[x.code] != null ? String(confirmed[x.code]) : "—"}
                        value={draft[x.code] ?? ""}
                        disabled={!canWrite}
                        onChange={(e) => setDraft({ ...draft, [x.code!]: e.target.value })}
                      />
                      <button
                        className="ghost"
                        disabled={!canWrite || !draft[x.code]}
                        onClick={() => {
                          onConfirm(x.code!, +draft[x.code!]);
                          setDraft({ ...draft, [x.code!]: "" });
                        }}
                      >
                        OK
                      </button>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
