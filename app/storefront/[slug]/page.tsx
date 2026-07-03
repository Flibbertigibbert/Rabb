import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/anon';
import styles from '../../public.module.css';

export default async function StorefrontPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, slug')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!merchant) {
    notFound();
  }

  // anon SELECT on merchants.id is required for this filter — see
  // supabase/0008_merchants_anon_id.sql.
  const { data: products } = await supabase
    .from('products')
    .select('id, name, image_url, selling_price, stock_quantity')
    .eq('merchant_id', merchant.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const initial = merchant.business_name.trim().charAt(0).toUpperCase();

  return (
    <div className={styles.storeShell}>
      <div className={styles.storeHeader}>
        <div className={styles.storeAvatar}>{initial}</div>
        <h1 className={styles.storeName}>{merchant.business_name}</h1>
        <p className={styles.storeSubtitle}>Online store</p>
      </div>

      <div className={styles.storeBody}>
        {!products || products.length === 0 ? (
          <div className={styles.emptyCard}>
            <p className={styles.emptyTitle}>No products yet</p>
            <p className={styles.emptyBody}>
              {merchant.business_name} is setting up shop. Check back soon.
            </p>
          </div>
        ) : (
          <div className={styles.productGrid}>
            {products.map((product) => {
              const soldOut = product.stock_quantity <= 0;
              return (
                <div key={product.id} className={styles.productCard}>
                  <div className={styles.productImageWrap}>
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className={styles.productImage}
                        style={{ opacity: soldOut ? 0.45 : 1 }}
                      />
                    ) : (
                      <div className={styles.productImagePlaceholder}>No photo</div>
                    )}
                    {soldOut && <span className={styles.soldOutBadge}>Sold out</span>}
                  </div>
                  <div className={styles.productInfo}>
                    <p className={styles.productName}>{product.name}</p>
                    <p className={styles.productPrice}>
                      ₦{product.selling_price.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
