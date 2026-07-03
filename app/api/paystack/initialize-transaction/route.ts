import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  const { order_id } = (await request.json()) as { order_id?: string };

  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  const supabase = createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, merchant_id, status, total_amount, customer_email, paystack_reference')
    .eq('id', order_id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  // Only a still-pending order can be (re-)initialized — never
  // re-charge an order that's already paid/refunded/cancelled.
  if (order.status !== 'pending') {
    return NextResponse.json(
      { error: 'This order can no longer be paid for.' },
      { status: 409 }
    );
  }

  const { data: merchant } = await supabase
    .from('merchants')
    .select('paystack_subaccount_code')
    .eq('id', order.merchant_id)
    .maybeSingle();

  // Defense in depth — checkout already required this, but re-check
  // here since initialize can be retried independently.
  if (!merchant?.paystack_subaccount_code) {
    return NextResponse.json(
      { error: 'This store is not accepting payments yet.' },
      { status: 409 }
    );
  }

  // Reuse the existing reference if this order was already initialized
  // once before (e.g. the customer closed the popup and retried) —
  // paystack_reference is unique, so we must never generate a second
  // one for the same order.
  let reference = order.paystack_reference;

  if (!reference) {
    reference = `rabb_${order.id}_${Date.now().toString(36)}`;

    const { error: referenceError } = await supabase
      .from('orders')
      .update({ paystack_reference: reference })
      .eq('id', order.id);

    if (referenceError) {
      return NextResponse.json(
        { error: 'Could not start payment. Please try again.' },
        { status: 500 }
      );
    }
  }

  // Paystack requires an email even though our customers may skip it —
  // a non-routable placeholder (RFC 2606 .invalid TLD) satisfies the
  // field without pretending we have a real address.
  const email = order.customer_email || `guest+${order.id}@guest.invalid`;

  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      // Paystack amounts are in kobo (NGN * 100); round to avoid
      // floating-point drift on the numeric(12,2) total.
      amount: Math.round(order.total_amount * 100),
      reference,
      // percentage_charge (1.5%) is already configured on the
      // subaccount itself (see create-subaccount route) — Paystack
      // applies the split automatically for any transaction routed
      // through it, so it isn't resent here.
      subaccount: merchant.paystack_subaccount_code,
    }),
  });

  const paystackJson = await paystackRes.json();

  if (!paystackJson.status) {
    return NextResponse.json(
      { error: paystackJson.message || 'Could not start payment. Please try again.' },
      { status: 502 }
    );
  }

  return NextResponse.json({
    access_code: paystackJson.data.access_code,
    reference: paystackJson.data.reference,
  });
}
