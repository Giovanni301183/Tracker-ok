/** Tipi condivisi del preventivatore. */

export type PriceSource =
  | "confermato"
  | "listino"
  | "scheda_commerciale"
  | "scheda_struttura"
  | "scheda_pezzi_speciali"
  | "stima_peso"
  | "mancante"
  | "senza_codice";

export type Confidence = "alta" | "media" | "bassa" | "nulla";

export interface Component {
  code: string | null;
  description: string;
  category: string;
  uom: string;
  weight_kg: number | null;
  price_listino: number | null;
  /** costo unitario risolto dall'ETL (cascata di §4 del PRD) */
  computed_cost: number | null;
  price_source: PriceSource;
  price_confidence: Confidence;
}

export interface BomLine {
  row: number;
  assembly: string;
  section: string | null;
  position: string | null;
  code: string | null;
  description: string;
  category: string;
  qty_base: number | null;
  /** chiavi "12" | "18" | "20" | "22" | "36" | "40" */
  qty_by_config: Record<string, number | null>;
  already_loaded: boolean;
}

export interface TrackerConfig {
  modules: number;
  asse_section: string;
  label: string;
}

/** Una riga della configurazione di progetto: "count tracker da modules moduli". */
export interface ProjectTrackerType {
  modules: number;
  count: number;
}

export interface Project {
  name?: string;
  margin_pct?: number;
  tracker_types: ProjectTrackerType[];
}

export interface PricingSettings {
  excludedAssemblies: string[];
  excludedCategories: string[];
  quadroMotoreEur: number;
}

export interface ExplodedLine {
  code: string | null;
  description: string;
  category: string;
  assembly: string;
  qty: number;
  unitCost: number;
  amount: number;
  priceSource: PriceSource;
  confidence: Confidence;
  priced: boolean;
}

export interface TrackerTypeResult {
  modules: number;
  count: number;
  materialPerTracker: number;
  quadroMotore: number;
  subtotal: number;
  lines: ExplodedLine[];
  linesMissingPrice: number;
}

export interface QuoteTotals {
  nTracker: number;
  materialCost: number;
  quadroMotoreCost: number;
  costTotal: number;
  marginPct: number;
  sellTotal: number;
  /** € di materiale per banda di affidabilità */
  confidenceAmount: Record<Confidence, number>;
  /** % di materiale per banda di affidabilità */
  confidencePct: Record<Confidence, number>;
  bomLines: number;
  bomLinesMissingPrice: number;
}

export interface QuoteResult {
  trackerTypes: TrackerTypeResult[];
  extras: { label: string; unit: number; qty: number; amount: number }[];
  totals: QuoteTotals;
  /** aggregato per codice sull'intero lotto, ordinabile per impatto */
  byComponent: {
    code: string | null;
    description: string;
    qty: number;
    unitCost: number;
    amount: number;
    priceSource: PriceSource;
    confidence: Confidence;
  }[];
}
