-- 2.1b storefront product grid: resolving a merchant's active products by
-- slug requires a join/filter on merchants.id ↔ products.merchant_id.
-- Postgres column privileges apply to any column referenced in a query
-- (join or filter), even if not in the SELECT list, so anon needs read
-- access to merchants.id specifically, not just business_name/slug.
--
-- Not a new practical exposure — anon can already read products.merchant_id
-- on active rows (only cost_price/margin_unknown are column-REVOKEd there
-- per PLAN.md), so a merchant's id is already inferable from their product
-- rows. This just lets it be queried by directly. Explicit per architecture
-- rule 9 (anon column exposure must be an explicit new grant).

grant select (id) on merchants to anon;
