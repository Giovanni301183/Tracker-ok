/**
 * Motore di preventivo — funzione pura, nessuna dipendenza da React/Supabase.
 * Rispecchia la logica di riferimento in `scripts/etl.py` (§3–§5 del PRD).
 */
import type {
  BomLine,
  Component,
  Confidence,
  ExplodedLine,
  PriceSource,
  Project,
  PricingSettings,
  QuoteResult,
} from "./types";

export const DEFAULT_SETTINGS: PricingSettings = {
  excludedAssemblies: [
    "kit quadri area",
    "kit quadri centralina meteo",
    "kit quadri inverter",
    "sensori meteo",
    "kit quadro motore",
  ],
  excludedCategories: ["Quadristica ed elettrico", "Moduli fotovoltaici"],
  quadroMotoreEur: 170,
};

const CONFIDENCE: Record<PriceSource, Confidence> = {
  confermato: "alta",
  listino: "alta",
  scheda_commerciale: "alta",
  scheda_struttura: "media",
  scheda_pezzi_speciali: "media",
  stima_peso: "bassa",
  mancante: "nulla",
  senza_codice: "nulla",
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Prezzi confermati che arrivano da Supabase: mappa code -> € .
 * Hanno priorità assoluta sulla cascata dell'ETL.
 */
export type ConfirmedPrices = Record<string, number>;

function resolveUnitCost(
  comp: Component | undefined,
  confirmed: ConfirmedPrices,
): { unit: number; source: PriceSource } {
  if (comp?.code && confirmed[comp.code] != null) {
    return { unit: confirmed[comp.code], source: "confermato" };
  }
  if (!comp) return { unit: 0, source: "senza_codice" };
  if (comp.computed_cost != null && comp.computed_cost > 0) {
    return { unit: comp.computed_cost, source: comp.price_source };
  }
  return { unit: 0, source: "mancante" };
}

/** Esplode la distinta per un singolo tracker della taglia indicata. */
export function explodeTracker(
  bom: BomLine[],
  componentsByCode: Map<string, Component>,
  modules: number,
  settings: PricingSettings,
  confirmed: ConfirmedPrices = {},
): ExplodedLine[] {
  const asseSection = `${modules} MODULI 1303`;
  const exAsm = new Set(settings.excludedAssemblies);
  const exCat = new Set(settings.excludedCategories);
  const out: ExplodedLine[] = [];

  for (const bl of bom) {
    if (exAsm.has(bl.assembly)) continue;
    if (bl.already_loaded) continue;
    if (exCat.has(bl.category)) continue;
    if (bl.assembly === "ASSI DI ROTAZIONE 1303" && bl.section !== asseSection) continue;

    const cfg = bl.qty_by_config[String(modules)];
    const qty = cfg != null ? cfg : bl.qty_base;
    if (!qty) continue;

    const comp = bl.code ? componentsByCode.get(bl.code) : undefined;
    const { unit, source } = resolveUnitCost(comp, confirmed);
    out.push({
      code: bl.code,
      description: bl.description,
      category: bl.category,
      assembly: bl.assembly,
      qty,
      unitCost: unit,
      amount: r2(qty * unit),
      priceSource: source,
      confidence: CONFIDENCE[source],
      priced: unit > 0,
    });
  }
  return out;
}

export function computeQuote(
  project: Project,
  components: Component[],
  bom: BomLine[],
  settings: PricingSettings = DEFAULT_SETTINGS,
  confirmed: ConfirmedPrices = {},
): QuoteResult {
  const byCode = new Map<string, Component>();
  for (const c of components) if (c.code) byCode.set(c.code, c);

  const confAmount: Record<Confidence, number> = { alta: 0, media: 0, bassa: 0, nulla: 0 };
  const perComponent = new Map<
    string,
    { code: string | null; description: string; qty: number; unitCost: number; amount: number; priceSource: PriceSource; confidence: Confidence }
  >();

  let materialTotal = 0;
  let bomLines = 0;
  let bomLinesMissing = 0;

  const trackerTypes = project.tracker_types.map((t) => {
    const lines = explodeTracker(bom, byCode, t.modules, settings, confirmed);
    const material = r2(lines.reduce((s, l) => s + l.amount, 0));
    const missing = lines.filter((l) => !l.priced && l.qty).length;

    for (const l of lines) {
      confAmount[l.confidence] += l.amount * t.count;
      const key = l.code ?? `__${l.description}`;
      const agg = perComponent.get(key) ?? {
        code: l.code,
        description: l.description,
        qty: 0,
        unitCost: l.unitCost,
        amount: 0,
        priceSource: l.priceSource,
        confidence: l.confidence,
      };
      agg.qty += l.qty * t.count;
      agg.amount = r2(agg.amount + l.amount * t.count);
      perComponent.set(key, agg);
    }

    materialTotal += material * t.count;
    bomLines += lines.length;
    bomLinesMissing += missing;

    const quadro = settings.quadroMotoreEur * t.count;
    return {
      modules: t.modules,
      count: t.count,
      materialPerTracker: material,
      quadroMotore: quadro,
      subtotal: r2(material * t.count + quadro),
      lines,
      linesMissingPrice: missing,
    };
  });

  const nTracker = project.tracker_types.reduce((s, t) => s + t.count, 0);
  const quadroCost = settings.quadroMotoreEur * nTracker;
  const costTotal = r2(materialTotal + quadroCost);
  const marginPct = project.margin_pct ?? 0;
  const sellTotal = r2(costTotal * (1 + marginPct / 100));

  const pct = (v: number) => (materialTotal ? r2((100 * v) / materialTotal) : 0);

  return {
    trackerTypes,
    extras: [
      { label: "Quadro motore (forfait)", unit: settings.quadroMotoreEur, qty: nTracker, amount: r2(quadroCost) },
    ],
    totals: {
      nTracker,
      materialCost: r2(materialTotal),
      quadroMotoreCost: r2(quadroCost),
      costTotal,
      marginPct,
      sellTotal,
      confidenceAmount: {
        alta: r2(confAmount.alta),
        media: r2(confAmount.media),
        bassa: r2(confAmount.bassa),
        nulla: r2(confAmount.nulla),
      },
      confidencePct: {
        alta: pct(confAmount.alta),
        media: pct(confAmount.media),
        bassa: pct(confAmount.bassa),
        nulla: pct(confAmount.nulla),
      },
      bomLines,
      bomLinesMissingPrice: bomLinesMissing,
    },
    byComponent: [...perComponent.values()].sort((a, b) => b.amount - a.amount),
  };
}
