'use client';

import { useState, useCallback } from 'react';

type Role = 'Мирний' | 'Шериф' | 'Маф' | 'Дон';
type Status = 'Жив' | 'Заголосований' | 'Убран ночью' | 'Убран за фоли';
type Team = 'мирні' | 'мафія';

interface Player {
  seat: number;
  name: string;
  role: Role;
  status: Status;
  fouls: number;
}

interface DayData {
  nom: boolean;
  votes: number;
  night: boolean;
}

const ROLES: Role[] = ['Мирний', 'Шериф', 'Маф', 'Дон'];
const STATUSES: Status[] = ['Жив', 'Заголосований', 'Убран ночью', 'Убран за фоли'];

const ROLE_COLORS: Record<Role, string> = {
  'Мирний': 'bg-blue-100 text-blue-900',
  'Шериф': 'bg-yellow-100 text-yellow-900',
  'Маф': 'bg-red-100 text-red-900',
  'Дон': 'bg-purple-100 text-purple-900',
};

const STATUS_COLORS: Record<Status, string> = {
  'Жив': 'text-green-700',
  'Заголосований': 'text-amber-700',
  'Убран ночью': 'text-gray-500',
  'Убран за фоли': 'text-red-700',
};

const DAY_BG = [
  'bg-yellow-50',
  'bg-orange-50',
  'bg-lime-50',
  'bg-cyan-50',
  'bg-purple-50',
  'bg-pink-50',
  'bg-green-50',
];

function initPlayers(): Player[] {
  return Array.from({ length: 10 }, (_, i) => ({
    seat: i + 1,
    name: '',
    role: 'Мирний',
    status: 'Жив',
    fouls: 0,
  }));
}

function initDays(): DayData[][] {
  return Array.from({ length: 10 }, () =>
    Array.from({ length: 7 }, () => ({ nom: false, votes: 0, night: false }))
  );
}

export default function GameTable() {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [players, setPlayers] = useState<Player[]>(initPlayers());
  const [days, setDays] = useState<DayData[][]>(initDays());
  const [gameId, setGameId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [winner, setWinner] = useState<Team | null>(null);

  const showMsg = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const updatePlayerField = useCallback((pi: number, field: keyof Player, val: string | number) => {
    setPlayers(prev => prev.map((p, i) => i === pi ? { ...p, [field]: val } : p));
  }, []);

  const addFoul = useCallback((pi: number) => {
    setPlayers(prev => prev.map((p, i) => {
      if (i !== pi) return p;
      const f = Math.min(p.fouls + 1, 4);
      return { ...p, fouls: f, status: f >= 4 ? 'Убран за фоли' : p.status };
    }));
  }, []);

  const removeFoul = useCallback((pi: number) => {
    setPlayers(prev => prev.map((p, i) => {
      if (i !== pi) return p;
      const f = Math.max(0, p.fouls - 1);
      return { ...p, fouls: f, status: p.status === 'Убран за фоли' && f < 4 ? 'Жив' : p.status };
    }));
  }, []);

  const updateDay = useCallback((pi: number, di: number, field: keyof DayData, val: boolean | number) => {
    setDays(prev => {
      const next = prev.map(r => [...r]);
      next[pi] = [...next[pi]];
      next[pi][di] = { ...next[pi][di], [field]: val };
      return next;
    });
  }, []);

  const startGame = async () => {
    setSaving(true);
    try {
      await fetch('/api/init');
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: players.map(p => ({
            seat: p.seat,
            name: p.name || `Гравець ${p.seat}`,
            role: p.role,
          })),
        }),
      });
      const data = await res.json();
      setGameId(data.gameId);
      setPhase('playing');
      showMsg(`Гру #${data.gameId} розпочато!`);
    } catch {
      showMsg('Помилка підключення до БД');
    }
    setSaving(false);
  };

  const finishGame = async (winnerTeam: Team) => {
    if (!gameId) return;
    setSaving(true);
    try {
      await fetch(`/api/games/${gameId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner: winnerTeam, players, days }),
      });
      setWinner(winnerTeam);
      setPhase('finished');
      setShowModal(false);
      showMsg(`Перемогли ${winnerTeam === 'мирні' ? 'Мирні' : 'Мафія'}!`);
    } catch {
      showMsg('Помилка збереження');
    }
    setSaving(false);
  };

  const resetGame = () => {
    setPhase('setup');
    setPlayers(initPlayers());
    setDays(initDays());
    setGameId(null);
    setWinner(null);
    setMsg('');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎭</span>
          <span className="font-semibold text-sm">Мафія</span>
          {gameId && <span className="text-gray-400 text-xs">Гра #{gameId}</span>}
        </div>
        <div className="flex gap-2">
          {phase === 'setup' && (
            <button
              onClick={startGame}
              disabled={saving}
              className="bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
            >
              {saving ? 'Збереження...' : '▶ Розпочати гру'}
            </button>
          )}
          {phase === 'playing' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-red-700 text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              🏁 Кінець гри
            </button>
          )}
          {phase === 'finished' && (
            <button
              onClick={resetGame}
              className="bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              + Нова гра
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className="bg-blue-50 text-blue-800 text-center py-1.5 text-xs border-b border-blue-100">
          {msg}
        </div>
      )}

      {/* Winner */}
      {winner && (
        <div className={`text-center py-2 text-sm font-semibold ${winner === 'мирні' ? 'bg-blue-700 text-white' : 'bg-red-800 text-white'}`}>
          {winner === 'мирні' ? '🏙️ Перемогли Мирні!' : '🔫 Перемогла Мафія!'}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="border-collapse w-full" style={{ minWidth: 900 }}>
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="sticky left-0 bg-gray-100 z-10 border border-gray-300 px-1 py-1 w-7">#</th>
              <th className="sticky left-7 bg-gray-100 z-10 border border-gray-300 px-2 py-1 text-left w-24">Ім&apos;я</th>
              <th className="border border-gray-300 px-1 py-1 w-20">Роль</th>
              <th className="border border-gray-300 px-1 py-1 w-24">Статус</th>
              <th className="border border-gray-300 px-1 py-1 w-16">Фоли</th>
              {Array.from({ length: 7 }, (_, i) => (
                <th key={i} colSpan={3} className={`border border-gray-300 px-1 py-1 text-center ${DAY_BG[i]}`}>
                  День {i + 1}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50 text-gray-500">
              <th className="sticky left-0 bg-gray-50 z-10 border border-gray-300" />
              <th className="sticky left-7 bg-gray-50 z-10 border border-gray-300" />
              <th className="border border-gray-300" />
              <th className="border border-gray-300" />
              <th className="border border-gray-300" />
              {Array.from({ length: 7 }, (_, i) => (
                <>
                  <th key={`${i}a`} className={`border border-gray-300 px-1 py-0.5 font-normal ${DAY_BG[i]}`}>Вист.</th>
                  <th key={`${i}b`} className={`border border-gray-300 px-1 py-0.5 font-normal ${DAY_BG[i]}`}>Гол.</th>
                  <th key={`${i}c`} className="border border-gray-300 px-1 py-0.5 font-normal bg-gray-100">Ніч</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, pi) => {
              const elim = p.status !== 'Жив';
              return (
                <tr key={pi} className={elim ? 'opacity-50' : pi % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className={`sticky left-0 z-10 border border-gray-300 text-center font-medium text-gray-500 ${pi % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    {p.seat}
                  </td>
                  <td className={`sticky left-7 z-10 border border-gray-300 px-1 ${pi % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    {phase === 'setup' ? (
                      <input
                        type="text"
                        value={p.name}
                        onChange={e => updatePlayerField(pi, 'name', e.target.value)}
                        placeholder={`Гравець ${p.seat}`}
                        className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    ) : (
                      <span className={`font-medium ${elim ? 'line-through text-gray-400' : ''}`}>
                        {p.name || `Гравець ${p.seat}`}
                      </span>
                    )}
                  </td>

                  {/* Role */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">
                    {phase === 'setup' ? (
                      <select
                        value={p.role}
                        onChange={e => updatePlayerField(pi, 'role', e.target.value)}
                        className="text-xs border border-gray-300 rounded px-1 py-0.5 w-full"
                      >
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[p.role]}`}>
                        {p.role}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="border border-gray-300 px-1 py-0.5 text-center">
                    {phase !== 'setup' ? (
                      <select
                        value={p.status}
                        onChange={e => updatePlayerField(pi, 'status', e.target.value as Status)}
                        className={`text-xs border-0 bg-transparent w-full font-medium focus:outline-none ${STATUS_COLORS[p.status]}`}
                      >
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Fouls */}
                  <td className="border border-gray-300 px-1 py-0.5">
                    <div className="flex items-center justify-center gap-0.5">
                      {Array.from({ length: 4 }, (_, fi) => (
                        <button
                          key={fi}
                          onClick={() => phase !== 'setup' && addFoul(pi)}
                          disabled={phase === 'setup'}
                          className={`w-4 h-4 rounded-sm text-xs flex items-center justify-center border transition-colors ${
                            fi < p.fouls
                              ? fi >= 3
                                ? 'bg-red-500 border-red-600 text-white'
                                : 'bg-amber-400 border-amber-500 text-white'
                              : 'bg-gray-100 border-gray-300 text-gray-300'
                          }`}
                        >
                          {fi < p.fouls ? '✕' : ''}
                        </button>
                      ))}
                      {phase !== 'setup' && p.fouls > 0 && (
                        <button
                          onClick={() => removeFoul(pi)}
                          className="w-3.5 h-3.5 rounded-sm bg-gray-200 border border-gray-300 text-gray-500 flex items-center justify-center ml-0.5 text-xs"
                        >−</button>
                      )}
                    </div>
                  </td>

                  {/* Days */}
                  {Array.from({ length: 7 }, (_, di) => {
                    const d = days[pi][di];
                    const disabled = phase === 'setup' || elim;
                    return (
                      <>
                        <td key={`${pi}-${di}-n`} className={`border border-gray-300 text-center ${DAY_BG[di]}`}>
                          <input type="checkbox" checked={d.nom} disabled={disabled}
                            onChange={e => updateDay(pi, di, 'nom', e.target.checked)}
                            className="w-3.5 h-3.5 cursor-pointer disabled:opacity-30" />
                        </td>
                        <td key={`${pi}-${di}-v`} className={`border border-gray-300 text-center ${DAY_BG[di]}`}>
                          <input type="number" min={0} max={10} value={d.votes || ''} disabled={disabled}
                            onChange={e => updateDay(pi, di, 'votes', parseInt(e.target.value) || 0)}
                            placeholder="—"
                            className="w-7 text-center text-xs border border-gray-200 rounded bg-white disabled:opacity-30 focus:outline-none" />
                        </td>
                        <td key={`${pi}-${di}-k`} className="border border-gray-300 text-center bg-gray-100">
                          <input type="checkbox" checked={d.night} disabled={disabled}
                            onChange={e => updateDay(pi, di, 'night', e.target.checked)}
                            className="w-3.5 h-3.5 cursor-pointer disabled:opacity-30" />
                        </td>
                      </>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Finish modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-72 shadow-xl border border-gray-200">
            <h2 className="text-base font-semibold text-center mb-1">🏁 Кінець гри</h2>
            <p className="text-gray-500 text-xs text-center mb-5">Яка команда перемогла?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => finishGame('мирні')} disabled={saving}
                className="bg-blue-700 text-white py-4 rounded-lg font-semibold flex flex-col items-center gap-1 text-sm disabled:opacity-50">
                <span className="text-2xl">🏙️</span> Мирні
              </button>
              <button onClick={() => finishGame('мафія')} disabled={saving}
                className="bg-red-800 text-white py-4 rounded-lg font-semibold flex flex-col items-center gap-1 text-sm disabled:opacity-50">
                <span className="text-2xl">🔫</span> Мафія
              </button>
            </div>
            <button onClick={() => setShowModal(false)}
              className="w-full mt-3 text-gray-400 text-xs py-2 hover:text-gray-600">
              Скасувати
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
