-- 2.1 product CRUD + image upload: storage bucket for product photos.
--
-- Bucket is public so product images render on the storefront (2.1b) via
-- the public object URL without needing signed URLs — Supabase serves
-- public-bucket reads through a dedicated endpoint that bypasses RLS, so
-- no SELECT policy is needed here, only write policies.
--
-- Upload path convention: {merchant_id}/{filename} — the policies below
-- scope insert/update/delete to a merchant's own folder only.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_merchant_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "product_images_merchant_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "product_images_merchant_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
