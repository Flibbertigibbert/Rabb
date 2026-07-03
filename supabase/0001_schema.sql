-- ============================================================
-- 0.1 — Schema v1
-- Multi-Tenant E-Commerce & Analytics Platform (MVP)
-- ============================================================
-- Run this in the Supabase SQL Editor, or via `supabase db push`
-- if you're using the Supabase CLI with a local migrations folder.

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- Helper: auto-update `updated_at` on row change
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- merchants
-- One row per tenant. id == auth.users.id (1:1 with Supabase Auth)
-- so RLS can compare directly against auth.uid() everywhere.
-- ============================================================
create table merchants (
  id                          uuid primary key references auth.users(id) on delete cascade,
  business_name               text not null,
  slug                        text not null unique,
  email                       text not null,
  phone                       text,

  -- Paystack / KYC fields — columns added now (Phase 0) so Phase 1.3
  -- doesn't require a schema migration mid-build.
  paystack_subaccount_code    text,
  settlement_bank_code        text,
  settlement_account_number   text,
  kyc_status                  text not null default 'pending'
                                check (kyc_status in ('pending', 'verified', 'unverified_active')),
  -- 'unverified_active' supports Open Decision #1 Option B (escrow path)

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create trigger trg_merchants_updated_at
  before update on merchants
  for each row execute function set_updated_at();

-- ============================================================
-- products
-- ============================================================
create table products (
  id                  uuid primary key default uuid_generate_v4(),
  merchant_id         uuid not null references merchants(id) on delete cascade,

  name                text not null,
  description         text,
  image_url           text,

  selling_price       numeric(12,2) not null check (selling_price >= 0),

  -- FR-2.1: cost price is NOT required on save (Phase 2.1 acceptance criteria).
  -- margin_unknown defaults true until a merchant explicitly sets cost_price,
  -- so the BI dashboard (Phase 4.2) can exclude/flag these instead of
  -- silently treating a blank cost as ₦0.
  cost_price          numeric(12,2) check (cost_price >= 0),
  margin_unknown       boolean not null default true,

  stock_quantity      integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5,

  is_active           boolean not null default true,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- Keep margin_unknown in sync with cost_price automatically
create or replace function sync_margin_unknown()
returns trigger as $$
begin
  new.margin_unknown := (new.cost_price is null);
  return new;
end;
$$ language plpgsql;

create trigger trg_products_margin_unknown
  before insert or update of cost_price on products
  for each row execute function sync_margin_unknown();

-- ============================================================
-- orders
-- ============================================================
create table orders (
  id                  uuid primary key default uuid_generate_v4(),
  merchant_id         uuid not null references merchants(id) on delete cascade,

  customer_name       text not null,
  customer_phone      text not null,
  customer_email      text,
  customer_address    text not null,

  status              text not null default 'pending'
                        check (status in ('pending', 'paid', 'refunded', 'cancelled')),

  total_amount        numeric(12,2) not null check (total_amount >= 0),
  paystack_reference  text unique,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ============================================================
-- order_items
-- merchant_id is denormalized here (not just via orders.order_id)
-- so RLS policies and merchant-scoped queries don't need a join,
-- and so composite (merchant_id, created_at) indexes work directly
-- per NFR-2.2.
-- ============================================================
create table order_items (
  id                    uuid primary key default uuid_generate_v4(),
  order_id              uuid not null references orders(id) on delete cascade,
  merchant_id           uuid not null references merchants(id) on delete cascade,
  product_id            uuid not null references products(id),

  -- Snapshot fields: preserve what was actually sold/charged even if
  -- the product is edited or deleted later. Critical for Phase 4
  -- BI numbers to stay historically accurate (FR-4.1 reconciliation).
  product_name_snapshot text not null,
  quantity              integer not null check (quantity > 0),
  unit_selling_price    numeric(12,2) not null check (unit_selling_price >= 0),
  unit_cost_price       numeric(12,2) check (unit_cost_price >= 0),

  created_at            timestamptz not null default now()
);

-- ============================================================
-- payments
-- NFR-1.2: immutable once marked 'successful' — enforced below
-- with a trigger, not just app-layer discipline.
-- ============================================================
create table payments (
  id                  uuid primary key default uuid_generate_v4(),
  merchant_id         uuid not null references merchants(id) on delete cascade,
  order_id            uuid not null references orders(id) on delete cascade,

  paystack_reference  text not null unique,   -- idempotency key for webhook (3.3)
  webhook_event_id    text unique,            -- extra guard vs. duplicate webhook delivery

  amount              numeric(12,2) not null check (amount >= 0),
  platform_fee        numeric(12,2) not null check (platform_fee >= 0),
  merchant_amount     numeric(12,2) not null check (merchant_amount >= 0),

  status              text not null check (status in ('successful', 'failed', 'refunded')),

  created_at          timestamptz not null default now()
);

create or replace function prevent_payment_mutation()
returns trigger as $$
begin
  if old.status = 'successful' then
    raise exception 'payments row % is immutable once successful (NFR-1.2) — insert a reversing entry instead', old.id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_payments_immutable
  before update or delete on payments
  for each row execute function prevent_payment_mutation();

-- ============================================================
-- Indexes — composite on merchant_id per NFR-2.2
-- ============================================================
create index idx_products_merchant       on products(merchant_id);
create index idx_orders_merchant_created on orders(merchant_id, created_at desc);
create index idx_order_items_merchant    on order_items(merchant_id);
create index idx_order_items_order       on order_items(order_id);
create index idx_payments_merchant_created on payments(merchant_id, created_at desc);