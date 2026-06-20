import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

type Role = 'Мирний' | 'Шериф' | 'Маф' | 'Дон';
const ROLE_TEAM: Record<Role, string> = {
  'Мирний': 'мирні', 'Шериф': 'мирні', 'Маф': 'мафія', 'Дон': 'мафія',
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { winner, players, days, bestMove } = await req.json();
    const { id } = await params;
    const gameId = parseInt(id);

    await sql`UPDATE games SET winner_team = ${winner}, finished_at = NOW() WHERE id = ${gameId}`;

    for (const player of players) {
      const team = ROLE_TEAM[player.role as Role];
      const baseScore = team === winner ? 1 : 0;

      let bestMoveBonus = 0;
      if (bestMove && bestMove.playerSeat === player.seat) {
        const guesses: number[] = [bestMove.guess1, bestMove.guess2, bestMove.guess3].filter(Boolean);
        if (guesses.length === 3) {
          const allMafia = guesses.every(seat => {
            const guessedPlayer = players.find((p: { seat: number }) => p.seat === seat);
            return guessedPlayer && (guessedPlayer.role === 'Маф' || guessedPlayer.role === 'Дон');
          });
          if (allMafia) bestMoveBonus = 0.4;
        }
      }

      await sql`
        UPDATE game_players SET score = ${baseScore + bestMoveBonus}, best_move_bonus = ${bestMoveBonus}
        WHERE game_id = ${gameId} AND seat = ${player.seat}
      `;
    }

    for (let di = 0; di < days[0].length; di++) {
      for (let pi = 0; pi < days.length; pi++) {
        const d = days[pi][di];
        if (d.nomOrder > 0 || d.votes > 0 || d.night) {
          await sql`
            INSERT INTO game_days (game_id, day_number, seat, nominated, votes, killed_night)
            VALUES (${gameId}, ${di + 1}, ${pi + 1}, ${d.nomOrder > 0}, ${d.votes}, ${d.night})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}