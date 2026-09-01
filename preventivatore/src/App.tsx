import { useEffect, useMemo, useState } from "react";
import { bom, components, meta } from "./lib/data";
import { computeQuote, DEFAULT_SETTINGS } from "./lib/pricing";
import type { ProjectTrackerType } from "./lib/types";
import { fetchConfirmedPrices, supabase, upsertConfirmedPrice } from "./lib/supabase";
import { ConfigForm } from "./components/ConfigForm";
import { QuoteSummary } from "./components/QuoteSummary";
import { ComponentImpactTable } from "./components/ComponentImpactTable";
import { BomDetail } from "./components/BomDetail";

type Tab = "config" | "quote" | "prices" | "bom";

export default function App() {
  const [tab, setTab] = useState<Tab>("config");
  const [rows, setRows] = useState<ProjectTrackerType[]>(
    meta.example_project.tracker_types.map((t) => ({ ...t })),
  );
  const [marginPct, setMarginPct] = useState(0);
  const [confirmed, setConfirmed] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchConfirmedPrices().then(setConfirmed);
  }, []);

  const quote = useMemo(
    () =>
      computeQuote(
        { tracker_types: rows.filter((r) => r.count > 0), margin_pct: marginPct },
        components,
        bom,
        DEFAULT_SETTINGS,
        confirmed,
      ),
    [rows, marginPct, confirmed],
  );

  const onConfirm = async (code: string, priceEur: number) => {
    setConfirmed((c) => ({ ...c, [code]: priceEur }));
    try {
      await upsertConfirmedPrice(code, priceEur);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Preventivatore Tracker TTS 1303</h1>
        <p>
          Distinta {meta.source_file} · {meta.counts.components} componenti ·{" "}
          {meta.counts.bom_lines} righe di distinta
        </p>
      </header>

      <nav>
        <button aria-selected={tab === "config"} onClick={() => setTab("config")}>Configurazione</button>
        <button aria-selected={tab === "quote"} onClick={() => setTab("quote")}>Preventivo</button>
        <button aria-selected={tab === "prices"} onClick={() => setTab("prices")}>Prezzi</button>
        <button aria-selected={tab === "bom"} onClick={() => setTab("bom")}>Dettaglio distinta</button>
      </nav>

      {tab === "config" && (
        <ConfigForm rows={rows} marginPct={marginPct} onChange={setRows} onMargin={setMarginPct} />
      )}
      {tab === "quote" && <QuoteSummary quote={quote} />}
      {tab === "prices" && (
        <ComponentImpactTable
          quote={quote}
          confirmed={confirmed}
          onConfirm={onConfirm}
          canWrite={!!supabase}
        />
      )}
      {tab === "bom" && <BomDetail confirmed={confirmed} />}
    </div>
  );
}
