import { describe, expect, it } from "vitest";
import { computeQuote, DEFAULT_SETTINGS, explodeTracker } from "./pricing";
import { bom, components } from "./data";
import type { Component } from "./types";

const byCode = new Map<string, Component>();
for (const c of components) if (c.code) byCode.set(c.code, c);

const EXAMPLE = {
  margin_pct: 0,
  tracker_types: [
    { modules: 12, count: 4 },
    { modules: 18, count: 1 },
    { modules: 20, count: 20 },
    { modules: 22, count: 5 },
    { modules: 36, count: 34 },
    { modules: 40, count: 5 },
  ],
};

describe("explodeTracker", () => {
  it("include solo la sezione assi della taglia", () => {
    const lines = explodeTracker(bom, byCode, 36, DEFAULT_SETTINGS);
    const assi = lines.filter((l) => l.assembly === "ASSI DI ROTAZIONE 1303");
    expect(assi.length).toBeGreaterThan(0);
    // nessuna riga di un'altra taglia deve entrare
    const other = bom.filter(
      (b) => b.assembly === "ASSI DI ROTAZIONE 1303" && b.section === "20 MODULI 1303",
    );
    for (const o of other) {
      expect(assi.find((l) => l.description === o.description && l.qty === o.qty_base && o.section === "20 MODULI 1303")).toBeUndefined();
    }
  });

  it("esclude gli assiemi elettrici e le righe già caricate altrove", () => {
    const lines = explodeTracker(bom, byCode, 20, DEFAULT_SETTINGS);
    expect(lines.some((l) => l.assembly.startsWith("kit quadri"))).toBe(false);
    expect(lines.some((l) => l.assembly === "kit quadro motore")).toBe(false);
    expect(lines.some((l) => l.assembly === "sensori meteo")).toBe(false);
  });

  it("scarta le referenze alternative con Q.tà 0", () => {
    const lines = explodeTracker(bom, byCode, 20, DEFAULT_SETTINGS);
    expect(lines.every((l) => l.qty !== 0)).toBe(true);
  });
});

describe("computeQuote — progetto di esempio (69 tracker, rev.27)", () => {
  const q = computeQuote(EXAMPLE, components, bom, DEFAULT_SETTINGS);

  it("conta 69 tracker", () => {
    expect(q.totals.nTracker).toBe(69);
  });

  it("forfait quadro motore = 170 € × 69", () => {
    expect(q.totals.quadroMotoreCost).toBe(69 * 170);
  });

  it("costo totale nell'intorno atteso", () => {
    expect(q.totals.costTotal).toBeGreaterThan(170_000);
    expect(q.totals.costTotal).toBeLessThan(180_000);
  });

  it("le percentuali di affidabilità sommano a ~100", () => {
    const p = q.totals.confidencePct;
    expect(p.alta + p.media + p.bassa + p.nulla).toBeCloseTo(100, 0);
  });

  it("il prezzo di vendita applica il margine", () => {
    const withMargin = computeQuote({ ...EXAMPLE, margin_pct: 10 }, components, bom);
    expect(withMargin.totals.sellTotal).toBeCloseTo(q.totals.costTotal * 1.1, 0);
  });

  it("byComponent è ordinato per importo decrescente", () => {
    for (let i = 1; i < q.byComponent.length; i++) {
      expect(q.byComponent[i - 1].amount).toBeGreaterThanOrEqual(q.byComponent[i].amount);
    }
  });
});
