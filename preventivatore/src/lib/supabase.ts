import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Client Supabase. È `null` se le variabili d'ambiente non sono configurate:
 * l'app funziona comunque in sola lettura sui dati statici (src/data/*.json),
 * senza prezzi confermati né salvataggio preventivi.
 */
export const supabase = url && anon ? createClient(url, anon) : null;

export async function fetchConfirmedPrices(): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("component_prices")
    .select("code, price_eur");
  if (error) {
    console.warn("component_prices:", error.message);
    return {};
  }
  const out: Record<string, number> = {};
  for (const row of data ?? []) out[row.code] = Number(row.price_eur);
  return out;
}

export async function upsertConfirmedPrice(code: string, priceEur: number) {
  if (!supabase) throw new Error("Supabase non configurato");
  const { error } = await supabase
    .from("component_prices")
    .upsert({ code, price_eur: priceEur }, { onConflict: "code" });
  if (error) throw error;
}
