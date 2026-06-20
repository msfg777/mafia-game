import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL!);

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      winner_team VARCHAR(10),
      finished_at TIMESTAMP
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS game_players (
      id SERIAL PRIMARY KEY,
      game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      seat INTEGER NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL,
      score NUMERIC(5,2) DEFAULT 0,
      best_move_bonus NUMERIC(5,2) DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS game_days (
      id SERIAL PRIMARY KEY,
      game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL,
      seat INTEGER NOT NULL,
      nominated BOOLEAN DEFAULT FALSE,
      votes INTEGER DEFAULT 0,
      killed_night BOOLEAN DEFAULT FALSE
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS players_registry (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      last_seen TIMESTAMP DEFAULT NOW(),
      games_count INTEGER DEFAULT 1
    )
  `;
}