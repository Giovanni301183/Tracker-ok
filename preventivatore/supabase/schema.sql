-- ============================================================================
--  Preventivatore Tracker TTS 1303 — schema Supabase / Postgres
--  Eseguire nel SQL editor di Supabase PRIMA di seed.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Dati anagrafici (sola lettura dall'app; popolati da seed.sql / ETL)
-- ---------------------------------------------------------------------------
create table if not exists components (
  code             text primary key,
  description      text not null,
  category         text not null,
  uom              text not null default 'pz',
  weight_kg        numeric,
  price_listino    numeric,
  computed_cost    numeric,             -- costo unitario risolto dalla cascata (§4 PRD)
  price_source     text not null,       -- confermato|listino|scheda_*|stima_peso|mancante
  price_confidence text not null        -- alta|media|bassa|nulla
);

create table if not exists bom_lines (
  id             bigint generated always as identity primary key,
  src_row        int,
  assembly       text not null,
  section        text,
  position       text,
  code           text references components(code),
  description    text not null,
  category       text not null,
  qty_base       numeric,
  qty_by_config  jsonb not null default '{}'::jsonb,   -- {"12":.., "18":.., "20":.., "22":.., "36":.., "40":..}
  already_loaded boolean not null default false
);
create index if not exists bom_lines_assembly_idx on bom_lines (assembly);
create index if not exists bom_lines_code_idx on bom_lines (code);

create table if not exists tracker_configs (
  modules      int primary key,
  asse_section text not null,          -- es. "36 MODULI 1303"
  label        text not null
);

-- ---------------------------------------------------------------------------
--  Dati mutabili
-- ---------------------------------------------------------------------------
create table if not exists component_prices (
  code       text primary key references components(code),
  price_eur  numeric not null check (price_eur >= 0),
  note       text,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists pricing_settings (
  id                  int primary key default 1 check (id = 1),
  excluded_assemblies text[] not null default array[
    'kit quadri area','kit quadri centralina meteo','kit quadri inverter',
    'sensori meteo','kit quadro motore'],
  excluded_categories text[] not null default array[
    'Quadristica ed elettrico','Moduli fotovoltaici'],
  quadro_motore_eur   numeric not null default 170,
  bulloneria_eur_kg   numeric not null default 3.0,
  updated_at          timestamptz not null default now()
);
insert into pricing_settings (id) values (1) on conflict do nothing;

create table if not exists quotes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  client      text,
  margin_pct  numeric not null default 0,
  notes       text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

create table if not exists quote_lines (
  id        bigint generated always as identity primary key,
  quote_id  uuid not null references quotes(id) on delete cascade,
  modules   int not null references tracker_configs(modules),
  count     int not null check (count >= 0)
);
create index if not exists quote_lines_quote_idx on quote_lines (quote_id);

-- ---------------------------------------------------------------------------
--  Row Level Security
--  Anagrafica: lettura pubblica (anon), nessuna scrittura dall'app.
--  Mutabili: lettura a utenti autenticati, scrittura al proprietario.
-- ---------------------------------------------------------------------------
alter table components       enable row level security;
alter table bom_lines        enable row level security;
alter table tracker_configs  enable row level security;
alter table component_prices enable row level security;
alter table pricing_settings enable row level security;
alter table quotes           enable row level security;
alter table quote_lines      enable row level security;

create policy "anagrafica leggibile" on components       for select using (true);
create policy "anagrafica leggibile" on bom_lines        for select using (true);
create policy "anagrafica leggibile" on tracker_configs  for select using (true);

create policy "prezzi leggibili"   on component_prices for select using (true);
create policy "prezzi scrivibili"  on component_prices for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "settings leggibili"  on pricing_settings for select using (true);
create policy "settings scrivibili" on pricing_settings for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "preventivi propri (r)" on quotes for select using (created_by = auth.uid());
create policy "preventivi propri (w)" on quotes for all
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "righe preventivo proprie" on quote_lines for all
  using (exists (select 1 from quotes q where q.id = quote_id and q.created_by = auth.uid()))
  with check (exists (select 1 from quotes q where q.id = quote_id and q.created_by = auth.uid()));
