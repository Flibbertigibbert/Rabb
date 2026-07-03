-- ============================================================
-- 0.2 — RLS isolation test
-- Verifies: "A test query as Merchant A returns zero rows
-- belonging to Merchant B"
-- ============================================================
-- Run this in the Supabase SQL Editor AFTER 0001_schema.sql and
-- 0002_rls_policies.sql have both been applied.
--
-- The SQL Editor normally runs as the postgres/service role,
-- which bypasses RLS — so to actually test RLS we have to
-- simulate being an authenticated user by setting the JWT
-- claim Supabase's auth.uid() reads from, and switching role
-- to `authenticated`.

begin;

-- ------------------------------------------------------------
-- 1. Seed two fake merchants directly into auth.users + merchants
--    (in real usage these rows are created by Supabase Auth
--    sign-up + your Phase 1.1 signup flow, not raw SQL)
-- ------------------------------------------------------------
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'merchant-a@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'merchant-b@test.com')
on conflict (id) do nothing;

insert into merchants (id, business_name, slug, email)
values
  ('11111111-1111-1111-1111-111111111111', 'Merchant A Store', 'merchant-a', 'merchant-a@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'Merchant B Store', 'merchant-b', 'merchant-b@test.com');

insert into products (merchant_id, name, selling_price, cost_price, stock_quantity)
values
  ('11111111-1111-1111-1111-111111111111', 'Merchant A Product 1', 5000, 3000, 10),
  ('11111111-1111-1111-1111-111111111111', 'Merchant A Product 2', 7500, 4000, 5),
  ('22222222-2222-2222-2222-222222222222', 'Merchant B Product 1', 12000, 8000, 20);

-- ------------------------------------------------------------
-- 2. Simulate being authenticated as Merchant A
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111')::text,
  true);

-- Should return exactly 2 rows (Merchant A's own products only)
select id, merchant_id, name from products;

-- Explicit assertion: this MUST return zero rows.
-- If it returns anything, RLS is broken.
select count(*) as merchant_b_rows_visible_to_merchant_a
from products
where merchant_id = '22222222-2222-2222-2222-222222222222';

-- Same check against orders / payments tables (empty for now,
-- but confirms the policy doesn't error and scopes correctly)
select count(*) as merchant_b_orders_visible_to_merchant_a
from orders
where merchant_id = '22222222-2222-2222-2222-222222222222';

-- ------------------------------------------------------------
-- 3. Reset and check Merchant B sees only their own row
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '22222222-2222-2222-2222-222222222222')::text,
  true);

select id, merchant_id, name from products;  -- should return exactly 1 row

-- ------------------------------------------------------------
-- 4. Reset role and roll back — this script makes no permanent changes
-- ------------------------------------------------------------
reset role;
rollback;

-- ============================================================
-- Pass criteria:
--   - Step 2's "merchant_b_rows_visible_to_merchant_a" = 0
--   - Step 2's "merchant_b_orders_visible_to_merchant_a" = 0
--   - Step 3 returns exactly 1 row (Merchant B's own product)
-- If any of these fail, do not proceed to Phase 1 — fix the
-- policy first.
-- ============================================================