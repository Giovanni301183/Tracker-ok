# preventivatore/

Web app React + Vite + TypeScript. Il PRD completo è nel
[`README.md`](../README.md) del repo; il modello dati in
[`docs/DATA-MODEL.md`](../docs/DATA-MODEL.md).

```
scripts/etl.py          ETL: Excel rev.NN -> src/data/*.json + supabase/seed.sql + ../preventivo-demo-data.js
src/lib/pricing.ts       motore di preventivo (funzione pura) — cuore dell'app
src/lib/types.ts         tipi condivisi
src/lib/data.ts          import dei JSON statici
src/lib/supabase.ts      client + prezzi confermati (opzionale: l'app gira anche senza)
src/components/          ConfigForm, QuoteSummary, ConfidenceBar, ComponentImpactTable, BomDetail
src/App.tsx              4 schede: Configurazione / Preventivo / Prezzi / Dettaglio distinta
supabase/schema.sql      DDL + RLS
supabase/seed.sql        INSERT anagrafici (generato)
```

## Avvio

```bash
npm install
python scripts/etl.py            # richiede: pip install openpyxl
cp .env.example .env             # opzionale: URL + anon key Supabase
npm run dev                      # http://localhost:5173
npm test                         # vitest sul motore di preventivo
```

Senza `.env` l'app funziona in sola lettura sui dati statici (nessun
prezzo confermato, nessun salvataggio preventivi).

## Aggiornare i dati a una nuova revisione Excel

```bash
python scripts/etl.py --xlsx "../LISTINO componenti tracker TTS 1303 - rev.28 (...).xlsx"
git add src/data supabase/seed.sql ../preventivo-demo-data.js
git commit -m "dati: allineamento a rev.28"
```
