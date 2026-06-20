import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const rows = await sql`
      SELECT name FROM players_registry
      WHERE name ILIKE ${q + '%'}
      ORDER BY games_count DESC, last_seen DESC
      LIMIT 8
    `;
    return NextResponse.json(rows.map((r) => (r as { name: string }).name));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const { names } = await req.json();
    for (const name of names) {
      if (!name?.trim()) continue;
      await sql`
        INSERT INTO players_registry (name, last_seen, games_count)
        VALUES (${name.trim()}, NOW(), 1)
        ON CONFLICT (name) DO UPDATE
          SET last_seen = NOW(),
              games_count = players_registry.games_count + 1
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}