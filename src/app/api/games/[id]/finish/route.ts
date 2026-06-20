import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { winner, players, days, bestMove } = body;
    const { id } = await params;
    const gameId = parseInt(id);

    console.log('=== FINISH GAME ===');
    console.log('gameId:', gameId);
    console.log('winner:', winner);
    console.log('bestMove:', JSON.stringify(bestMove));
    console.log('players:', JSON.stringify(players.map((p: {seat: number; name: string; role: string}) => ({seat: p.seat, name: p.name, role: p.role}))));

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

      const totalScore = baseScore + bestMoveBonus;
      console.log(`Player ${player.seat} ${player.name} role=${player.role} isMafia=${isMafia} isCivilian=${isCivilian} winner=${winner} base=${baseScore} bonus=${bestMoveBonus} total=${totalScore}`);

      await sql`
        UPDATE game_players 
        SET score = ${totalScore}, best_move_bonus = ${bestMoveBonus}
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
    console.error('FINISH ERROR:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}