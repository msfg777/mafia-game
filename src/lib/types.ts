export type Role = 'Мирний' | 'Шериф' | 'Маф' | 'Дон';
export type Status = 'Жив' | 'Заголосований' | 'Убран ночью' | 'Убран за фоли';
export type Team = 'мирні' | 'мафія';

export interface Player {
  seat: number;
  name: string;
  role: Role;
  status: Status;
  fouls: number;
}

export interface DayData {
  nominated: boolean;
  votes: number;
  killedNight: boolean;
}

export interface GameState {
  gameId: number | null;
  players: Player[];
  days: DayData[][];  // [playerIndex][dayIndex]
  currentDay: number;
  phase: 'setup' | 'playing' | 'finished';
  winner: Team | null;
}

export const ROLES: Role[] = ['Мирний', 'Шериф', 'Маф', 'Дон'];
export const ROLE_COLORS: Record<Role, string> = {
  'Мирний': 'bg-blue-100 text-blue-800',
  'Шериф': 'bg-yellow-100 text-yellow-800',
  'Маф': 'bg-red-100 text-red-800',
  'Дон': 'bg-purple-100 text-purple-800',
};
export const TEAM_COLORS: Record<Role, Team> = {
  'Мирний': 'мирні',
  'Шериф': 'мирні',
  'Маф': 'мафія',
  'Дон': 'мафія',
};
