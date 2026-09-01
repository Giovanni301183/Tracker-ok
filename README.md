# Tracker — LISTINO / DISTINTA componenti tracker TTS 1303

Workbook Excel per il listino e la distinta base dei componenti del
tracker **TTS 1303**, con storico completo delle revisioni.

## Contenuto del repository

| Percorso | Descrizione |
|----------|-------------|
| `LISTINO componenti tracker TTS 1303 - rev.27 (...).xlsx` | Revisione corrente del listino/distinta |
| `LISTINO componenti tracker TTS 1303 - rev.26 (...).xlsx` | Revisione precedente |
| `LIstino vecchio/` | Archivio delle revisioni storiche (rev.4 → rev.26) |

## Struttura del workbook

Il file è organizzato in **7 fogli** (scheda struttura, scheda travi,
scheda bulloneria, scheda elettromeccanica, scheda pezzi speciali,
listino, distinta). Ogni componente ha codice articolo, descrizione,
peso e costo; il costo finale è calcolato a partire dal peso netto,
dalla zincatura e dalle lavorazioni.

### Referenze alternative

Le varianti di un articolo sono inserite come **righe con Q.tà = 0**
subito sotto l'articolo base, così da restare associate alla stessa
posizione di distinta senza incidere sui totali.

## Come modificare i file

I workbook si editano con **[openpyxl](https://openpyxl.readthedocs.io/)**
(Python). L'automazione via Excel COM non è disponibile su questa
postazione.

```python
from openpyxl import load_workbook

wb = load_workbook("LISTINO componenti tracker TTS 1303 - rev.27 (bulloneria tabella unica).xlsx")
ws = wb["listino"]
# ... modifiche ...
wb.save("LISTINO componenti tracker TTS 1303 - rev.28 (...).xlsx")
```

Ad ogni modifica sostanziale si crea una **nuova revisione** con
numero incrementale e una breve nota tra parentesi nel nome file.

## Licenza

Materiale proprietario e riservato di Terranova S.r.l. Vedere il file
[`LICENSE`](LICENSE).
