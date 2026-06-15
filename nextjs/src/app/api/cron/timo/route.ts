import { NextResponse } from 'next/server';
import { syncTimoTransactions } from '@/lib/timo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Authentication: Check if request comes from Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CRON_SECRET) {
      console.error("Missing CRON_SECRET in environment variables.");
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await syncTimoTransactions();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Cron Timo Sync Error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
