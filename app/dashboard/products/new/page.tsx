'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/image-compress';
import styles from '../../dashboard.module.css';

export default function NewProductPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleImageChange(file: File | null) {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError('Your session expired. Please log in again.');
      return;
    }

    let imageUrl: string | null = null;

    if (imageFile) {
      try {
        const compressed = await compressImage(imageFile);
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, compressed, { contentType: 'image/jpeg' });

        if (uploadError) {
          setSaving(false);
          setError('Could not upload the photo. Try a different image.');
          return;
        }

        imageUrl = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
      } catch {
        setSaving(false);
        setError('Could not process that image. Try a different photo.');
        return;
      }
    }

    const { error: insertError } = await supabase.from('products').insert({
      merchant_id: user.id,
      name,
      description: description || null,
      image_url: imageUrl,
      selling_price: parseFloat(sellingPrice),
      cost_price: costPrice ? parseFloat(costPrice) : null,
      stock_quantity: parseInt(stockQuantity, 10) || 0,
      low_stock_threshold: parseInt(lowStockThreshold, 10) || 5,
      is_active: isActive,
    });

    setSaving(false);

    if (insertError) {
      setError('Could not save this product. Check the fields and try again.');
      return;
    }

    // Query flag triggers a visible "Product added" toast on the list
    // page — a save should never be silent, even across a redirect.
    router.push('/dashboard/products?created=1');
  }

  return (
    <main style={{ padding: '2rem 1.25rem' }}>
      <form
        onSubmit={handleSubmit}
        style={{ width: '100%', maxWidth: 380, margin: '0 auto' }}
      >
        <h1 className={styles.pageTitle} style={{ marginBottom: '1.5rem' }}>Add product</h1>

        <label className={styles.label}>
          Name
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ankara print dress"
            className={styles.input}
          />
        </label>

        <label className={styles.label}>
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={styles.textarea}
            style={{ resize: 'vertical' }}
          />
        </label>

        <label className={styles.label}>
          Photo (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
            className={styles.input}
            style={{ padding: '0.5rem 0' }}
          />
        </label>

        {imagePreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt="Preview"
            style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, marginBottom: '1rem' }}
          />
        )}

        <label className={styles.label}>
          Selling price (₦)
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            placeholder="5000"
            className={styles.input}
          />
        </label>

        <label className={styles.label}>
          Cost price (₦, optional)
          <input
            type="number"
            min="0"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder="Skip if unknown"
            className={styles.input}
          />
        </label>
        <p className={styles.helperText}>
          Skipping this is fine — we'll flag the product as "margin unknown"
          on your products list instead of guessing a profit.
        </p>

        <label className={styles.label}>
          Stock quantity
          <input
            type="number"
            min="0"
            step="1"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.label}>
          Low stock warning threshold
          <input
            type="number"
            min="0"
            step="1"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            className={styles.input}
          />
        </label>

        <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Visible on storefront
        </label>

        {error && <p className={styles.errorText}>{error}</p>}

        <button type="submit" disabled={saving} className={styles.btnPrimary} style={{ width: '100%' }}>
          {saving ? 'Saving…' : 'Save product'}
        </button>

        <Link
          href="/dashboard/products"
          className={styles.textMuted}
          style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', fontSize: '0.875rem' }}
        >
          Cancel
        </Link>
      </form>
    </main>
  );
}
