-- 1.4 public storefront shell: anonymous visitors need to resolve a
-- merchant by slug. Existing merchants RLS only has a "select own row"
-- policy (auth.uid() = id), so anon reads currently return nothing.
--
-- Column-level grant mirrors the existing anon REVOKE pattern on
-- products.cost_price — anon gets exactly the columns the storefront
-- shell needs, nothing else (no email, no paystack_subaccount_code).

revoke select on merchants from anon;
grant select (business_name, slug) on merchants to anon;

create policy "merchants_select_public"
  on merchants
  for select
  to anon
  using (true);
