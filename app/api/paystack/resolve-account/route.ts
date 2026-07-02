import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Confirms an account number belongs to the name the merchant expects,
// per Paystack's own recommendation — catches typos before they become
// a misdirected payout.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { account_number, bank_code } = await request.json();

  if (!account_number || !bank_code) {
    return NextResponse.json(
      { error: 'account_number and bank_code are required' },
      { status: 400 }
    );
  }

  const res = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const json = await res.json();

  if (!json.status) {
    return NextResponse.json(
      { error: json.message || 'Could not resolve account. Check the details and try again.' },
      { status: 400 }
    );
  }

  return NextResponse.json({ account_name: json.data.account_name });
}
