import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/service';

// Signature verification needs Node's crypto module (HMAC +
// timingSafeEqual) — this route must never run on the Edge runtime.
export const runtime = 'nodejs';

// Matches the percentage_charge configured on the subaccount at
// creation time (see create-subaccount/route.ts) — Paystack applies
// this split automatically, but our own payments bookkeeping still
// needs to record the platform/merchant breakdown ourselves.
const PLATFORM_COMMISSION_PERCENT = 1.5;

export async function POST(request: NextRequest) {
  // Read the RAW body first — verification must happen against the
  // exact bytes Paystack signed, strictly before any JSON parsing.
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  const expectedSignature = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  // Length check first — timingSafeEqual throws on mismatched lengths
  // rather than returning false, and short-circuiting here is safe
  // because it doesn't leak any information timingSafeEqual wouldn't.
  const signatureValid =
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!signatureValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  if (payload.event !== 'charge.success') {
    // Ack anything we don't act on so Paystack doesn't keep retrying it.
    return NextResponse.json({ received: true });
  }

  const data = payload.data;

  if (data?.status !== 'success' || !data?.reference || typeof data?.amount !== 'number') {
    return NextResponse.json({ received: true });
  }

  // Split in integer kobo first to avoid floating-point drift, then
  // convert to naira only at the very end for storage.
  const amountKobo = data.amount;
  const platformFeeKobo = Math.round(amountKobo * (PLATFORM_COMMISSION_PERCENT / 100));
  const merchantAmountKobo = amountKobo - platformFeeKobo;

  const amount = amountKobo / 100;
  const platformFee = platformFeeKobo / 100;
  const merchantAmount = merchantAmountKobo / 100;

  const supabase = createClient();

  // process_paystack_charge_success (supabase/0011) runs the idempotent
  // payments insert, the pending -> paid flip, and the per-item stock
  // decrement as ONE Postgres transaction — see that migration for why.
  const { data: result, error } = await supabase.rpc('process_paystack_charge_success', {
    p_paystack_reference: data.reference,
    p_webhook_event_id: String(data.id),
    p_amount: amount,
    p_platform_fee: platformFee,
    p_merchant_amount: merchantAmount,
  });

  if (error) {
    // Transient/unexpected DB failure — 500 so Paystack retries.
    console.error('process_paystack_charge_success failed:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  if (!result?.ok) {
    if (result?.reason === 'amount_mismatch') {
      // Payment was recorded (see 0011) but the order was NOT flipped to
      // paid and stock was NOT decremented — the confirmed amount didn't
      // match the order's total_amount. This is a real discrepancy, not
      // a routine no-op; it needs a human to look at the order.
      console.warn(
        'charge.success amount mismatch — order NOT fulfilled:',
        data.reference,
        result.order_id
      );
    } else {
      // No order matches this reference. Nothing to retry into existence
      // (this can happen with Paystack's dashboard "Send test webhook",
      // which uses a fake reference) — ack rather than trigger endless
      // retries, but log it since for a real transaction this would be
      // worth investigating.
      console.warn('charge.success webhook with no matching order:', data.reference);
    }
  }

  return NextResponse.json({ received: true });
}
