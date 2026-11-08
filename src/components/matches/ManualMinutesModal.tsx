'use client';

import React, { useState } from 'react';
import { Match, Player, Team } from '@/types';
import { X, Check, Clock } from 'lucide-react';
import { updateMatchRosterManual, updateMatch } from '@/lib/storage';

interface ManualMinutesModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  team: Team;
  players: Player[];
  onSaved?: () => void;
}

export function ManualMinutesModal({
  isOpen,
  onClose,
  match,
  team,
  players,
  onSaved,
}: ManualMinutesModalProps) {
  const totalDuration = team.settings.halfDurationMinutes * 2;

  const [records, setRecords] = useState<Record<string, { status: 'J' | 'X'; isStarter: boolean; minutes: number }>>(() => {
    const initial: Record<string, { status: 'J' | 'X'; isStarter: boolean; minutes: number }> = {};
    players.forEach((p) => {
      const existing = match.records[p.id];
      initial[p.id] = {
        status: existing?.status || 'J',
        isStarter: existing?.isStarter || false,
        minutes: existing?.minutes || 0,
      };
    });
    return initial;
  });

  const [scoreMareo, setScoreMareo] = useState(match.scoreMareo ?? 0);
  const [scoreRival, setScoreRival] = useState(match.scoreRival ?? 0);

  if (!isOpen) return null;

  const handleFieldChange = (
    playerId: string,
    field: 'status' | 'isStarter' | 'minutes',
    value: string | number | boolean
  ) => {
    setRecords((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: field === 'minutes' ? Math.max(0, Math.min(totalDuration, Number(value) || 0)) : value,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Guardar marcador y estado
    updateMatch(match.id, {
      scoreMareo,
      scoreRival,
      status: 'finished',
    });

    // Guardar minutos de cada jugador con origen 'manual'
    Object.entries(records).forEach(([playerId, rec]) => {
      updateMatchRosterManual(match.id, playerId, {
        status: rec.status,
        isStarter: rec.isStarter,
        minutes: rec.status === 'J' ? rec.minutes : 0,
        source: 'manual', // Auditoría obligatoria
      });
    });

    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-[var(--line)] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Editar acta y minutos manuales</h2>
            <p className="text-xs text-[var(--mute)]">
              J{match.round} · {match.isHome ? 'Mareo vs' : ''} {match.rival}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:bg-[var(--line)]"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Marcador final */}
          <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-around text-center">
            <div>
              <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">Mareo</label>
              <input
                type="number"
                min={0}
                value={scoreMareo}
                onChange={(e) => setScoreMareo(Math.max(0, Number(e.target.value) || 0))}
                className="w-16 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-center font-extrabold text-lg"
              />
            </div>
            <span className="text-2xl font-black text-[var(--mute)]">–</span>
            <div>
              <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">Rival</label>
              <input
                type="number"
                min={0}
                value={scoreRival}
                onChange={(e) => setScoreRival(Math.max(0, Number(e.target.value) || 0))}
                className="w-16 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-center font-extrabold text-lg"
              />
            </div>
          </div>

          <div className="text-xs text-[var(--mute)] font-medium flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Los minutos introducidos aquí se registrarán con origen <b>manual</b>.</span>
          </div>

          {/* Lista de jugadores */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {players.map((p) => {
              const rec = records[p.id];
              const isPlayed = rec?.status === 'J';

              return (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-[var(--bg)] text-xs font-bold flex items-center justify-center shrink-0">
                      {p.dorsal ?? '—'}
                    </span>
                    <span className="font-semibold text-xs truncate">{p.fullName}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={rec?.status || 'J'}
                      onChange={(e) => handleFieldChange(p.id, 'status', e.target.value)}
                      className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-xs font-semibold"
                    >
                      <option value="J">Jugó</option>
                      <option value="X">No vino</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={totalDuration}
                        disabled={!isPlayed}
                        value={isPlayed ? rec?.minutes : 0}
                        onChange={(e) => handleFieldChange(p.id, 'minutes', e.target.value)}
                        className="w-14 px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-center disabled:opacity-30"
                      />
                      <span className="text-[11px] text-[var(--mute)]">min</span>
                    </div>

                    <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        disabled={!isPlayed}
                        checked={rec?.isStarter || false}
                        onChange={(e) => handleFieldChange(p.id, 'isStarter', e.target.checked)}
                        className="rounded accent-[var(--red)] disabled:opacity-30"
                      />
                      <span className="text-[11px] text-[var(--mute)]">Titular</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[var(--red)] hover:bg-[var(--red-hover)] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-xs"
          >
            <Check className="w-4 h-4" /> Guardar acta y minutos
          </button>
        </form>
      </div>
    </div>
  );
}
