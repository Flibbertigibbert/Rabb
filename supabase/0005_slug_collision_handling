-- ============================================================
-- 1.2 — Proper slug collision handling
-- ============================================================
-- Replaces the random-suffix stopgap from 0004 with the clean,
-- predictable pattern from the plan: buymywear → buymywear-2 →
-- buymywear-3, instead of buymywear-x7k2.
--
-- This is the same function name as 0004 (handle_new_merchant),
-- so CREATE OR REPLACE simply supersedes the old body — no need
-- to touch the trigger itself, it already points at this function.
--
-- Race-condition note: instead of checking "does this slug exist?"
-- and then inserting (which has a gap where two simultaneous
-- signups could both pass the check), this tries the actual INSERT
-- and catches unique_violation if it fails, then retries with the
-- next number. The database's unique constraint is the real source
-- of truth, not a pre-check — so this is safe even under concurrent
-- signups with the same business name.

create or replace function public.handle_new_merchant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug      text;
  candidate_slug text;
  counter        int := 1;
  max_attempts   int := 50;
begin
  base_slug := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'business_name', split_part(new.email, '@', 1)),
    '[^a-z0-9]+', '-', 'gi'
  ));
  base_slug := trim(both '-' from base_slug);

  if base_slug = '' or base_slug is null then
    base_slug := 'store';
  end if;

  candidate_slug := base_slug;

  loop
    begin
      insert into public.merchants (id, business_name, slug, email)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'business_name', 'My Store'),
        candidate_slug,
        new.email
      );
      exit; -- insert succeeded, we're done
    exception when unique_violation then
      counter := counter + 1;
      candidate_slug := base_slug || '-' || counter;
      if counter > max_attempts then
        raise exception 'Could not generate a unique slug for % after % attempts', new.email, max_attempts;
      end if;
    end;
  end loop;

  return new;
end;
$$;

-- Trigger already exists from 0004 and points at this function name,
-- so no changes needed there. Re-stating it here for clarity /
-- idempotency if you're running migrations out of order.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_merchant();