# Preventivatore Tracker TTS 1303

Web app per generare un **preventivo puntuale** di un impianto di tracker
fotovoltaici TTS 1303, partendo dalla configurazione che sceglie l'utente
(quanti tracker, di quante taglie) ed esplodendo automaticamente la
distinta base valorizzata.

Questo repository contiene anche i **workbook Excel** di listino/distinta
(`LISTINO componenti tracker TTS 1303 - rev.NN.xlsx`) che sono la sorgente
dei dati: l'app non sostituisce il file Excel, lo **legge** e lo rende
interrogabile.

- Codice sorgente app: [`preventivatore/`](preventivatore/)
- Modello dati di dettaglio: [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md)

---

# PRD — Product Requirements Document

## 1. Obiettivo

Oggi il preventivo di un parco tracker si fa a mano sul file Excel
`LISTINO ... rev.NN.xlsx`: si prende la distinta di ogni assieme, si
moltiplicano le quantità per la taglia del tracker, si sommano i prezzi
unitari (colonna che **l'ufficio acquisti deve ancora compilare**), si
ripete per ogni tipologia di tracker del lotto. È lento e poco
verificabile.

L'app deve permettere di:

1. Inserire la **configurazione di progetto**: un elenco di righe
   «`N` tracker da `M` moduli».
   Esempio reale (69 tracker):

   | Tracker | Moduli |
   |--------:|-------:|
   | 4       | 12     |
   | 1       | 18     |
   | 20      | 20     |
   | 5       | 22     |
   | 34      | 36     |
   | 5       | 40     |

2. **Esplodere la distinta** per ciascuna taglia (12 / 18 / 20 / 22 / 36 /
   40 moduli) — sono esattamente le sei configurazioni già previste nel
   foglio `DISTINTA COMPLETA` (colonne `Q.tà NN mod`).

3. **Valorizzare** ogni riga con il costo unitario del componente e
   restituire: costo per tracker, costo per tipologia, costo totale del
   lotto, prezzo di vendita con margine.

4. Dichiarare in modo trasparente la **puntualità del preventivo**:
   quanta parte del valore poggia su prezzi confermati e quanta su stime.
   Questo è il requisito centrale (vedi §5).

## 2. Perimetro (v1)

### Incluso

| Assieme (foglio DISTINTA)     | Come scala                                            |
|-------------------------------|------------------------------------------------------|
| `PILASTRO MOTORE`             | 1 per tracker (quantità base)                         |
| `PILASTRO CUSCINETTO`         | per taglia: 2 / 4 / 4 / 4 / 8 / 10 pilastri           |
| `ASSI DI ROTAZIONE 1303`      | **solo** la sezione `"{M} MODULI 1303"` della taglia  |
| `KIT OMEGA+pannelli`          | per taglia (colonne `Q.tà NN mod`); pannelli PV esclusi di default |
| `KIT FINE CORSA`              | 1 kit per tracker                                     |
| `KIT INCLINOMETRO`            | 1 kit per tracker                                     |
| **Quadro motore** (forfait)   | **1 per tracker × 170,00 €** (voce fissa, vedi sotto) |

### Escluso in v1 (parte elettrica)

- `kit quadri area` — quadro area
- `kit quadri centralina meteo` — quadri generali / centralina meteo
- `kit quadri inverter`
- `sensori meteo` — sensoristica (piranometro, anemometro, termometri…)
- `kit quadro motore` come distinta di dettaglio → **sostituito** dalla
  voce forfettaria **170 € per tracker**
- categoria `Quadristica ed elettrico`
- categoria `Moduli fotovoltaici` (pannelli forniti dal cliente) —
  toggle, default OFF

Il perimetro è un **default configurabile**: gli assiemi/categorie
esclusi sono parametri, non `if` sparsi nel codice
(`preventivatore/src/lib/pricing.ts`).

## 3. Regole di esplosione della distinta

Per un tracker da `M` moduli, per ogni riga di `DISTINTA COMPLETA`:

1. **scarta** se `Assieme` è nel set escluso;
2. **scarta** se `Già caricato altrove = X` (riga già conteggiata in un
   altro assieme);
3. **scarta** se `Categoria` è nel set escluso;
4. se `Assieme = "ASSI DI ROTAZIONE 1303"`, **tieni solo** le righe con
   `Sezione = "{M} MODULI 1303"`;
5. **quantità effettiva** `q = Q.tà {M} mod` se la cella è valorizzata,
   altrimenti `Q.tà` (colonna base);
6. **scarta** se `q` è vuota o `0` — le righe con `Q.tà = 0` sono
   *referenze alternative* (varianti di spessore/lunghezza, travi IPEA),
   da attivare solo quando la variante viene scelta in configurazione
   (roadmap v2);
7. `importo riga = q × costo unitario componente` (vedi §4).

Costo di un tracker = Σ importi riga.
Costo tipologia = costo tracker × numero tracker + `170 € × numero tracker`.
Costo lotto = Σ tipologie.
Prezzo vendita = costo lotto × (1 + margine%).

## 4. Prezzo unitario del componente — cascata

I prezzi nel foglio `LISTINO` sono **quasi tutti vuoti** (2 su 198). Per
dare comunque un numero, il costo unitario si risolve in cascata, dal più
affidabile al più debole:

| # | Fonte (`price_source`)     | Come si ottiene                                                        | Affidabilità |
|---|---------------------------|----------------------------------------------------------------------|--------------|
| 1 | `confermato`              | valore inserito/validato a mano nell'app (tabella `component_prices`) | **alta**     |
| 2 | `listino`                 | prezzo già compilato nella colonna `Prezzo unitario €` del LISTINO   | **alta**     |
| 3 | `scheda_commerciale`      | articolo a catalogo con prezzo (`SCHEDA ELETTROMECCANICA` / `BULLONERIA`) | **alta** |
| 4 | `scheda_struttura`        | **calcolato**: `Costo acquisto (€) + Costo zincatura (€)` = peso × €/kg | media      |
| 5 | `scheda_pezzi_speciali`   | idem, per i pezzi «a pezzo»                                          | media        |
| 6 | `stima_peso`              | bulloneria priva di prezzo: `peso × 3,0 €/kg` (parametro)            | **bassa**    |
| 7 | `mancante`                | nessun dato → 0 € e riga segnalata                                   | nulla        |

Le fonti 4–5 usano i parametri già presenti nelle «schede» del workbook
(€/kg acquisto, €/kg zincatura, % maggiorazione zincatura): danno un
costo *teorico di fabbricazione*, ottimo come prima approssimazione ma da
confermare.

## 5. Puntualità del preventivo (requisito centrale)

Ogni preventivo espone un **indice di affidabilità**: la ripartizione %
del valore materiale per banda di affidabilità del prezzo.

Esempio, sul progetto da 69 tracker sopra (dati rev.27, prezzi non ancora
compilati):

```
COSTO TOTALE ............. 174.224,40 €
  materiale .............. 162.494,40 €
  quadri motore forfait ..  11.730,00 €   (69 × 170)
affidabilità prezzi:  alta 16,2%   media 78,8%   bassa 5,0%   nulla 0,0%
```

Lettura: il totale è *calcolabile* ma solo il 16% poggia su prezzi
fermi; il 79% è costo teorico peso×€/kg. Il lavoro dell'ufficio acquisti
è spostare quel 79% in «alta» inserendo i prezzi reali — e l'app mostra
**esattamente quali 20–30 codici** pesano di più, per dare priorità.

Metriche mostrate:

- barra impilata alta / media / bassa / nulla (% del valore);
- numero di righe di distinta senza prezzo;
- «Top 20 codici per impatto sul preventivo» con la loro fonte prezzo,
  ordinati per `Σ importo`, con campo editabile per il prezzo confermato;
- ricalcolo live all'inserimento di un prezzo.

## 6. Architettura

```
React 18 + Vite + TypeScript                → SPA, deploy statico
Supabase (Postgres + Auth + RLS)            → prezzi confermati, progetti salvati
seed dati (build-time) da Excel via openpyxl → components / bom / tracker_configs
GitHub + GitHub Actions                     → CI: rigenera il seed, lint, build, deploy
```

- **Dati anagrafici** (componenti, distinta, taglie) sono **statici**:
  generati da `scripts/etl.py` e committati come JSON in
  `src/data/`. Cambiano solo quando cambia il file Excel → si rilancia
  l'ETL, nuovo commit.
- **Dati mutabili** (prezzi confermati, progetti/preventivi salvati,
  parametri di perimetro) stanno su **Supabase**.
- Il **motore di preventivo è una funzione pura** in
  `src/lib/pricing.ts` (nessuna dipendenza da React o Supabase): stesso
  codice usato dai test.

### Flusso dati

```
Excel rev.NN ──(etl.py)──▶ src/data/*.json ─┐
                                             ├─▶ pricing.ts ──▶ QuoteResult ──▶ UI
Supabase component_prices ───(fetch)─────────┘
```

## 7. Modello dati (Supabase)

Dettaglio e DDL completo: [`preventivatore/supabase/schema.sql`](preventivatore/supabase/schema.sql).

| Tabella             | Ruolo                                                                    |
|---------------------|-------------------------------------------------------------------------|
| `components`        | anagrafica 198 componenti + `computed_cost` + `price_source` (da ETL)   |
| `bom_lines`         | 343 righe di distinta, `qty_by_config jsonb {12,18,20,22,36,40}`        |
| `tracker_configs`   | le 6 taglie (moduli → sezione assi)                                     |
| `component_prices`  | prezzo confermato per `code` (mutabile, RLS per utente/ruolo)           |
| `quotes`            | preventivo salvato: nome cliente, margine, timestamp, autore           |
| `quote_lines`       | configurazione salvata: `quote_id`, `modules`, `count`                  |
| `pricing_settings`  | override di perimetro/parametri (assiemi esclusi, €/kg bulloneria, forfait quadro) |

`components` / `bom_lines` / `tracker_configs` sono di sola lettura
dall'app (popolate da `supabase/seed.sql`). Le altre sono read/write con
Row Level Security.

## 8. Schermate

1. **Configurazione** — tabella editabile «n tracker × m moduli» +
   campo margine %; pulsante «Carica esempio 69 tracker».
2. **Preventivo** — card per tipologia (materiale/tracker, forfait
   quadro, subtotale), totale lotto, prezzo vendita; barra affidabilità.
3. **Prezzi** — elenco componenti con fonte e `computed_cost`, filtro
   «solo mancanti / solo stime», colonna «prezzo confermato» editabile,
   ordinamento per impatto sul preventivo corrente.
4. **Dettaglio distinta** — righe esplose di un tracker scelto
   (codice, descrizione, q, costo unitario, fonte, importo); export CSV.
5. **Salva / carica preventivo** (Supabase, richiede login).

## 9. Roadmap

- **v2** — scelta variante per assieme: trave IPEA alleggerita, assi
  2,5 mm, omega 1,8 mm (attivano le righe `Q.tà = 0`); altezze pilastro
  parametriche (il codice `...IPE140.NN` dipende dall'altezza da terra).
- **v2** — reinserimento parte elettrica come assiemi opzionali
  (quadri area/generali, sensoristica) con lo stesso meccanismo di
  perimetro.
- **v3** — versioni di preventivo e confronto; storicizzazione prezzi;
  import diretto del `.xlsx` da UI (upload → ETL server-side).
- **v3** — costi di produzione/montaggio/trasporto oltre al materiale.

## 10. Come si sviluppa

```bash
cd preventivatore
npm install
cp .env.example .env          # inserire URL e anon key Supabase
python scripts/etl.py         # rigenera src/data/*.json + supabase/seed.sql dal file Excel
npm run dev
```

Setup Supabase:

```bash
# nel SQL editor di Supabase, in ordine:
#   1) supabase/schema.sql
#   2) supabase/seed.sql   (rigenerato dall'ETL)
```

Aggiornare i dati quando esce una nuova revisione del file Excel:

```bash
python scripts/etl.py --xlsx "../LISTINO componenti tracker TTS 1303 - rev.28 (...).xlsx"
git add preventivatore/src/data preventivatore/supabase/seed.sql
git commit -m "dati: allineamento a rev.28"
```

## 11. Numeri di riferimento

Progetto di esempio 4×12 + 1×18 + 20×20 + 5×22 + 34×36 + 5×40 = 69 tracker
(rev.27, prezzi listino non ancora compilati):

```
materiale ................ 162.494,40 €
quadri motore (69 × 170) .  11.730,00 €
COSTO TOTALE ............. 174.224,40 €
affidabilità: alta 16,2% · media 78,8% · bassa 5,0% · nulla 0,0%
```

`python preventivatore/scripts/etl.py` ristampa questi numeri a ogni esecuzione.

---

## Licenza

Materiale proprietario e riservato di Terranova S.r.l. Vedi [`LICENSE`](LICENSE).
