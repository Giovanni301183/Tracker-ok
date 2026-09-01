import type { ProjectTrackerType } from "../lib/types";
import { MODULE_SIZES, meta } from "../lib/data";
import { fmtInt } from "../lib/format";

interface Props {
  rows: ProjectTrackerType[];
  marginPct: number;
  onChange: (rows: ProjectTrackerType[]) => void;
  onMargin: (v: number) => void;
}

export function ConfigForm({ rows, marginPct, onChange, onMargin }: Props) {
  const setRow = (i: number, patch: Partial<ProjectTrackerType>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    onChange([...rows, { modules: MODULE_SIZES[0], count: 1 }]);
  const delRow = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const loadExample = () =>
    onChange(meta.example_project.tracker_types.map((t) => ({ ...t })));

  const totalTrackers = rows.reduce((s, r) => s + (r.count || 0), 0);

  return (
    <div className="panel">
      <h2>Configurazione di progetto</h2>
      <table>
        <thead>
          <tr>
            <th>N. tracker</th>
            <th>Moduli / tracker</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <input
                  type="number"
                  min={0}
                  value={r.count}
                  onChange={(e) => setRow(i, { count: Math.max(0, +e.target.value) })}
                />
              </td>
              <td>
                <select
                  value={r.modules}
                  onChange={(e) => setRow(i, { modules: +e.target.value })}
                >
                  {MODULE_SIZES.map((m) => (
                    <option key={m} value={m}>
                      {m} moduli
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button className="ghost" onClick={() => delRow(i)}>
                  Rimuovi
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="ghost" onClick={addRow}>+ Riga</button>
        <button className="ghost" onClick={loadExample}>Carica esempio ({fmtInt(69)} tracker)</button>
        <span style={{ flex: 1 }} />
        <label>
          Margine&nbsp;
          <input
            type="number"
            min={0}
            step={0.5}
            value={marginPct}
            onChange={(e) => onMargin(Math.max(0, +e.target.value))}
          />
          &nbsp;%
        </label>
      </div>
      <p className="muted" style={{ marginBottom: 0 }}>
        Totale: <b>{fmtInt(totalTrackers)}</b> tracker · dati da{" "}
        <code>{meta.source_file}</code>
      </p>
    </div>
  );
}
