-- 0010: expose ONLY a payments-active boolean to anon, not the code itself
alter table merchants
  add column if not exists payments_active boolean
  generated always as (paystack_subaccount_code is not null) stored;

grant select (payments_active) on merchants to anon;
