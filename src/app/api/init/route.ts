import { NextResponse } from 'next/server';
import { initDB } from '@/lib/db';

export async function GET() {
  try {
    await initDB();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
