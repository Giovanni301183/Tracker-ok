import { useMemo, useState } from "react";
import { bom, components, MODULE_SIZES } from "../lib/data";
import { DEFAULT_SETTINGS, explodeTracker } from "../lib/pricing";
import { fmtEur, fmtInt, fmtNum } from "../lib/format";
import type { Component } from "../lib/types";

export function BomDetail({ confirmed }: { confirmed: Record<string, number> }) {
  const [modules, setModules] = useState(MODULE_SIZES[MODULE_SIZES.length - 2] ?? 36);
  const byCode = useMemo(() => {
    const m = new Map<string, Component>();
    for (const c of components) if (c.code) m.set(c.code, c);
    return m;
  }, []);
  const lines = useMemo(
    () => explodeTracker(bom, byCode, modules, DEFAULT_SETTINGS, confirmed),
    [modules, byCode, confirmed],
  );
  const total = lines.reduce((s, l) => s + l.amount, 0);

  const exportCsv = () => {
    const head = ["assieme", "codice", "descrizione", "qta", "costo_unitario", "importo", "fonte_prezzo"];
    const body = lines.map((l) =>
      [l.assembly, l.code ?? "", l.description, l.qty, l.unitCost, l.amount, l.priceSource]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `distinta_tracker_${modules}mod.csv`;
    a.click();
  };

  return (
    <div className="panel">
      <h2>Dettaglio distinta — un tracker</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
        <label>
          Taglia&nbsp;
          <select value={modules} onChange={(e) => setModules(+e.target.value)}>
            {MODULE_SIZES.map((m) => (
              <option key={m} value={m}>{m} moduli</option>
            ))}
          </select>
        </label>
        <button className="ghost" onClick={exportCsv}>Esporta CSV</button>
        <span style={{ flex: 1 }} />
        <b>{fmtInt(lines.length)} righe · {fmtEur(total)} / tracker</b>
      </div>
      <table>
        <thead>
          <tr>
            <th>Assieme</th>
            <th>Codice</th>
            <th>Descrizione</th>
            <th className="num">Q.tà</th>
            <th className="num">Costo unit.</th>
            <th className="num">Importo</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="muted">{l.assembly}</td>
              <td><code>{l.code ?? "—"}</code></td>
              <td>{l.description}{!l.priced && <span className="warn"> · s/prezzo</span>}</td>
              <td className="num">{fmtNum(l.qty)}</td>
              <td className="num">{fmtNum(l.unitCost)}</td>
              <td className="num">{fmtEur(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
