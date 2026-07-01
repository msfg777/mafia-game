'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AutocompleteInput } from './AutocompleteInput';

type Role = 'Мирний' | 'Шериф' | 'Маф' | 'Дон';
type Team = 'мирні' | 'мафія';

interface Player { seat: number; name: string; role: Role; fouls: number; elim: boolean; }
interface VoteEntry { seat: number; votes: number; }
interface DayData { rounds: VoteEntry[][]; kickVotes: number; }
interface BestMove { p: number | null; g1: number | null; g2: number | null; g3: number | null; }

const ROLES: Role[] = ['Мирний', 'Маф', 'Дон', 'Шериф'];
const ROLE_COLOR: Record<Role, string> = { 'Мирний': '#dc2626', 'Маф': '#111827', 'Дон': '#111827', 'Шериф': '#dc2626' };
const ROLE_ICON: Record<Role, string> = { 'Мирний': '', 'Маф': '', 'Дон': '🎩', 'Шериф': '⭐' };

function initPlayers(): Player[] {
  return Array.from({ length: 10 }, (_, i) => ({ seat: i + 1, name: '', role: 'Мирний', fouls: 0, elim: false }));
}
function initDays(): DayData[] {
  return Array.from({ length: 5 }, () => ({ rounds: [[]], kickVotes: 0 }));
}
function randomRoles(): Role[] {
  const r: Role[] = ['Маф','Маф','Дон','Шериф','Мирний','Мирний','Мирний','Мирний','Мирний','Мирний'];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return now;
}

function RoleDot({ role }: { role: Role }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: 3, background: ROLE_COLOR[role], fontSize: 9, marginRight: 5, verticalAlign: 'middle', flexShrink: 0 }}>
      {ROLE_ICON[role]}
    </span>
  );
}

function SeatSelect({ value, onChange, label, main }: { value: number | null; onChange: (v: number | null) => void; label: string; main?: boolean; }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, color: '#9ca3af' }}>{label}</span>
      <select value={value ?? ''} onChange={e => onChange(e.target.value ? parseInt(e.target.value) : null)} style={{
        width: 36, border: `1px solid ${main ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 5,
        padding: '3px 2px', fontSize: 13, fontWeight: 700,
        background: main ? '#dbeafe' : 'white', color: main ? '#1d4ed8' : '#111',
        textAlign: 'center', cursor: 'pointer', appearance: 'none' as const,
      }}>
        <option value="">—</option>
        {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
      </select>
    </div>
  );
}

function Stopwatch() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const handleStartReset = () => {
    if (!running && seconds === 0) {
      setRunning(true);
    } else {
      setRunning(false);
      setSeconds(0);
    }
  };

  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  const over = seconds >= 60;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, minWidth: 58, color: over ? '#dc2626' : '#111827', letterSpacing: 1 }}>{mins}:{secs}</span>
      <button onClick={() => setRunning(false)} disabled={!running} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid #e5e7eb', background: running ? '#f3f4f6' : '#f9fafb', cursor: running ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: running ? '#374151' : '#d1d5db' }}>⏸</button>
      <button onClick={handleStartReset} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid', borderColor: running ? '#fca5a5' : seconds > 0 ? '#fca5a5' : '#86efac', background: running ? '#fee2e2' : seconds > 0 ? '#fee2e2' : '#dcfce7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: running ? '#dc2626' : seconds > 0 ? '#dc2626' : '#15803d' }}>{running || seconds > 0 ? '↺' : '▶'}</button>
    </div>
  );
}

function AudioButtons() {
  const [playing, setPlaying] = useState<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([null, null, null]);

  const toggle = (idx: number) => {
    const audio = audioRefs.current[idx];
    if (!audio) return;
    if (playing === idx) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(null);
    } else {
      if (playing !== null && audioRefs.current[playing]) {
        audioRefs.current[playing]!.pause();
        audioRefs.current[playing]!.currentTime = 0;
      }
      audio.play();
      setPlaying(idx);
    }
  };

  const colors = ['#4f46e5', '#0891b2', '#7c3aed'];
  const bgColors = ['#ede9fe', '#cffafe', '#f3e8ff'];

  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <button key={i} onClick={() => toggle(i)} style={{ width: 28, height: 28, borderRadius: '50%', border: `0.5px solid ${playing === i ? colors[i] : '#e5e7eb'}`, background: playing === i ? bgColors[i] : '#f9fafb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: playing === i ? colors[i] : '#9ca3af' }}>
          {playing === i ? '■' : '♪'}
          <audio ref={el => { audioRefs.current[i] = el; }} src={`/${i + 1}.mp3`} onEnded={() => setPlaying(null)} />
        </button>
      ))}
    </div>
  );
}

const thStyle: React.CSSProperties = { border: '0.5px solid #e5e7eb', padding: '6px 8px', fontSize: 11, fontWeight: 500, color: '#9ca3af', textAlign: 'center', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { border: '0.5px solid #e5e7eb', height: 52, verticalAlign: 'middle' };

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
    setPlayers(prev => prev.map((p, i) => i !== pi ? p : { ...p, role: ROLES[(ROLES.indexOf(p.role) + 1) % ROLES.length] }));
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
      if (idx >= 0) last.splice(idx, 1); else last.push({ seat, votes: 0 });
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
      next[di].rounds.push(last.filter(r => r.votes === maxTied).map(r => ({ seat: r.seat, votes: 0 })));
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
        await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names: realNames }) });
      }
      const res = await fetch('/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ players: players.map((p, i) => ({ seat: p.seat, name: names[i], role: p.role })) }) });
      const data = await res.json();
      setGameId(data.gameId); setPhase('playing');
      showMsg(`Гру #${data.gameId} розпочато!`);
    } catch { showMsg('Помилка підключення до БД'); }
    setSaving(false);
  };

  const finishGame = async (winnerTeam: Team) => {
    if (!gameId) return;
    setSaving(true);
    try {
      await fetch(`/api/games/${gameId}/finish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ winner: winnerTeam, players, bestMove: bm }) });
      setWinner(winnerTeam); setPhase('finished'); setShowModal(false);
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
    <div style={{ minHeight: '100vh', background: 'white', fontSize: 13, color: '#111' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '8px 12px', borderBottom: '0.5px solid #e5e7eb', background: '#f9fafb', position: 'sticky', top: 0, zIndex: 20, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎭</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Мафія</span>
          {gameId && <span style={{ color: '#9ca3af', fontSize: 12 }}>Гра #{gameId}</span>}
          <span style={{ color: '#9ca3af', fontSize: 12 }}>{dateStr} {timeStr}</span>
          <AudioButtons />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {phase === 'setup' && <button onClick={startGame} disabled={saving} style={{ padding: '7px 20px', border: '0.5px solid #d1d5db', borderRadius: 6, background: '#15803d', color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>{saving ? 'Збереження...' : '▶ Розпочати гру'}</button>}
          {phase === 'playing' && <button onClick={() => setShowModal(true)} style={{ padding: '7px 20px', border: '0.5px solid #fca5a5', borderRadius: 6, background: '#fee2e2', color: '#dc2626', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>🏁 Кінець гри</button>}
          {phase === 'finished' && <button onClick={resetGame} style={{ padding: '7px 20px', border: '0.5px solid #bfdbfe', borderRadius: 6, background: '#dbeafe', color: '#1d4ed8', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>+ Нова гра</button>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Stopwatch />
        </div>
      </div>

      {msg && <div style={{ background: '#eff6ff', color: '#1d4ed8', textAlign: 'center', padding: 6, fontSize: 12 }}>{msg}</div>}
      {winner && <div style={{ textAlign: 'center', padding: 8, fontSize: 14, fontWeight: 600, background: winner === 'мирні' ? '#dc2626' : '#111827', color: 'white' }}>{winner === 'мирні' ? '🏙️ Перемогли Мирні!' : '🔫 Перемогла Мафія!'}</div>}
      {phase === 'playing' && activeDay !== null && <div style={{ background: '#eff6ff', color: '#1d4ed8', textAlign: 'center', padding: 5, fontSize: 12 }}>Натисни гравця щоб додати до Дня {activeDay + 1}</div>}

      <div style={{ display: 'flex' }}>
        <div style={{ flexShrink: 0 }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Імʼя</th>
                <th style={thStyle}>Фоли</th>
              </tr>
              <tr style={{ background: '#f9fafb' }}><th style={thStyle} /><th style={thStyle} /><th style={thStyle} /></tr>
            </thead>
            <tbody>
              {players.map((p, pi) => {
                const inDay = activeDay !== null && days[activeDay].rounds[days[activeDay].rounds.length - 1].some(r => r.seat === p.seat);
                const rowBg = pi % 2 === 0 ? '#fff' : '#f9fafb';
                return (
                  <tr key={pi} style={{ background: rowBg, opacity: p.elim ? 0.35 : 1 }}>
                    <td style={{ ...tdStyle, background: rowBg, textAlign: 'center' }}>
                      <button onClick={() => phase === 'setup' ? cycleRole(pi) : togglePlayer(p.seat)} style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid', borderColor: inDay ? '#86efac' : activeDay !== null && phase === 'playing' ? '#93c5fd' : '#d1d5db', background: inDay ? '#dcfce7' : activeDay !== null && phase === 'playing' ? '#dbeafe' : rowBg, color: inDay ? '#15803d' : activeDay !== null && phase === 'playing' ? '#1d4ed8' : '#6b7280', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>{p.seat}</button>
                    </td>
                    <td style={{ ...tdStyle, background: rowBg, padding: '0 10px', whiteSpace: 'nowrap' }}>
                      {phase === 'setup' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <RoleDot role={p.role} />
                          <AutocompleteInput value={p.name} onChange={v => updateName(pi, v)} placeholder={`Гравець ${p.seat}`} />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <RoleDot role={p.role} />
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{p.name || `Гравець ${p.seat}`}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, background: rowBg, padding: '4px 6px', minWidth: 76 }}>
                      <div onClick={() => addFoul(pi)} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3, height: 32, cursor: 'pointer' }}>
                        {[0, 1, 2, 3].map(fi => (
                          <div key={fi} style={{ borderRadius: 3, border: '0.5px solid', borderColor: fi < p.fouls ? (fi >= 3 ? '#b91c1c' : fi >= 2 ? '#dc2626' : fi >= 1 ? '#ea580c' : '#d97706') : '#e5e7eb', background: fi < p.fouls ? (fi >= 3 ? '#dc2626' : fi >= 2 ? '#fecaca' : fi >= 1 ? '#fed7aa' : '#fef3c7') : '#f9fafb' }} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {phase === 'setup' && (
                <tr>
                  <td colSpan={3} style={{ border: '0.5px solid #e5e7eb', padding: '6px 8px', background: '#f9fafb' }}>
                    <button onClick={doRandomRoles} style={{ width: '100%', padding: '5px 8px', border: '0.5px solid #e5e7eb', borderRadius: 6, background: '#ede9fe', color: '#4c1d95', fontSize: 12, cursor: 'pointer' }}>🎲 C — випадкові ролі</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: 8, overflowX: 'auto', flex: 1, alignItems: 'flex-start' }}>
          {days.map((d, di) => {
            const isActive = activeDay === di && phase === 'playing';
            const hasContent = d.rounds.some(r => r.length > 0);
            const hasSecondVoting = d.rounds.length > 1;
            const canAdd = d.rounds.length < 2 && hasContent && canAddVoting(di);
            const isBestMoveDay = di === 1;

            return (
              <div key={di} style={{ flexShrink: 0, width: 170, border: `0.5px solid ${isActive ? '#93c5fd' : '#e5e7eb'}`, borderRadius: 10, background: '#f9fafb', overflow: 'hidden', boxShadow: isActive ? '0 0 0 3px #dbeafe' : 'none' }}>
                <div onClick={() => selectDay(di)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f3f4f6', borderBottom: '0.5px solid #e5e7eb', cursor: 'pointer', userSelect: 'none' as const }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#1d4ed8' : '#6b7280' }}>День {di + 1}</span>
                  {isActive && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />}
                </div>

                {d.rounds.map((round, ri) => (
                  <div key={ri}>
                    {d.rounds.length > 1 && <div style={{ padding: '4px 10px 2px', fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Голосування {ri + 1}</div>}
                    {round.length === 0 ? (
                      <div style={{ padding: '8px 10px', fontSize: 11, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' }}>натисни гравця</div>
                    ) : (
                      <>
                        {round.map(r => {
                          const p = players.find(pl => pl.seat === r.seat);
                          return (
                            <div key={r.seat} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', minHeight: 38 }}>
                              <div onClick={() => togglePlayer(r.seat)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#dbeafe', border: '0.5px solid #93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#1d4ed8', cursor: 'pointer', flexShrink: 0 }}>{r.seat}</div>
                              <span style={{ fontSize: 12, color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name || ''}</span>
                              <select value={r.votes || ''} onChange={e => setVotes(di, ri, r.seat, parseInt(e.target.value) || 0)} style={{ width: 46, border: '0.5px solid #e5e7eb', borderRadius: 5, padding: '3px 2px', fontSize: 13, background: 'white', color: '#111' }}>
                                <option value="">—</option>
                                {Array.from({ length: 10 }, (_, n) => <option key={n + 1} value={n + 1}>{n + 1}</option>)}
                              </select>
                            </div>
                          );
                        })}
                        {ri === d.rounds.length - 1 && hasSecondVoting && phase === 'playing' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', minHeight: 38, flexWrap: 'wrap' as const }}>
                            <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, flexShrink: 0 }}>вигнати</span>
                            <div style={{ display: 'flex', gap: 3, flex: 1, flexWrap: 'wrap' as const }}>
                              {round.map(r => <div key={r.seat} style={{ width: 22, height: 22, borderRadius: '50%', background: '#fee2e2', border: '0.5px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#dc2626' }}>{r.seat}</div>)}
                            </div>
                            <select onChange={e => setDays(prev => prev.map((day, i) => i === di ? { ...day, kickVotes: parseInt(e.target.value) || 0 } : day))} style={{ width: 46, border: '0.5px solid #fca5a5', borderRadius: 5, padding: '3px 2px', fontSize: 13, background: '#fee2e2', color: '#dc2626' }}>
                              <option value="">—</option>
                              {Array.from({ length: 10 }, (_, n) => <option key={n + 1} value={n + 1}>{n + 1}</option>)}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                    {ri < d.rounds.length - 1 && <div style={{ height: 0.5, background: '#e5e7eb', margin: '3px 8px' }} />}
                  </div>
                ))}

                {phase === 'playing' && d.rounds.length < 2 && (
                  <div style={{ padding: '3px 8px 5px' }}>
                    <button onClick={() => addVoting(di)} disabled={!canAdd} style={{ width: '100%', padding: '6px 0', border: '0.5px solid #e5e7eb', borderRadius: 5, background: canAdd ? '#f3f4f6' : '#f9fafb', color: canAdd ? '#6b7280' : '#d1d5db', fontSize: 12, cursor: canAdd ? 'pointer' : 'default' }}>+ голосування</button>
                  </div>
                )}

                {isBestMoveDay && phase === 'playing' && (
                  <div style={{ borderTop: '0.5px solid #e5e7eb', padding: '8px 10px', background: '#f3f4f6' }}>
                    <div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 6 }}>🏆 кращий хід</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                      <SeatSelect value={bm.p} onChange={v => setBm(b => ({ ...b, p: v }))} label="хто" main />
                      <span style={{ color: '#9ca3af', fontSize: 13, marginBottom: 4 }}>→</span>
                      <SeatSelect value={bm.g1} onChange={v => setBm(b => ({ ...b, g1: v }))} label="№1" />
                      <SeatSelect value={bm.g2} onChange={v => setBm(b => ({ ...b, g2: v }))} label="№2" />
                      <SeatSelect value={bm.g3} onChange={v => setBm(b => ({ ...b, g3: v }))} label="№3" />
                    </div>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 300, border: '0.5px solid #e5e7eb' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>🏁 Кінець гри</h2>
            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 20 }}>Яка команда перемогла?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => finishGame('мирні')} disabled={saving} style={{ padding: 20, borderRadius: 10, background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>🏙️<br />Мирні</button>
              <button onClick={() => finishGame('мафія')} disabled={saving} style={{ padding: 20, borderRadius: 10, background: '#111827', color: 'white', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>🔫<br />Мафія</button>
            </div>
            <button onClick={() => setShowModal(false)} style={{ width: '100%', marginTop: 12, color: '#9ca3af', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>Скасувати</button>
          </div>
        </div>
      )}
    </div>
  );
}