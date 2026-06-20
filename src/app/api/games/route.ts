import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { players } = await req.json();

    const [game] = await sql`
      INSERT INTO games DEFAULT VALUES RETURNING id
    `;

    for (const p of players) {
      await sql`
        INSERT INTO game_players (game_id, seat, name, role)
        VALUES (${game.id}, ${p.seat}, ${p.name}, ${p.role})
      `;
    }

    return NextResponse.json({ gameId: game.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
