# PLAN.md — Working Context for Claude Code

> This file is the source of truth for what to build, what already exists, and
> the conventions to follow. Work one deliverable at a time. A deliverable is
> DONE when its acceptance criteria are verified by the human, not when code
> compiles.

## Project

Multi-tenant e-commerce platform for Nigerian SME merchants (Instagram/WhatsApp
vendors). Merchants sign up → get a storefront at a subdomain slug → list
products → customers buy via Paystack split payments (1.5% platform commission)
→ merchant sees revenue/profit analytics.

**Stack:** Next.js 14 (App Router, TypeScript, strict mode) · Supabase
(Postgres + Auth + Storage, RLS for tenant isolation) · Paystack (payments,
subaccounts, splits) · Vercel (hosting, free tier).

**Budget constraint:** everything must run on Supabase + Vercel free tiers.
Supabase Storage free tier is 1GB — image compression is not optional.

## Architecture rules (do not violate)

1. **Tenant isolation is RLS-first.** Every tenant-scoped table has
   `merchant_id`. Merchant dashboard reads/writes go through the session-scoped
   Supabase client (`lib/supabase/server.ts` or `client.ts`) and rely on RLS —
   do NOT add manual `.eq('merchant_id', ...)` filters as a substitute for RLS,
   and do NOT use the service role key for merchant-facing reads.
2. **Service role key is for two things only:** the Phase 3 checkout write path
   (anonymous customers) and the Paystack webhook handler. It never appears in
   client components and is never prefixed `NEXT_PUBLIC_`. This applies to
   dev-time/tooling access too — if you need schema facts, ask the human or
   read the migration files in supabase/, not the live DB.
3. **Public storefront reads use `lib/supabase/anon.ts`** (stateless anon
   client, no cookies) — NOT `server.ts`. This guarantees RLS evaluates as anon
   even when the visitor holds a merchant session (e.g. a merchant previewing
   their own store). Established in 1.4; keep it that way for all
   customer-facing pages, including product queries.
4. **Payments are immutable once `successful`** (DB trigger enforces this).
   Refunds = new reversing entry, never an edit.
5. **Paystack secret key stays server-side.** All Paystack calls go through
   `/app/api/paystack/*` route handlers.
6. **Customers never log in.** Guest checkout only. Phone required, email
   optional.
7. **TypeScript strict:** `npm run build` must pass before any work is
   considered complete. Run it yourself; fix your own type errors.
8. **Mobile-first, lightweight pages.** Storefront target: <2s load on
   throttled 3G. Compress images client-side before upload (target <500KB
   per image).
9. **Anon column exposure is explicit.** `merchants`: anon may read only
   business_name + slug (0006 migration). `products`: anon may read active
   products but cost_price and margin_unknown are column-REVOKEd. Any new
   anon-readable column requires an explicit new grant — never widen an
   existing one casually.

## Database (applied in Supabase — migrations 0001–0006)

- `merchants` — id == auth.users.id; slug (unique); paystack_subaccount_code;
  kyc_status ('pending' | 'verified' | 'unverified_active'); anon column-level
  read on business_name + slug only
- `products` — cost_price nullable; `margin_unknown` auto-syncs via DB trigger
  (do NOT manage it in app code); stock_quantity; low_stock_threshold;
  is_active; anon read of active rows minus cost columns
- `orders` — guest customer fields; status pending/paid/refunded/cancelled;
  paystack_reference unique
- `order_items` — denormalized merchant_id; price/name snapshots
- `payments` — immutability trigger; paystack_reference + webhook_event_id
  unique (idempotency keys)
- Signup trigger `handle_new_merchant` auto-creates merchant row with
  sequential slug collision handling (shopaa → shopaa-2)

Schema changes go in new numbered SQL files in `supabase/` (next number: 0007)
for the human to apply — do not assume you can run migrations against the
live DB. The repo `supabase/` folder is the numbering authority.

## Current state — Phase 0 & Phase 1 CLOSED (all human-verified)

- ✅ Signup `/signup`, login `/login`, logout; friendly auth errors
- ✅ Merged middleware.ts: session refresh + /dashboard auth-gating +
  subdomain rewrite ({slug}.localhost:3000 → /storefront/{slug}, scoped to
  `^([^.]+)\.localhost$` so it can't misfire on *.vercel.app)
- ✅ Bank details flow `/dashboard/bank-details` + 3 Paystack routes
  (banks / resolve-account / create-subaccount); tested in sandbox;
  kyc_status flips to 'verified'; dashboard shows activation banner until then
- ✅ Public storefront shell at /storefront/[slug]: business name + empty
  state; branded not-found page with real 404; anon client; <2s on
  throttled 3G verified
- ✅ Email confirmation is OFF in Supabase for dev speed (do not build
  assuming a session always exists immediately after signUp). /auth/callback
  exists for when it's re-enabled (tracked as 5.6)
- 🟡 No live domain yet — all storefront work must function on
  {slug}.localhost:3000. Domain purchase → 0.4b is a config task (Vercel
  wildcard + widen the middleware host regex), owned by the human
- Known gap, deliberately deferred: no password-reset flow (candidate 1.7 /
  Phase 5 item — do not build unprompted)

## Environment

`.env.local`: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY (sk_test_). All set locally;
first three also set in Vercel.

## Work queue (strict order)

### → NEXT: 2.1 Product CRUD + image upload
- Merchant dashboard pages to create / list / edit / delete (or deactivate)
  own products: name, description, image, selling_price, cost_price,
  stock_quantity, low_stock_threshold, is_active
- cost_price is OPTIONAL on save — never block the form on it; margin_unknown
  is trigger-managed, leave it alone
- Image upload to Supabase Storage: compress client-side before upload
  (<500KB target); store the public URL in products.image_url. Storage
  bucket + any policies = SQL/config file for the human to apply (0007)
- Delete should prefer soft-delete (is_active = false) if the product has
  order history; hard delete acceptable only when no order_items reference it
- Merchant-facing styling: utilitarian is fine (design pass is 5.7)
- ACCEPTANCE: merchant can create a product with photo in under a minute on
  a phone-sized viewport; product appears/updates/disappears correctly;
  skipping cost price saves cleanly; a second merchant account sees none
  of the first merchant's products

### 2.1b Storefront renders real products
- Replace the permanent empty state in /storefront/[slug] with a real
  product grid (name, image, price, stock state) for active products;
  keep the empty state for merchants with no active products
- Still anon client, still no cost_price exposure, still <2s throttled 3G
  with real product images — this re-tests NFR-2.1 under realistic weight
- ACCEPTANCE: products created in 2.1 appear on the public storefront;
  out-of-stock products are visibly marked or hidden (pick one, state which)

### 2.2 Low-stock warning on dashboard
- Dashboard surface listing products at/below their low_stock_threshold
- ACCEPTANCE: lowering a threshold above/below current stock moves the
  product in/out of the warning list

### 2.3 Margin-unknown UI treatment
- Dashboard indicator on products where margin_unknown = true ("margin
  unknown" badge or similar), nudging — not forcing — cost entry
- Optional one-time "default margin %" merchant setting (schema change →
  0007 or 0008 for the human) that estimates cost for margin-unknown
  products; estimated margins must be visually distinct from real ones
  everywhere they appear
- ACCEPTANCE: no ₦0-cost-as-real-margin anywhere; estimated vs real is
  always distinguishable

### Phase 3 (after Phase 2 closes): checkout, split payments, webhooks.
Do NOT start any Phase 3 work unprompted — 3.3 (webhook idempotency) is
explicitly flagged for line-by-line human review before merge. Details in
mvp-deliverables-plan-v2.md.

## Session protocol

- One deliverable per session unless told otherwise. State what you changed
  and what the human must verify before the next deliverable starts.
- Never mark acceptance criteria as met — that is the human's call.
- Do not refactor working code from earlier phases unless the current
  deliverable requires it.
- If a deliverable seems to require violating an architecture rule, stop and
  say so instead of working around it.
- If this file contradicts what you find in the actual code or database,
  say so before proceeding — the discrepancy is the bug (this happened once:
  the file claimed anon could read merchants; the policies said otherwise.
  Flagging it was correct).
