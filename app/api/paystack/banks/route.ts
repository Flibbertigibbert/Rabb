import { NextResponse } from 'next/server';

// Proxies Paystack's List Banks endpoint. Never call Paystack directly
// from the browser — the secret key must stay server-side.
export async function GET() {
  const res = await fetch('https://api.paystack.co/bank?currency=NGN', {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    },
    // Bank list barely changes — cache for an hour to cut down on calls.
    next: { revalidate: 3600 },
  });

  const json = await res.json();

  if (!json.status) {
    return NextResponse.json(
      { error: json.message || 'Failed to fetch banks' },
      { status: 502 }
    );
  }

  const banks = json.data.map((bank: { name: string; code: string }) => ({
    name: bank.name,
    code: bank.code,
  }));

  return NextResponse.json({ banks });
}
