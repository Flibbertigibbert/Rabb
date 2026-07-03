-- 2.3 margin-unknown UI treatment: optional one-time "default margin %"
-- merchant setting, used only to *estimate and display* a margin for
-- products where margin_unknown = true (no real cost_price entered).
--
-- This is purely a display estimate — the app never writes it back into
-- products.cost_price, so margin_unknown stays entirely trigger-owned.
--
-- No new RLS/grant needed: merchants already CRUD their own row, and this
-- column is not part of the anon column grant (business_name, slug, id
-- only per 0006/0008) — it stays private by default, per architecture
-- rule 9.

alter table merchants
  add column default_margin_percent numeric check (default_margin_percent between 0 and 100);
