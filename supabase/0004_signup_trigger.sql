-- ============================================================
-- 1.1 — Signup flow: auto-create merchant row
-- ============================================================
-- Why a trigger instead of a client-side insert right after
-- supabase.auth.signUp()?
--
-- If email confirmation is enabled (Supabase's default), there is
-- no active session immediately after signUp() — so a client-side
-- insert into `merchants` would fail the RLS check (id = auth.uid())
-- because auth.uid() is null until the user confirms and logs in.
--
-- A database trigger on auth.users runs with SECURITY DEFINER,
-- so it bypasses RLS entirely and fires reliably the moment the
-- auth user row is created — regardless of confirmation state.
--
-- business_name is passed in via signUp()'s `options.data`, which
-- Supabase stores in `raw_user_meta_data`.

create or replace function public.handle_new_merchant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug     text;
  candidate_slug text;
  attempt       int := 0;
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

  -- Basic collision guard so signup never hard-fails on a duplicate
  -- slug. This is a stopgap — Phase 1.2 replaces it with proper
  -- sequential suffixing (buymywear, buymywear-2, buymywear-3...)
  -- and a "your storefront link" confirmation step in the UI.
  loop
    begin
      insert into public.merchants (id, business_name, slug, email)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'business_name', 'My Store'),
        candidate_slug,
        new.email
      );
      exit; -- insert succeeded
    exception when unique_violation then
      attempt := attempt + 1;
      candidate_slug := base_slug || '-' || substr(md5(random()::text), 1, 4);
      if attempt > 5 then
        raise exception 'Could not generate a unique slug for %', new.email;
      end if;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_merchant();