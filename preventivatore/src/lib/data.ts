/** Caricamento dei dati anagrafici statici generati dall'ETL. */
import componentsJson from "../data/components.json";
import bomJson from "../data/bom.json";
import trackerConfigsJson from "../data/tracker_configs.json";
import metaJson from "../data/_meta.json";
import type { BomLine, Component, TrackerConfig } from "./types";

export const components = componentsJson as unknown as Component[];
export const bom = bomJson as unknown as BomLine[];
export const trackerConfigs = trackerConfigsJson as unknown as TrackerConfig[];
export const meta = metaJson as {
  generated: string;
  source_file: string;
  counts: { components: number; bom_lines: number; priced_components: number };
  example_project: { tracker_types: { modules: number; count: number }[] };
};

export const MODULE_SIZES = trackerConfigs.map((c) => c.modules);
