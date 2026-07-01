'use client';

import { useState, useCallback, useEffect } from 'react';
import { AutocompleteInput } from './AutocompleteInput';

type Role = 'Мирний' | 'Шериф' | 'Маф' | 'Дон';
type Team = 'мирні' | 'мафія';

interface Player {
  seat: number;
  name: string;
  role: Role;
  fouls: number;
  elim: boolean;
}

interface VoteEntry {
  seat: number;
  votes: number;
}

interface DayData {
  rounds: VoteEntry[][];
  kickVotes: number;
}

interface BestMove {
  p: number | null;
  g1: number | null;
  g2: number | null;
  g3: number | null;
}

const ROLES: Role[] = ['Мирний', 'Маф', 'Дон', 'Шериф'];
const ROLE_COLOR: Record<Role, string> = {
  'Мирний': '#dc2626', 'Маф': '#111827', 'Дон': '#111827', 'Шериф': '#dc2626',
};
const ROLE_ICON: Record<Role, string> = {
  'Мирний': '', 'Маф': '', 'Дон': '🎩', 'Шериф': '⭐',
};

function initPlayers(): Player[] {
  return Array.from({ length: 10 }, (_, i) => ({
    seat: i + 1, name: '', role: 'Мирний', fouls: 0, elim: false,
  }));
}

function initDays(): DayData[] {
  return Array.from({ length: 5 }, () => ({ rounds: [[]], kickVotes: 0 }));
}

function randomRoles(): Role[] {
  const r: Role[] = ['Маф','Маф','Дон','Шериф','Мирний','Мирний','Мирний','Мирний','Мирний','Мирний'];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function RoleDot({ role }: { role: Role }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 13, height: 13, borderRadius: 3, background: ROLE_COLOR[role],
      fontSize: 8, marginRight: 4, verticalAlign: 'middle', flexShrink: 0,
    }}>
      {ROLE_ICON[role]}
    </span>
  );
}

function SeatSelect({ value, onChange, label }: {
  value: number | null; onChange: (v: number | null) => void; label: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, color: '#9ca3af' }}>{label}</span>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value ? parseInt(e.target.value) : null)}
        style={{
          width: 30, border: '0.5px solid #e5e7eb', borderRadius: 4,
          padding: '2px 1px', fontSize: 11, fontWeight: 700,
          background: 'white', color: '#111', textAlign: 'center',
          cursor: 'pointer', appearance: 'none' as const,
        }}
      >
        <option value="">—</option>
        {Array.from({ length: 10 }, (_, i) => (
          <option key={i + 1} value={i + 1}>{i + 1}</option>
        ))}
      </select>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: '0.5px solid #e5e7eb', padding: '6px 8px',
  fontSize: 10, fontWeight: 500, color: '#9ca3af',
  textAlign: 'center', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  border: '0.5px solid #e5e7eb', height: 44, verticalAlign: 'middle',
};

export default function GameTable() {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [players, setPlayers] = useState<Player[]>(initPlayers());
  const [days, setDays] = useState<DayData[]>(initDays());
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [winner, setWinner] = useState<Team | null>(null);
  const [bm, setBm] = useState<BestMove>({ p: null, g1: null, g2: null, g3: null });
  const now = useNow();

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };
  const dateStr = now.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

  const cycleRole = useCallback((pi: number) => {
    if (phase !== 'setup') return;
    setPlayers(prev => prev.map((p, i) => {
      if (i !== pi) return p;
      return { ...p, role: ROLES[(ROLES.indexOf(p.role) + 1) % ROLES.length] };
    }));
  }, [phase]);

  const doRandomRoles = useCallback(() => {
    if (phase !== 'setup') return;
    const roles = randomRoles();
    setPlayers(prev => prev.map((p, i) => ({ ...p, role: roles[i] })));
  }, [phase]);

  const updateName = useCallback((pi: number, name: string) => {
    setPlayers(prev => prev.map((p, i) => i === pi ? { ...p, name } : p));
  }, []);

  const addFoul = useCallback((pi: number) => {
    if (phase === 'setup') return;
    setPlayers(prev => prev.map((p, i) => {
      if (i !== pi) return p;
      const fouls = (p.fouls + 1) % 5;
      return { ...p, fouls, elim: fouls >= 4 };
    }));
  }, [phase]);

  const selectDay = useCallback((di: number) => {
    if (phase !== 'playing') return;
    setActiveDay(prev => prev === di ? null : di);
  }, [phase]);

  const togglePlayer = useCallback((seat: number) => {
    if (phase !== 'playing' || activeDay === null) return;
    setDays(prev => {
      const next = prev.map(d => ({ ...d, rounds: d.rounds.map(r => [...r]) }));
      const last = next[activeDay].rounds[next[activeDay].rounds.length - 1];
      const idx = last.findIndex(r => r.seat === seat);
      if (idx >= 0) last.splice(idx, 1);
      else last.push({ seat, votes: 0 });
      return next;
    });
  }, [phase, activeDay]);

  const setVotes = useCallback((di: number, ri: number, seat: number, val: number) => {
    setDays(prev => {
      const next = prev.map(d => ({ ...d, rounds: d.rounds.map(r => [...r]) }));
      const entry = next[di].rounds[ri].find(r => r.seat === seat);
      if (entry) entry.votes = val;
      return next;
    });
  }, []);

  const canAddVoting = useCallback((di: number) => {
    const last = days[di].rounds[days[di].rounds.length - 1];
    if (last.length < 2) return false;
    const counts: Record<number, number> = {};
    last.forEach(r => { if (r.votes > 0) counts[r.votes] = (counts[r.votes] || 0) + 1; });
    return Object.values(counts).some(c => c >= 2);
  }, [days]);

  const addVoting = useCallback((di: number) => {
    if (!canAddVoting(di)) return;
    setDays(prev => {
      const next = prev.map(d => ({ ...d, rounds: d.rounds.map(r => [...r]) }));
      const last = next[di].rounds[next[di].rounds.length - 1];
      const counts: Record<number, number> = {};
      last.forEach(r => { if (r.votes > 0) counts[r.votes] = (counts[r.votes] || 0) + 1; });
      const maxTied = Math.max(...Object.entries(counts).filter(([, c]) => c >= 2).map(([v]) => parseInt(v)));
      const tied = last.filter(r => r.votes === maxTied);
      next[di].rounds.push(tied.map(r => ({ seat: r.seat, votes: 0 })));
      return next;
    });
  }, [canAddVoting]);

  const startGame = async () => {
    setSaving(true);
    try {
      await fetch('/api/init');
      const names = players.map(p => p.name || `Гравець ${p.seat}`);
      const realNames = names.filter(n => !n.startsWith('Гравець'));
      if (realNames.length > 0) {
        await fetch('/api/players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: realNames }),
        });
      }
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: players.map((p, i) => ({ seat: p.seat, name: names[i], role: p.role })) }),
      });
      const data = await res.json();
      setGameId(data.gameId);
      setPhase('playing');
      showMsg(`Гру #${data.gameId} розпочато!`);
    } catch { showMsg('Помилка підключення до БД'); }
    setSaving(false);
  };

  const finishGame = async (winnerTeam: Team) => {
    if (!gameId) return;
    setSaving(true);
    try {
      await fetch(`/api/games/${gameId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner: winnerTeam, players, bestMove: bm }),
      });
      setWinner(winnerTeam);
      setPhase('finished');
      setShowModal(false);
      showMsg(`Перемогли ${winnerTeam === 'мирні' ? 'Мирні' : 'Мафія'}!`);
    } catch { showMsg('Помилка збереження'); }
    setSaving(false);
  };

  const resetGame = () => {
    setPhase('setup'); setPlayers(initPlayers()); setDays(initDays());
    setActiveDay(null); setGameId(null); setWinner(null); setMsg('');
    setBm({ p: null, g1: null, g2: null, g3: null });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontSize: 12, color: '#111' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '0.5px solid #e5e7eb',
        background: '#f9fafb', position: 'sticky', top: 0, zIndex: 20,
        gap: 8, flexWrap: 'wrap' as const,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎭</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Мафія</span>
          {gameId && <span style={{ color: '#9ca3af', fontSize: 11 }}>Гра #{gameId}</span>}
          <span style={{ color: '#9ca3af', fontSize: 11 }}>{dateStr} {timeStr}</span>
        </div>

        {phase === 'playing' && (
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 4,
            border: '0.5px solid #e5e7eb', borderRadius: 8,
            padding: '4px 8px', background: 'white',
          }}>
            <span style={{ fontSize: 9, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 6 }}>🏆 кращий хід</span>
            <SeatSelect value={bm.p} onChange={v => setBm(b => ({ ...b, p: v }))} label="хто" />
            <span style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>→</span>
            <SeatSelect value={bm.g1} onChange={v => setBm(b => ({ ...b, g1: v }))} label="№1" />
            <SeatSelect value={bm.g2} onChange={v => setBm(b => ({ ...b, g2: v }))} label="№2" />
            <SeatSelect value={bm.g3} onChange={v => setBm(b => ({ ...b, g3: v }))} label="№3" />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {phase === 'setup' && (
            <button onClick={startGame} disabled={saving} style={{
              padding: '5px 12px', border: '0.5px solid #d1d5db', borderRadius: 6,
              background: '#15803d', color: 'white', fontSize: 12, cursor: 'pointer',
            }}>{saving ? 'Збереження...' : '▶ Розпочати гру'}</button>
          )}
          {phase === 'playing' && (
            <button onClick={() => setShowModal(true)} style={{
              padding: '5px 12px', border: '0.5px solid #fca5a5', borderRadius: 6,
              background: '#fee2e2', color: '#dc2626', fontSize: 12, cursor: 'pointer',
            }}>🏁 Кінець гри</button>
          )}
          {phase === 'finished' && (
            <button onClick={resetGame} style={{
              padding: '5px 12px', border: '0.5px solid #bfdbfe', borderRadius: 6,
              background: '#dbeafe', color: '#1d4ed8', fontSize: 12, cursor: 'pointer',
            }}>+ Нова гра</button>
          )}
        </div>
      </div>

      {msg && <div style={{ background: '#eff6ff', color: '#1d4ed8', textAlign: 'center', padding: 6, fontSize: 12 }}>{msg}</div>}
      {winner && (
        <div style={{
          textAlign: 'center', padding: 8, fontSize: 13, fontWeight: 600,
          background: winner === 'мирні' ? '#1d4ed8' : '#991b1b', color: 'white',
        }}>
          {winner === 'мирні' ? '🏙️ Перемогли Мирні!' : '🔫 Перемогла Мафія!'}
        </div>
      )}

      {phase === 'playing' && activeDay !== null && (
        <div style={{ background: '#eff6ff', color: '#1d4ed8', textAlign: 'center', padding: 4, fontSize: 11 }}>
          Натисни гравця щоб додати до Дня {activeDay + 1}
        </div>
      )}

      <div style={{ display: 'flex' }}>
        {/* LEFT TABLE */}
        <div style={{ flexShrink: 0 }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Імʼя</th>
                <th style={thStyle}>Фоли</th>
              </tr>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle} /><th style={thStyle} /><th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {players.map((p, pi) => {
                const inDay = activeDay !== null && days[activeDay].rounds[days[activeDay].rounds.length - 1].some(r => r.seat === p.seat);
                const rowBg = pi % 2 === 0 ? '#fff' : '#f9fafb';
                return (
                  <tr key={pi} style={{ background: rowBg, opacity: p.elim ? 0.35 : 1 }}>
                    <td style={{ ...tdStyle, background: rowBg, textAlign: 'center' }}>
                      <button
                        onClick={() => phase === 'setup' ? cycleRole(pi) : togglePlayer(p.seat)}
                        style={{
                          width: 26, height: 26, borderRadius: '50%', border: '0.5px solid',
                          borderColor: inDay ? '#86efac' : activeDay !== null && phase === 'playing' ? '#93c5fd' : '#d1d5db',
                          background: inDay ? '#dcfce7' : activeDay !== null && phase === 'playing' ? '#dbeafe' : rowBg,
                          color: inDay ? '#15803d' : activeDay !== null && phase === 'playing' ? '#1d4ed8' : '#6b7280',
                          cursor: 'pointer', fontSize: 11, fontWeight: 500,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto',
                        }}
                      >{p.seat}</button>
                    </td>
                    <td style={{ ...tdStyle, background: rowBg, padding: '0 8px', whiteSpace: 'nowrap' }}>
                      {phase === 'setup' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <RoleDot role={p.role} />
                          <AutocompleteInput value={p.name} onChange={v => updateName(pi, v)} placeholder={`Гравець ${p.seat}`} />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <RoleDot role={p.role} />
                          <span style={{ fontWeight: 500 }}>{p.name || `Гравець ${p.seat}`}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, background: rowBg, padding: '3px 5px', minWidth: 70 }}>
                      <div onClick={() => addFoul(pi)} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2, height: 28, cursor: 'pointer' }}>
                        {[0, 1, 2, 3].map(fi => (
                          <div key={fi} style={{
                            borderRadius: 3, border: '0.5px solid',
                            borderColor: fi < p.fouls ? (fi >= 3 ? '#b91c1c' : fi >= 2 ? '#dc2626' : fi >= 1 ? '#ea580c' : '#d97706') : '#e5e7eb',
                            background: fi < p.fouls ? (fi >= 3 ? '#dc2626' : fi >= 2 ? '#fecaca' : fi >= 1 ? '#fed7aa' : '#fef3c7') : '#f9fafb',
                          }} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {phase === 'setup' && (
                <tr>
                  <td colSpan={3} style={{ border: '0.5px solid #e5e7eb', padding: '6px 8px', background: '#f9fafb' }}>
                    <button onClick={doRandomRoles} style={{
                      width: '100%', padding: '4px 8px', border: '0.5px solid #e5e7eb',
                      borderRadius: 6, background: '#ede9fe', color: '#4c1d95', fontSize: 11, cursor: 'pointer',
                    }}>🎲 C — випадкові ролі</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* DAYS */}
        <div style={{ display: 'flex', gap: 6, padding: 8, overflowX: 'auto', flex: 1, alignItems: 'flex-start' }}>
          {days.map((d, di) => {
            const isActive = activeDay === di && phase === 'playing';
            const hasContent = d.rounds.some(r => r.length > 0);
            const hasSecondVoting = d.rounds.length > 1;
            const canAdd = d.rounds.length < 2 && hasContent && canAddVoting(di);
            const lastRound = d.rounds[d.rounds.length - 1];

            return (
              <div key={di} style={{
                flexShrink: 0, width: 152,
                border: `0.5px solid ${isActive ? '#93c5fd' : '#e5e7eb'}`,
                borderRadius: 8, background: '#f9fafb', overflow: 'hidden',
                boxShadow: isActive ? '0 0 0 2px #dbeafe' : 'none',
              }}>
                <div onClick={() => selectDay(di)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 8px', background: '#f3f4f6',
                  borderBottom: '0.5px solid #e5e7eb', cursor: 'pointer', userSelect: 'none' as const,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? '#1d4ed8' : '#6b7280' }}>
                    День {di + 1}
                  </span>
                  {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />}
                </div>

                {d.rounds.map((round, ri) => (
                  <div key={ri}>
                    {d.rounds.length > 1 && (
                      <div style={{ padding: '3px 8px 1px', fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>
                        Голосування {ri + 1}
                      </div>
                    )}
                    {round.length === 0 ? (
                      <div style={{ padding: '5px 8px', fontSize: 10, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' }}>
                        натисни гравця
                      </div>
                    ) : (
                      <>
                        {round.map(r => {
                          const p = players.find(pl => pl.seat === r.seat);
                          return (
                            <div key={r.seat} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', minHeight: 26 }}>
                              <div onClick={() => togglePlayer(r.seat)} style={{
                                width: 20, height: 20, borderRadius: '50%',
                                background: '#dbeafe', border: '0.5px solid #93c5fd',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 500, color: '#1d4ed8', cursor: 'pointer', flexShrink: 0,
                              }}>{r.seat}</div>
                              <span style={{ fontSize: 11, color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p?.name || ''}
                              </span>
                              <select
                                value={r.votes || ''}
                                onChange={e => setVotes(di, ri, r.seat, parseInt(e.target.value) || 0)}
                                style={{ width: 36, border: '0.5px solid #e5e7eb', borderRadius: 4, padding: 1, fontSize: 10, background: 'white', color: '#111' }}
                              >
                                <option value="">—</option>
                                {Array.from({ length: 10 }, (_, n) => (
                                  <option key={n + 1} value={n + 1}>{n + 1}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                        {ri === d.rounds.length - 1 && hasSecondVoting && phase === 'playing' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', minHeight: 26, flexWrap: 'wrap' as const }}>
                            <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 500, flexShrink: 0 }}>вигнати</span>
                            <div style={{ display: 'flex', gap: 2, flex: 1, flexWrap: 'wrap' as const }}>
                              {round.map(r => (
                                <div key={r.seat} style={{
                                  width: 18, height: 18, borderRadius: '50%',
                                  background: '#fee2e2', border: '0.5px solid #fca5a5',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 9, fontWeight: 500, color: '#dc2626',
                                }}>{r.seat}</div>
                              ))}
                            </div>
                            <select
                              onChange={e => setDays(prev => prev.map((day, i) => i === di ? { ...day, kickVotes: parseInt(e.target.value) || 0 } : day))}
                              style={{ width: 36, border: '0.5px solid #fca5a5', borderRadius: 4, padding: 1, fontSize: 10, background: '#fee2e2', color: '#dc2626' }}
                            >
                              <option value="">—</option>
                              {Array.from({ length: 10 }, (_, n) => (
                                <option key={n + 1} value={n + 1}>{n + 1}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                    {ri < d.rounds.length - 1 && <div style={{ height: 0.5, background: '#e5e7eb', margin: '3px 6px' }} />}
                  </div>
                ))}

                {phase === 'playing' && d.rounds.length < 2 && (
                  <div style={{ padding: '2px 6px 4px' }}>
                    <button onClick={() => addVoting(di)} disabled={!canAdd} style={{
                      width: '100%', padding: 3, border: '0.5px solid #e5e7eb',
                      borderRadius: 4, background: '#f3f4f6',
                      color: canAdd ? '#6b7280' : '#d1d5db',
                      fontSize: 10, cursor: canAdd ? 'pointer' : 'default',
                    }}>+ голосування</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {phase === 'setup' && (
        <div style={{ display: 'flex', gap: 12, padding: '6px 12px', fontSize: 11, color: '#9ca3af', flexWrap: 'wrap' as const, borderTop: '0.5px solid #f3f4f6', alignItems: 'center' }}>
          <span>Натисни # щоб змінити роль:</span>
          {(['Мирний', 'Маф', 'Дон', 'Шериф'] as Role[]).map(r => (
            <span key={r} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: ROLE_COLOR[r], display: 'inline-block' }} />
              {r} {ROLE_ICON[r]}
            </span>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 280, border: '0.5px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>🏁 Кінець гри</h2>
            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 20 }}>Яка команда перемогла?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => finishGame('мирні')} disabled={saving} style={{ padding: 16, borderRadius: 10, background: '#1d4ed8', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🏙️<br />Мирні</button>
              <button onClick={() => finishGame('мафія')} disabled={saving} style={{ padding: 16, borderRadius: 10, background: '#991b1b', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🔫<br />Мафія</button>
            </div>
            <button onClick={() => setShowModal(false)} style={{ width: '100%', marginTop: 10, color: '#9ca3af', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>Скасувати</button>
          </div>
        </div>
      )}
    </div>
  );
}