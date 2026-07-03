import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/service';

// Nigerian mobile formats: 0XXXXXXXXXX (11 digits) or +234XXXXXXXXXX
// (+234 followed by the 10-digit subscriber number).
const PHONE_REGEX = /^(0\d{10}|\+234\d{10})$/;

type CheckoutItem = { product_id: string; quantity: number };

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    slug,
    items,
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
  } = body as {
    slug?: string;
    items?: CheckoutItem[];
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    customer_address?: string;
  };

  if (!slug || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items selected.' }, { status: 400 });
  }
  if (!customer_name || !customer_name.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }
  if (!customer_phone || !PHONE_REGEX.test(customer_phone.trim())) {
    return NextResponse.json(
      { error: 'Enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678).' },
      { status: 400 }
    );
  }
  if (!customer_address || !customer_address.trim()) {
    return NextResponse.json({ error: 'Delivery address is required.' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, paystack_subaccount_code')
    .eq('slug', slug)
    .maybeSingle();

  if (!merchant) {
    return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
  }

  // Defense in depth — the storefront UI already hides checkout for a
  // merchant with no subaccount, but the API must never trust that the
  // client honored it.
  if (!merchant.paystack_subaccount_code) {
    return NextResponse.json(
      { error: 'This store is not accepting payments yet.' },
      { status: 409 }
    );
  }

  // Re-fetch authoritative product data — name, price, active status —
  // from the DB. Never trust client-supplied prices or names, and
  // confirm every item actually belongs to this merchant.
  const productIds = items.map((item) => item.product_id);

  const { data: products } = await supabase
    .from('products')
    .select('id, name, selling_price, cost_price, is_active')
    .eq('merchant_id', merchant.id)
    .in('id', productIds);

  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  let totalAmount = 0;
  const orderItemRows: {
    product_id: string;
    product_name_snapshot: string;
    quantity: number;
    unit_selling_price: number;
    unit_cost_price: number | null;
  }[] = [];

  for (const item of items) {
    const quantity = Number(item.quantity);
    const product = productById.get(item.product_id);

    if (!product || !product.is_active || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: 'One or more items are no longer available.' },
        { status: 400 }
      );
    }

    totalAmount += product.selling_price * quantity;
    orderItemRows.push({
      product_id: product.id,
      product_name_snapshot: product.name,
      quantity,
      unit_selling_price: product.selling_price,
      unit_cost_price: product.cost_price,
    });
  }

  // paystack_reference is intentionally left unset here — 3.2 assigns
  // it when initializing the Paystack transaction for this order.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      merchant_id: merchant.id,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      customer_email: customer_email?.trim() || null,
      customer_address: customer_address.trim(),
      total_amount: totalAmount,
    })
    .select('id, total_amount')
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: 'Could not create your order. Please try again.' },
      { status: 500 }
    );
  }

  const { error: itemsError } = await supabase.from('order_items').insert(
    orderItemRows.map((row) => ({
      order_id: order.id,
      merchant_id: merchant.id,
      ...row,
    }))
  );

  if (itemsError) {
    // Never leave a pending order with no line items behind.
    await supabase.from('orders').delete().eq('id', order.id);
    return NextResponse.json(
      { error: 'Could not create your order. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    order_id: order.id,
    total_amount: order.total_amount,
  });
}
