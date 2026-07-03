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
   dev-time/tooling access too — if you need schema facts, read the migration
   files in `supabase/` or ask the human; do not introspect the live DB.
3. **Public storefront reads use `lib/supabase/anon.ts`** (stateless anon
   client, no cookies) — NOT `server.ts`. This guarantees RLS evaluates as anon
   even when the visitor holds a merchant session. Applies to all
   customer-facing pages.
4. **Payments are immutable once `successful`** (DB trigger enforces this).
   Refunds = new reversing entry, never an edit.
5. **Paystack secret key stays server-side.** All Paystack calls go through
   `/app/api/paystack/*` route handlers.
6. **Customers never log in.** Guest checkout only. Phone required, email
   optional.
7. **TypeScript strict:** `npm run build` must pass before any work is
   considered complete. Run it yourself; fix your own type errors.
8. **Mobile-first, lightweight pages.** Storefront target: <2s load on
   throttled 3G. Compress images client-side before upload (<500KB per image).
9. **Anon column exposure is explicit.** `merchants`: anon reads only
   business_name + slug. `products`: anon reads active products minus
   cost_price / margin_unknown. Any new anon-readable column requires an
   explicit new grant.
10. **Migrations are numbered files in `supabase/`** for the human to apply —
    never assume you can run them against the live DB. The repo folder is the
    numbering authority. Write migrations idempotently (`if not exists` /
    `or replace`) where possible.

## Launch-gating external items (human-owned, deliberately deferred)

By explicit decision: domain purchase (→ wildcard DNS/SSL on Vercel) and
Paystack live-mode activation (requires CAC business registration first — CAC
takes 3–7 working days, Paystack review takes days more) are sequenced as the
LAST step before launch. Consequence, accepted: after all code is done and
verified, launch waits on this paperwork chain (~1.5–2+ weeks). All Phase 3–5
work happens in sandbox/test mode on {slug}.localhost:3000. Do not treat the
absence of a live domain or live keys as a blocker for any deliverable.

## Current state — Phases 0, 1, 2 CLOSED; 2.4 shell done (all human-verified)

- ✅ Auth: signup /signup, login /login, logout; friendly errors; merged
  middleware.ts (session refresh + /dashboard gating + subdomain rewrite
  {slug}.localhost:3000 → /storefront/{slug}, host regex scoped to
  `^([^.]+)\.localhost$`)
- ✅ Email confirmation OFF in Supabase for dev speed; /auth/callback exists
  for re-enable at launch (tracked 5.6). Do not assume a session exists
  immediately after signUp
- ✅ Bank details /dashboard/bank-details + 3 Paystack routes (banks /
  resolve-account / create-subaccount); kyc_status flips to 'verified'
- ✅ Products: CRUD at /dashboard/products (+new, +[id]/edit); client-side
  image compression to public 'product-images' bucket with per-merchant
  folder policies; soft-delete when order history exists
- ✅ Storefront /storefront/[slug]: real active products via anon client;
  branded 404; <2s throttled-3G verified with real images; cost_price absent
  from all responses
- ✅ Low-stock warnings; margin_unknown badge; three-state margin rendering
  (real / ~estimated amber-italic / badge-only); merchants.default_margin_percent
- ✅ 2.4 dashboard UX shell: sidebar nav (Dashboard · Products · Orders stub ·
  Payments · Logout), storefront-link module with copy button, shared layout
- 🟡 Landing page at / is still the Phase-0 placeholder — replaced by 2.5
- Migrations applied: 0001–0007, 0009 (numbering note: no 0008 exists —
  next migration number is 0010)
- Known gap, deliberately deferred: no password-reset flow (Phase 5
  candidate — do not build unprompted)

## Environment

`.env.local`: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY (sk_test_). All set locally;
first three also set in Vercel.

## Work queue (strict order)

### → NEXT: 2.5 Landing page + storefront design pass (public surfaces only)

Reference archetype: getbumpa.com's landing page — its STRUCTURE, rhythm, and
polish level. Do NOT clone its copy, layout details, or assets; do not use
its green. Our differentiator leads: profit clarity, not just sales records.

DESIGN SYSTEM (CSS variables, shared across public pages):
- Base: white / near-white background, near-black ink (#0A0A0A range)
- Brand accent: confident saturated blue (#2563EB range) + pale blue tint
  for section backgrounds and badges. Accent for CTAs, links, highlights —
  sparingly
- Type: bold large display headings, tight leading, clamp() responsive;
  comfortable 1.6-ish body
- Rounded cards (14–16px), subtle borders, soft hover lift; generous
  section padding; 4/8px spacing rhythm
- Respect prefers-reduced-motion everywhere

LANDING PAGE (/) — replaces the placeholder:
1. Sticky nav: wordmark left; right: Login (ghost) + "Create your store"
   (solid blue)
2. Hero: bold headline with JS-animated rotating word (e.g. "Sell your
   [fashion/shoes/gadgets/beauty] business online in minutes"); subline:
   instant storefront link, Paystack payments, real profit tracking;
   primary CTA → /signup. Staggered entrance animation
3. 3–4 alternating feature sections (visual side swaps left/right,
   scroll-reveal via IntersectionObserver): know your real profit (LEAD
   with this) · instant storefront link · automatic split payments ·
   low-stock + order tracking. Visuals are styled in-code mockups (browser
   frame with mini storefront, margin card, etc.) — no stock photos, no
   screenshots of features that don't exist
4. Full-width blue CTA band: "Your store, live in 3 minutes" + signup CTA
5. Honest pricing strip: "No subscription. 1.5% per sale — you only pay
   when you earn." NO fake tiers, NO testimonials, NO invented user counts
6. FAQ accordion (4–5 real questions: Is it free? How do I get paid? Do
   customers need an account? When do I need CAC?)
7. Footer: wordmark, login/signup links, year
- No heavy animation library unless justified in the summary; if any dep
  is added it must not leak into storefront/dashboard bundles

STOREFRONT restyle (/storefront/[slug] + not-found):
- Same design tokens (blue accent, cards, type scale); store header with
  more identity presence (initial avatar, name); product cards with locked
  image aspect-ratio, clear price, restyled out-of-stock treatment;
  refined empty state and 404
- Lean: CSS transitions only, skeleton loaders for product images, NO JS
  animation libraries. <2s throttled-3G budget re-verified
- NO functional changes: same data, same anon client, same routes

ACCEPTANCE: landing page exists, communicates the offer, routes to signup,
feels contemporary next to the reference on a phone; storefront looks like
a product a vendor would proudly link in their bio; both pass the 3G bar;
zero functional regressions; zero fabricated social proof.

### 2.5b Dashboard token pass (visual consistency only)
- Apply the 2.5 design system (CSS variables: blue accent, ink, card style,
  type scale, button/input/badge styles) to the existing dashboard shell and
  all /dashboard/* pages: sidebar/nav, welcome header, storefront-link
  module, banners, product list/forms, bank-details flow
- This is a RESTYLE of existing components only — no layout redesign, no new
  features, no new routes, no copy rewrites beyond trivial label fixes
- The goal: a merchant moving from the new landing page into the dashboard
  experiences one coherent product, not two eras
- Full dashboard UX polish (illustrations, onboarding checklist, etc.)
  remains deferred to 5.7
- ACCEPTANCE: every dashboard page uses the shared tokens (no leftover
  ad-hoc grey styling); side-by-side with the landing page reads as the same
  brand; zero functional regressions (products CRUD, bank flow, copy-link,
  logout all still work)

### 3.1 Public checkout form
- On /storefront/[slug]: customer selects product(s) + quantity → checkout
  form: name (required), phone (required, validate 0XXXXXXXXXX or
  +234XXXXXXXXXX), email (optional, receipt), delivery address (required)
- Guest-only (rule 6). Order created server-side via route handler using
  the service role key (rule 2's first sanctioned use): insert `orders`
  (status 'pending') + `order_items` snapshots (name, unit_selling_price,
  unit_cost_price for later margin math). Total computed SERVER-SIDE from
  DB prices — never trust a client-supplied amount
- Do NOT decrement stock here — stock moves only on the 'paid' webhook (3.3)
- Checkout hidden/disabled with "payments not yet activated" notice for
  merchants with no paystack_subaccount_code
- ACCEPTANCE: order + items rows appear with correct server-computed totals;
  invalid phone rejected friendly; email skippable; no-subaccount merchant
  shows disabled state, not a broken checkout

### 3.2 Paystack inline checkout with split
- Initialize transaction server-side (/app/api/paystack/*): amount from the
  order row, subaccount = merchant's code (1.5% percentage_charge already on
  the subaccount), pass order's paystack_reference; open Paystack inline on
  the client with the returned access_code
- Popup success = "payment received, confirming…" state ONLY. Order is not
  paid until the webhook says so. Never flip status client-side
- ACCEPTANCE: sandbox card charge completes end-to-end; Paystack dashboard
  shows correct split both sides; order stays 'pending' until webhook lands

### 3.3 Webhook handler — ⚠️ HUMAN REVIEW FENCE
- POST /app/api/paystack/webhook: verify x-paystack-signature (HMAC-SHA512
  of the RAW body with the secret key) BEFORE parsing; reject on mismatch
- On charge.success: idempotently (payments.paystack_reference +
  webhook_event_id unique keys) insert payments row, flip order
  pending → paid, decrement stock atomically — single guarded UPDATE
  (stock_quantity = stock_quantity - qty WHERE stock_quantity >= qty),
  never read-then-write
- Replayed/duplicate webhooks are clean no-ops (200, no double effects)
- Service role client (rule 2's second sanctioned use)
- MERGE RULE: this handler does not merge until the human has reviewed the
  full code line-by-line outside this tool. Write it, present it, stop.
- ACCEPTANCE: same event replayed twice → exactly one payments row, one
  status flip, one stock decrement; bad signature → 401, no effects;
  concurrent orders cannot oversell

### 3.4 Order list on merchant dashboard
- /dashboard/orders (fills the existing nav stub): merchant's orders,
  RLS-scoped session client (rule 1), newest first: customer name/phone,
  items, total, status badge
- Live updates via Supabase Realtime subscription (enabling realtime on
  the table = config/SQL for the human if needed)
- ACCEPTANCE: completing a sandbox checkout makes the order appear/flip to
  'paid' on an already-open dashboard without reload

### 3.5 Resolve-failure + not-activated UX
- Bank-details page: friendly handling when account resolution fails —
  merchant corrects and retries, never dead-ends
- Storefront: "payments not yet activated" state gets proper treatment
  (browsing works; buying disabled with an honest notice)
- ACCEPTANCE: wrong account number → friendly retry; no-subaccount
  merchant's storefront browses fine but cannot reach Paystack

### Phase 4 (after Phase 3 closes): BI dashboard. Do not start unprompted.
Details in mvp-deliverables-plan-v2.md.

## Session protocol

- One deliverable per session unless told otherwise. State what you changed
  and what the human must verify before the next deliverable starts.
- Never mark acceptance criteria as met — that is the human's call.
- Do not refactor working code from earlier phases unless the current
  deliverable requires it.
- If a deliverable seems to require violating an architecture rule, stop and
  say so instead of working around it.
- If this file contradicts the actual code or database, say so before
  proceeding — the discrepancy is the bug.
- Note any new dependency in your summary, with size and why.
