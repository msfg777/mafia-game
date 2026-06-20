import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { TEAM_COLORS } from '@/lib/types';
import type { Role } from '@/lib/types';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { winner, players, days } = await req.json();
    const { id } = await params;
    const gameId = parseInt(id);

    // Update game winner
    await sql`
      UPDATE games SET winner_team = ${winner}, finished_at = NOW()
      WHERE id = ${gameId}
    `;

    // Update scores
    for (const player of players) {
      const team = TEAM_COLORS[player.role as Role];
      const score = team === winner ? 1 : 0;
      await sql`
        UPDATE game_players SET score = ${score}
        WHERE game_id = ${gameId} AND seat = ${player.seat}
      `;
    }

    // Save day data
    for (let dayIdx = 0; dayIdx < days[0].length; dayIdx++) {
      for (let playerIdx = 0; playerIdx < days.length; playerIdx++) {
        const d = days[playerIdx][dayIdx];
        if (d.nominated || d.votes > 0 || d.killedNight) {
          await sql`
            INSERT INTO game_days (game_id, day_number, seat, nominated, votes, killed_night)
            VALUES (${gameId}, ${dayIdx + 1}, ${playerIdx + 1}, ${d.nominated}, ${d.votes}, ${d.killedNight})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }

    // Save fouls
    for (const player of players) {
      await sql`
        UPDATE game_players SET score = score
        WHERE game_id = ${gameId} AND seat = ${player.seat}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
