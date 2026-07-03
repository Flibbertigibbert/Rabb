-- ============================================================
-- 0.2 — Row-Level Security policies
-- Multi-Tenant E-Commerce & Analytics Platform (MVP)
-- ============================================================
-- Design decision: public storefront/checkout writes (anonymous
-- customers browsing & buying) do NOT go through anon RLS insert
-- policies on orders/order_items/payments. Those writes are
-- price- and stock-sensitive, so they're handled by a server-side
-- API route using the Supabase service role key (which bypasses
-- RLS) in Phase 3. RLS here governs:
--   1. Merchant dashboard access (merchant_id = auth.uid())
--   2. Public read-only access to the storefront product catalog
-- This keeps RLS doing what it's good at (tenant isolation) without
-- trying to also do payment/business-logic validation, which
-- belongs server-side anyway.

-- ------------------------------------------------------------
-- Enable RLS on every tenant-scoped table
-- ------------------------------------------------------------
alter table merchants   enable row level security;
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table payments    enable row level security;

-- ============================================================
-- merchants
-- A merchant can only see/edit their own row.
-- ============================================================
create policy "merchants_select_own"
  on merchants for select
  using (id = auth.uid());

create policy "merchants_insert_own"
  on merchants for insert
  with check (id = auth.uid());

create policy "merchants_update_own"
  on merchants for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- No delete policy: merchants don't self-delete their account via
-- the client. Handle account closure as an admin/service action.

-- ============================================================
-- products
-- Merchant: full CRUD on own products.
-- Public (anon): read-only on active products, and only on
-- columns safe to expose (cost_price / margin_unknown excluded
-- via column-level GRANT, not row-level policy — see below).
-- ============================================================
create policy "products_merchant_all"
  on products for all
  using (merchant_id = auth.uid())
  with check (merchant_id = auth.uid());

create policy "products_public_read_active"
  on products for select
  to anon
  using (is_active = true);

-- Column-level privilege restriction: anon can never select
-- cost_price or margin_unknown, even though the row-level policy
-- above would otherwise let them read the row. Row-level security
-- controls *which rows*; this controls *which columns*.
revoke select on products from anon;
grant select (
  id, merchant_id, name, description, image_url,
  selling_price, stock_quantity, is_active, created_at
) on products to anon;

-- ============================================================
-- orders / order_items / payments
-- Merchant: read-only via dashboard (writes happen through the
-- webhook handler / server route in Phase 3, using the service
-- role key, which bypasses RLS entirely).
-- No anon policies — anonymous checkout writes never touch the
-- client-side Supabase connection directly.
-- ============================================================
create policy "orders_merchant_select"
  on orders for select
  using (merchant_id = auth.uid());

create policy "order_items_merchant_select"
  on order_items for select
  using (merchant_id = auth.uid());

create policy "payments_merchant_select"
  on payments for select
  using (merchant_id = auth.uid());

-- ============================================================
-- Note on Phase 5.1 (Platform Admin)
-- When the admin role is introduced, add a separate policy per
-- table keyed off a custom claim (e.g. auth.jwt() ->> 'role' = 'admin')
-- rather than loosening any of the policies above.
-- ============================================================