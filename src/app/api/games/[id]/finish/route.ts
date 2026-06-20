import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { winner, players, bestMove } = body;
    const { id } = await params;
    const gameId = parseInt(id);

    await sql`UPDATE games SET winner_team = ${winner}, finished_at = NOW() WHERE id = ${gameId}`;

    const mafia = ['Маф', 'Дон'];
    const civilian = ['Мирний', 'Шериф'];

    for (const player of players) {
      const isMafia = mafia.includes(player.role);
      const isCivilian = civilian.includes(player.role);

      let baseScore = 0;
      if (winner === 'мафія' && isMafia) baseScore = 1;
      if (winner === 'мирні' && isCivilian) baseScore = 1;

      let bestMoveBonus = 0;
      if (bestMove && bestMove.playerSeat === player.seat) {
        const guesses: number[] = [bestMove.guess1, bestMove.guess2, bestMove.guess3].filter(Boolean);
        if (guesses.length === 3) {
          const allMafia = guesses.every((seat: number) => {
            const g = players.find((p: { seat: number; role: string }) => p.seat === seat);
            return g && mafia.includes(g.role);
          });
          if (allMafia) bestMoveBonus = 0.4;
        }
      }

      await sql`
        UPDATE game_players 
        SET score = ${(baseScore + bestMoveBonus).toFixed(2)}::numeric,
            best_move_bonus = ${bestMoveBonus.toFixed(2)}::numeric
        WHERE game_id = ${gameId} AND seat = ${player.seat}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}