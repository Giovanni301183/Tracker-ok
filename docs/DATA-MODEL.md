# Modello dati — dal workbook Excel alla web app

## 1. Il workbook sorgente

`LISTINO componenti tracker TTS 1303 - rev.NN.xlsx` — 7 fogli:

| Foglio                   | Contenuto                                                                 | Uso nell'app |
|--------------------------|--------------------------------------------------------------------------|--------------|
| `SCHEDA STRUTTURA`       | travi/assi a barra: kg/m, % zincatura, €/kg acquisto, €/kg zincatura; per ogni codice `Peso elemento`, `Costo acquisto (€)`, `Costo zincatura (€)` | costo unitario **calcolato** carpenteria a barra |
| `SCHEDA PEZZI SPECIALI`  | pezzi «a pezzo» (piastre, supporti, angolari, pali, aste): stessi parametri | costo unitario **calcolato** carpenteria a pezzo |
| `SCHEDA BULLONERIA`      | 31 codici minuteria: peso unitario (nominale DIN), `Costo (€/pz)` — quasi tutti vuoti | peso per la stima `peso × €/kg` |
| `SCHEDA ELETTROMECCANICA`| motoriduttore, cuscinetto, quadri/box, sensori: peso e `Costo (€/pz)` a mano | costo unitario **a catalogo** (2 valorizzati: motoriduttore 300 €, cuscinetto 13 €) |
| `LISTINO`                | 198 componenti unici: codice, descrizione, categoria, U.M., peso, `Prezzo unitario €` (**2/198 compilati**) | anagrafica `components` |
| `DISTINTA COMPLETA`      | 343 righe di distinta di tutti gli assiemi; colonne `Q.tà` e `Q.tà 12/18/20/22/36/40 mod`; flag `Già caricato altrove` | `bom_lines` |
| `RIEPILOGO`              | conteggi e legenda                                                       | — |

Note dal foglio `RIEPILOGO` recepite nell'ETL:

- righe di `DISTINTA` con **`Q.tà = 0`** = referenze alternative (varianti
  di spessore/lunghezza, travi `IPEA` alleggerite) poste sotto l'articolo
  base — si attivano solo se scelta la variante (roadmap v2);
- **`Già caricato altrove = X`** = riga evidenziata in rosso
  nell'originale, già conteggiata altrove → da non ricontare (3 righe:
  pilastro motore in `kit quadro motore`, quadro `B04601` in
  `kit quadri centralina meteo`, pilastro `...FQA` in `kit quadri area`);
- `Q.tà NN mod` valorizzate solo dove la quantità dipende dalla taglia.

## 2. Estrazione (`preventivatore/scripts/etl.py`)

`openpyxl` in sola lettura (Excel COM non disponibile). Prende la **revisione
più alta** presente nel repo (o `--xlsx <file>`) e scrive:

| Output                                   | Contenuto |
|------------------------------------------|-----------|
| `preventivatore/src/data/components.json` | 198 componenti + `computed_cost` + `price_source` + `price_confidence` |
| `preventivatore/src/data/bom.json`        | 343 righe con `qty_by_config` come oggetto `{ "12":…, "18":…, … }` |
| `preventivatore/src/data/tracker_configs.json` | 6 taglie (`modules`, `asse_section`, `label`) |
| `preventivatore/src/data/_meta.json`      | statistiche, ripartizione fonti prezzo, preventivo di esempio calcolato |
| `preventivatore/supabase/seed.sql`        | `INSERT` per le 3 tabelle anagrafiche |
| `preventivo-demo-data.js`                 | `window.__DEMO__ = {…}` per la demo statica |

### Cascata del costo unitario (`price_source`)

1. `confermato` — da `component_prices` (Supabase), **priorità assoluta**
2. `listino` — `LISTINO.Prezzo unitario €` se compilato
3. `scheda_commerciale` — `SCHEDA ELETTROMECCANICA` / `BULLONERIA` con prezzo
4. `scheda_struttura` — `Costo acquisto + Costo zincatura` (peso × €/kg)
5. `scheda_pezzi_speciali` — idem per i pezzi «a pezzo»
6. `stima_peso` — bulloneria: `peso × 3,0 €/kg` (parametro)
7. `mancante` — 0 € + segnalazione

Bande di affidabilità: 1–3 → **alta**, 4–5 → **media**, 6 → **bassa**,
7 → **nulla**.

## 3. Motore di preventivo (`preventivatore/src/lib/pricing.ts`)

Funzione pura. Per ogni tipologia `{ modules M, count C }`:

```
per ogni riga di bom_lines:
    scarta se assembly ∈ excludedAssemblies
    scarta se already_loaded
    scarta se category ∈ excludedCategories
    se assembly = "ASSI DI ROTAZIONE 1303": tieni solo section = "{M} MODULI 1303"
    q = qty_by_config[M]  se presente, altrimenti qty_base
    scarta se q vuota o 0
    importo = q × costo_unitario(code)          # cascata §2
costo_tracker      = Σ importi
costo_tipologia    = costo_tracker × C  +  170 € × C     # quadro motore forfait
```

`costo_lotto = Σ tipologie` · `prezzo_vendita = costo_lotto × (1 + margine%)`

Perimetro di default (`DEFAULT_SETTINGS`, sovrascrivibile da
`pricing_settings` su Supabase):

- `excludedAssemblies`: `kit quadri area`, `kit quadri centralina meteo`,
  `kit quadri inverter`, `sensori meteo`, `kit quadro motore`
- `excludedCategories`: `Quadristica ed elettrico`, `Moduli fotovoltaici`
- `quadroMotoreEur`: `170`

### Output (`QuoteResult`)

- `trackerTypes[]` — per tipologia: materiale/tracker, forfait quadro,
  subtotale, righe senza prezzo
- `totals` — `materialCost`, `quadroMotoreCost`, `costTotal`, `sellTotal`,
  **`confidencePct { alta, media, bassa, nulla }`** (la «puntualità»)
- `byComponent[]` — aggregato per codice sull'intero lotto, ordinato per
  `amount` decrescente → guida quali prezzi confermare per primi

## 4. Tabelle Supabase

Vedi [`preventivatore/supabase/schema.sql`](../preventivatore/supabase/schema.sql).
Anagrafiche (`components`, `bom_lines`, `tracker_configs`) sono di sola
lettura e ricaricate dall'ETL a ogni nuova revisione del file Excel.
Mutabili: `component_prices`, `pricing_settings`, `quotes`, `quote_lines`.

## 5. Numeri di riferimento (rev.27, prezzi non ancora compilati)

Progetto di esempio: 4×12 + 1×18 + 20×20 + 5×22 + 34×36 + 5×40 = **69 tracker**.

```
materiale ................ 162.494,40 €
quadri motore (69 × 170) .  11.730,00 €
COSTO TOTALE ............. 174.224,40 €
affidabilità: alta 16,2% · media 78,8% · bassa 5,0% · nulla 0,0%
```

184/198 componenti hanno un costo (131 da `scheda_struttura`, 21 da
`scheda_pezzi_speciali`, 30 `stima_peso`, 2 `scheda_commerciale`); i 14
mancanti sono voci elettriche/sensori fuori perimetro.
