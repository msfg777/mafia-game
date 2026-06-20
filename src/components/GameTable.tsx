'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type Role = 'Мирний' | 'Шериф' | 'Маф' | 'Дон';
type Team = 'мирні' | 'мафія';

interface Player {
  seat: number;
  name: string;
  role: Role;
  fouls: number;
}

interface DayData {
  nom: boolean;
  votes: number;
  night: boolean;
}

const ROLES: Role[] = ['Мирний', 'Маф', 'Дон', 'Шериф'];
const ROLE_ICON: Record<Role, string> = {
  'Мирний': '', 'Маф': '', 'Дон': '🎩', 'Шериф': '⭐',
};
const ROLE_COLOR: Record<Role, string> = {
  'Мирний': '#dc2626', 'Маф': '#111827', 'Дон': '#111827', 'Шериф': '#dc2626',
};
const ROLE_TEAM: Record<Role, Team> = {
  'Мирний': 'мирні', 'Шериф': 'мирні', 'Маф': 'мафія', 'Дон': 'мафія',
};

const DAY_BG = [
  'rgba(250,204,21,0.08)', 'rgba(251,146,60,0.08)', 'rgba(163,230,53,0.08)',
  'rgba(34,211,238,0.08)', 'rgba(167,139,250,0.08)', 'rgba(249,168,212,0.08)',
  'rgba(74,222,128,0.08)',
];

function randomRoles(): Role[] {
  const roles: Role[] = ['Маф','Маф','Дон','Шериф','Мирний','Мирний','Мирний','Мирний','Мирний','Мирний'];
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

function initPlayers(): Player[] {
  return Array.from({ length: 10 }, (_, i) => ({
    seat: i + 1, name: '', role: 'Мирний', fouls: 0,
  }));
}

function initDays(): DayData[][] {
  return Array.from({ length: 10 }, () =>
    Array.from({ length: 7 }, () => ({ nom: false, votes: 0, night: false }))
  );
}

function RoleDot({ role }: { role: Role }) {
  const icon = ROLE_ICON[role];
  const color = ROLE_COLOR[role];
  return (
    <div
      className="w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0"
      style={{ background: color }}
    >
      {icon && <span style={{ fontSize: '9px' }}>{icon}</span>}
    </div>
  );
}

function NameStyle({ name, role }: { name: string; role: Role }) {
  const icon = ROLE_ICON[role];
  return (
    <span className="font-bold text-sm" style={{ color: ROLE_COLOR[role] }}>
      {name}{icon && <span className="ml-0.5 text-xs">{icon}</span>}
    </span>
  );
}

function AutocompleteInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = async (v: string) => {
    onChange(v);
    if (v.length < 1) { setSuggestions([]); setOpen(false); return; }
    try {
      const res = await fetch(`/api/players?q=${encodeURIComponent(v)}`);
      const data = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
    } catch { setSuggestions([]); }
  };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      {open && (
        <div className="absolute left-0 top-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg z-30 min-w-full">
          {suggestions.map(s => (
            <div key={s} className="px-2 py-1 text-xs hover:bg-blue-50 cursor-pointer"
              onMouseDown={() => { onChange(s); setOpen(false); }}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
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

  const cycleRole = useCallback((pi: number) => {
    if (phase !== 'setup') return;
    setPlayers(prev => prev.map((p, i) => {
      if (i !== pi) return p;
      const idx = (ROLES.indexOf(p.role) + 1) % ROLES.length;
      return { ...p, role: ROLES[idx] };
    }));
  }, [phase]);

  const randomizeRoles = useCallback(() => {
    if (phase !== 'setup') return;
    const roles = randomRoles();
    setPlayers(prev => prev.map((p, i) => ({ ...p, role: roles[i] })));
  }, [phase]);

  const updateName = useCallback((pi: number, name: string) => {
    setPlayers(prev => prev.map((p, i) => i === pi ? { ...p, name } : p));
  }, []);

  const addFoul = useCallback((pi: number) => {
    setPlayers(prev => prev.map((p, i) =>
      i !== pi ? p : { ...p, fouls: Math.min(p.fouls + 1, 4) }
    ));
  }, []);

  const removeFoul = useCallback((pi: number) => {
    setPlayers(prev => prev.map((p, i) =>
      i !== pi ? p : { ...p, fouls: Math.max(0, p.fouls - 1) }
    ));
  }, []);

  const updateDay = useCallback((pi: number, di: number, field: keyof DayData, val: boolean | number) => {
    setDays(prev => {
      const next = prev.map(r => [...r]);
      next[pi][di] = { ...next[pi][di], [field]: val };
      if (field === 'nom' && !val) {
        next[pi][di].votes = 0;
      }
      return next;
    });
  }, []);

  const startGame = async () => {
    setSaving(true);
    try {
      await fetch('/api/init');
      const names = players.map(p => p.name || `Гравець ${p.seat}`);
      await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: names.filter(n => !n.startsWith('Гравець')) }),
      });
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: players.map((p, i) => ({
            seat: p.seat, name: names[i], role: p.role,
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
    setPhase('setup'); setPlayers(initPlayers()); setDays(initDays());
    setGameId(null); setWinner(null); setMsg('');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎭</span>
          <span className="font-semibold text-sm">Мафія</span>
          {gameId && <span className="text-gray-400 text-xs">Гра #{gameId}</span>}
        </div>
        <div className="flex gap-2">
          {phase === 'setup' && (
            <button onClick={startGame} disabled={saving}
              className="bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50">
              {saving ? 'Збереження...' : '▶ Розпочати гру'}
            </button>
          )}
          {phase === 'playing' && (
            <button onClick={() => setShowModal(true)}
              className="bg-red-700 text-white px-3 py-1.5 rounded text-xs font-medium">
              🏁 Кінець гри
            </button>
          )}
          {phase === 'finished' && (
            <button onClick={resetGame}
              className="bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium">
              + Нова гра
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="bg-blue-50 text-blue-800 text-center py-1.5 text-xs border-b border-blue-100">{msg}</div>
      )}
      {winner && (
        <div className={`text-center py-2 text-sm font-semibold ${winner === 'мирні' ? 'bg-blue-700 text-white' : 'bg-red-800 text-white'}`}>
          {winner === 'мирні' ? '🏙️ Перемогли Мирні!' : '🔫 Перемогла Мафія!'}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="border-collapse w-full" style={{ minWidth: 900 }}>
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="sticky left-0 bg-gray-100 z-10 border border-gray-300 px-1 py-1 w-7">#</th>
              <th className="sticky left-7 bg-gray-100 z-10 border border-gray-300 px-2 py-1 text-left w-28">Ім&apos;я</th>
              <th className="border border-gray-300 px-1 py-1 w-14">Фоли</th>
              {Array.from({ length: 7 }, (_, i) => (
                <th key={i} colSpan={3} className="border border-gray-300 px-1 py-1 text-center"
                  style={{ background: DAY_BG[i] }}>
                  День {i + 1}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50 text-gray-500">
              <th className="sticky left-0 bg-gray-50 z-10 border border-gray-300" />
              <th className="sticky left-7 bg-gray-50 z-10 border border-gray-300" />
              <th className="border border-gray-300" />
              {Array.from({ length: 7 }, (_, i) => (
                <>
                  <th key={`${i}k`} className="border border-gray-300 px-1 py-0.5 font-normal bg-gray-100">Ніч</th>
                  <th key={`${i}a`} className="border border-gray-300 px-1 py-0.5 font-normal" style={{ background: DAY_BG[i] }}>Вист.</th>
                  <th key={`${i}b`} className="border border-gray-300 px-1 py-0.5 font-normal" style={{ background: DAY_BG[i] }}>Гол.</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, pi) => {
              const elim = p.fouls >= 4;
              const rowBg = pi % 2 === 0 ? 'bg-white' : 'bg-gray-50';
              return (
                <tr key={pi} className={`${rowBg} ${elim ? 'opacity-50' : ''}`}>
                  <td className={`sticky left-0 z-10 border border-gray-300 text-center ${rowBg}`}>
                    <button onClick={() => cycleRole(pi)} disabled={phase !== 'setup'}
                      title="Натисни щоб змінити роль"
                      className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center mx-auto transition-colors ${
                        phase === 'setup'
                          ? 'bg-gray-200 hover:bg-blue-100 cursor-pointer border border-gray-300'
                          : 'bg-gray-100 border border-gray-200 cursor-default'
                      }`}>
                      {p.seat}
                    </button>
                  </td>
                  <td className={`sticky left-7 z-10 border border-gray-300 px-1 ${rowBg}`}>
                    {phase === 'setup' ? (
                      <div className="flex items-center gap-1.5">
                        <RoleDot role={p.role} />
                        <AutocompleteInput
                          value={p.name}
                          onChange={v => updateName(pi, v)}
                          placeholder={`Гравець ${p.seat}`}
                        />
                      </div>
                    ) : (
                      <NameStyle name={p.name || `Гравець ${p.seat}`} role={p.role} />
                    )}
                  </td>
                  <td className={`border border-gray-300 px-1 py-0.5 ${rowBg}`}>
                    <div className="flex items-center justify-center gap-0.5">
                      {Array.from({ length: 4 }, (_, fi) => (
                        <button key={fi} onClick={() => phase !== 'setup' && addFoul(pi)}
                          disabled={phase === 'setup'}
                          className={`w-4 h-4 rounded-sm text-xs flex items-center justify-center border ${
                            fi < p.fouls
                              ? fi >= 3 ? 'bg-red-500 border-red-600 text-white' : 'bg-amber-400 border-amber-500 text-white'
                              : 'bg-gray-100 border-gray-300'
                          }`}>
                          {fi < p.fouls ? '✕' : ''}
                        </button>
                      ))}
                      {phase !== 'setup' && p.fouls > 0 && (
                        <button onClick={() => removeFoul(pi)}
                          className="w-3.5 h-3.5 rounded-sm bg-gray-200 border border-gray-300 text-gray-500 flex items-center justify-center ml-0.5">−</button>
                      )}
                    </div>
                  </td>
                  {Array.from({ length: 7 }, (_, di) => {
                    const d = days[pi][di];
                    const off = phase === 'setup' || elim;
                    return (
                      <>
                        <td key={`k${di}`} className="border border-gray-300 text-center bg-gray-100">
                          <input type="checkbox" checked={d.night} disabled={off}
                            onChange={e => updateDay(pi, di, 'night', e.target.checked)}
                            className="w-3.5 h-3.5 disabled:opacity-30" />
                        </td>
                        <td key={`n${di}`} className="border border-gray-300 text-center" style={{ background: DAY_BG[di] }}>
                          <input type="checkbox" checked={d.nom} disabled={off}
                            onChange={e => updateDay(pi, di, 'nom', e.target.checked)}
                            className="w-3.5 h-3.5 disabled:opacity-30" />
                        </td>
                        <td key={`v${di}`} className="border border-gray-300 text-center" style={{ background: DAY_BG[di] }}>
                          <select
                            value={d.votes || ''}
                            disabled={off || !d.nom}
                            onChange={e => updateDay(pi, di, 'votes', parseInt(e.target.value) || 0)}
                            className="w-10 text-center text-xs border border-gray-200 rounded bg-white disabled:opacity-20 focus:outline-none"
                          >
                            <option value="">—</option>
                            {Array.from({ length: 10 }, (_, n) => (
                              <option key={n + 1} value={n + 1}>{n + 1}</option>
                            ))}
                          </select>
                        </td>
                      </>
                    );
                  })}
                </tr>
              );
            })}
            {phase === 'setup' && (
              <tr>
                <td colSpan={3 + 7 * 3} className="border border-gray-300 px-2 py-1.5 bg-gray-50">
                  <button onClick={randomizeRoles}
                    className="flex items-center gap-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors">
                    <span className="text-sm">🎲</span> C — випадкові ролі
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {phase === 'setup' && (
        <div className="flex gap-4 px-3 py-2 text-xs text-gray-500 flex-wrap border-t border-gray-100 items-center">
          <span>Натисни # щоб змінити роль:</span>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-600"/><span className="font-bold text-red-600">Мирний</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-900"/><span className="font-bold text-gray-900">Маф</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-900"/><span className="font-bold text-gray-900">Дон 🎩</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-600"/><span className="font-bold text-red-600">Шериф ⭐</span></div>
        </div>
      )}

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
              className="w-full mt-3 text-gray-400 text-xs py-2 hover:text-gray-600">Скасувати</button>
          </div>
        </div>
      )}
    </div>
  );
}