import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PLATFORM_COMMISSION_PERCENT = 1.5; // FR-3.3 — % that stays with the platform

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { account_number, bank_code, bank_name } = await request.json();

  if (!account_number || !bank_code || !bank_name) {
    return NextResponse.json(
      { error: 'account_number, bank_code, and bank_name are required' },
      { status: 400 }
    );
  }

  // This query is scoped by RLS (id = auth.uid()) — a merchant can
  // only ever fetch their own row here.
  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('business_name')
    .single();

  if (merchantError || !merchant) {
    return NextResponse.json({ error: 'Merchant record not found' }, { status: 404 });
  }

  const paystackRes = await fetch('https://api.paystack.co/subaccount', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      business_name: merchant.business_name,
      settlement_bank: bank_code,
      account_number,
      percentage_charge: PLATFORM_COMMISSION_PERCENT,
    }),
  });

  const paystackJson = await paystackRes.json();

  if (!paystackJson.status) {
    return NextResponse.json(
      { error: paystackJson.message || 'Failed to create Paystack subaccount' },
      { status: 502 }
    );
  }

  const subaccountCode = paystackJson.data.subaccount_code;

  // Update happens via the session-scoped client, not the service
  // role — RLS's merchants_update_own policy already restricts this
  // write to the logged-in merchant's own row, so no elevated
  // privileges are needed here.
  const { error: updateError } = await supabase
    .from('merchants')
    .update({
      paystack_subaccount_code: subaccountCode,
      settlement_bank_code: bank_code,
      settlement_account_number: account_number,
      kyc_status: 'verified',
    })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json(
      { error: 'Subaccount created but failed to save — contact support.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, subaccount_code: subaccountCode });
}
