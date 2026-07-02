# PLAN.md — Working Context for Claude Code

> Drop this file in the repo root. It is the source of truth for what to build,
> what already exists, and the conventions to follow. Work one deliverable at a
> time. A deliverable is DONE when its acceptance criteria are verified by the
> human, not when code compiles.

## Project

Multi-tenant e-commerce platform for Nigerian SME merchants (Instagram/WhatsApp
vendors). Merchants sign up → get a storefront at a subdomain slug → list
products → customers buy via Paystack split payments (1.5% platform commission)
→ merchant sees revenue/profit analytics.

**Stack:** Next.js 14 (App Router, TypeScript, strict mode) · Supabase
(Postgres + Auth + Storage, RLS for tenant isolation) · Paystack (payments,
subaccounts, splits) · Vercel (hosting, free tier).

**Budget constraint:** everything must run on Supabase + Vercel free tiers.

## Architecture rules (do not violate)

1. **Tenant isolation is RLS-first.** Every tenant-scoped table has
   `merchant_id`. Merchant dashboard reads/writes go through the session-scoped
   Supabase client (`lib/supabase/server.ts` or `client.ts`) and rely on RLS —
   do NOT add manual `.eq('merchant_id', ...)` filters as a substitute for RLS,
   and do NOT use the service role key for merchant-facing reads.
2. **Service role key is for two things only:** the Phase 3 checkout write path
   (anonymous customers) and the Paystack webhook handler. It never appears in
   client components and is never prefixed `NEXT_PUBLIC_`.
3. **Payments are immutable once `successful`** (DB trigger enforces this).
   Refunds = new reversing entry, never an edit.
4. **Paystack secret key stays server-side.** All Paystack calls go through
   `/app/api/paystack/*` route handlers.
5. **Customers never log in.** Guest checkout only. Phone required, email
   optional.
6. **TypeScript strict:** `npm run build` must pass before any work is
   considered complete. Run it yourself; fix your own type errors.
7. **Mobile-first, lightweight pages.** Storefront target: <2s load on
   throttled 3G. Compress images client-side before upload.

## Database (already applied in Supabase — migrations 0001–0005)

- `merchants` — id == auth.users.id; slug (unique); paystack_subaccount_code;
  kyc_status ('pending' | 'verified' | 'unverified_active')
- `products` — cost_price nullable; `margin_unknown` auto-syncs via trigger;
  stock_quantity; low_stock_threshold
- `orders` — guest customer fields; status pending/paid/refunded/cancelled;
  paystack_reference unique
- `order_items` — denormalized merchant_id; price/name snapshots
- `payments` — immutability trigger; paystack_reference + webhook_event_id
  unique (idempotency keys)
- Signup trigger `handle_new_merchant` auto-creates merchant row with
  sequential slug collision handling (shopaa → shopaa-2)
- RLS: merchants CRUD own row; products merchant-CRUD + anon read of active
  products (cost_price column-level REVOKEd from anon); orders/order_items/
  payments merchant SELECT only

Schema changes go in new numbered SQL files in `supabase/` for the human to
apply — do not assume you can run migrations against the live DB.

## Current state (verified working)

- ✅ 0.3 Vercel auto-deploy from `main`
- ✅ 1.1 Signup at `/signup` (email confirmation currently OFF in Supabase for
  dev speed — do not build assuming a session always exists immediately)
- ✅ `/auth/callback` route exists for when confirmation is re-enabled
- ✅ 1.2 Slug collision handling (built; human verifying)
- 🟡 1.3 Bank details flow at `/dashboard/bank-details` + 3 Paystack API routes
  (built; awaiting human sandbox test with sk_test_ key)
- ✅ Subdomain routing middleware proven on *.localhost (reads slug from Host
  header). No live domain yet — all storefront work must function on
  `{slug}.localhost:3000`.

## Environment

`.env.local`: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY (sk_test_). All set locally;
first three also set in Vercel.

## Work queue (strict order)

### → NEXT: 1.5 Login + logout
- `/login` page: email + password via supabase.auth.signInWithPassword,
  redirect to /dashboard; link to /signup and vice versa
- Logout button on dashboard (supabase.auth.signOut → redirect /login)
- Friendly error on bad credentials
- ACCEPTANCE: returning merchant can sign in and out; wrong password shows a
  clear message, not a crash

### 1.6 Auth session middleware
- Next.js middleware using @supabase/ssr pattern: refresh expired tokens on
  every request, redirect unauthenticated /dashboard/* traffic to /login
- Must coexist with the existing subdomain-detection middleware — merge into
  one middleware.ts, storefront (subdomain) routes stay public
- ACCEPTANCE: session survives token expiry; /dashboard redirects to /login
  when logged out; storefront routes never require auth

### 1.4 Public storefront shell (FIRST customer-facing page — design matters)
- Route resolves merchant by slug from subdomain ({slug}.localhost:3000);
  unknown slug → clean 404 ("store not found")
- Shows business name + "no products yet" empty state
- This page gets real visual design (typography, spacing, trust cues) — NOT
  the utilitarian styling of the merchant pages. Mobile-first.
- Uses anon Supabase client (public page) — RLS already permits anon read of
  active products; cost_price is column-blocked
- ACCEPTANCE: loads <2s on throttled 3G in dev tools; looks trustworthy on a
  phone screen; unknown slugs 404 cleanly

### Phase 2 (after Phase 1 closes): 2.1 product CRUD + image upload →
### 2.2 low-stock warning → 2.3 margin-unknown UI treatment
(Details in mvp-deliverables-plan-v2.md — read it before starting Phase 2.)

## Session protocol

- One deliverable per session unless told otherwise. State what you changed
  and what the human must verify before the next deliverable starts.
- Never mark acceptance criteria as met — that is the human's call.
- Do not refactor working code from earlier phases unless the current
  deliverable requires it.
- If a deliverable seems to require violating an architecture rule, stop and
  say so instead of working around it.
