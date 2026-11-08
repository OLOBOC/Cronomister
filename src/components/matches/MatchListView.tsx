'use client';

import React, { useState } from 'react';
import { Match, Team, Player, UserProfile } from '@/types';
import { Plus, Calendar, ChevronRight, X } from 'lucide-react';
import { addMatch } from '@/lib/storage';

interface MatchListViewProps {
  team: Team;
  matches: Match[];
  players: Player[];
  currentUser: UserProfile;
  onSelectMatch: (match: Match) => void;
  onRefresh: () => void;
}

export function MatchListView({
  team,
  matches,
  onSelectMatch,
  onRefresh,
}: Omit<MatchListViewProps, 'players' | 'currentUser'>) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [round, setRound] = useState(matches.length + 1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rival, setRival] = useState('');
  const [isHome, setIsHome] = useState(true);

  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rival.trim()) return;

    addMatch(
      {
        round: Number(round) || matches.length + 1,
        date,
        rival: rival.trim(),
        isHome,
      },
      team.id
    );

    setRival('');
    setIsAddModalOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Calendario de Partidos</h2>
          <p className="text-xs text-[var(--mute)]">
            Gestiona convocatorias, cronómetro en vivo y minutos
          </p>
        </div>

        <button
          onClick={() => {
            setRound(matches.length + 1);
            setIsAddModalOpen(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-[var(--red)] hover:bg-[var(--red-hover)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir partido</span>
        </button>
      </div>

      {/* Lista de Partidos */}
      <div className="space-y-2">
        {matches.length === 0 ? (
          <div className="p-8 text-center bg-[var(--card)] rounded-2xl border border-[var(--line)]">
            <Calendar className="w-10 h-10 text-[var(--mute)] mx-auto mb-2 opacity-50" />
            <p className="font-bold text-sm">No hay partidos registrados</p>
            <p className="text-xs text-[var(--mute)] mt-1">
              Añade el primer partido de la temporada para comenzar.
            </p>
          </div>
        ) : (
          matches.map((m) => {
            const recordsCount = Object.keys(m.records || {}).length;
            const hasData = recordsCount > 0;
            const formattedDate = m.date.split('-').reverse().join('/');

            return (
              <div
                key={m.id}
                onClick={() => onSelectMatch(m)}
                className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--line)] hover:border-[var(--red)]/50 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] text-[var(--mute)] font-bold uppercase">Jorn.</span>
                    <span className="font-black text-xs leading-none">{m.round}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm tracking-tight truncate">
                        {m.isHome ? 'vs ' : 'en '}
                        {m.rival}
                      </span>
                      {m.scoreMareo !== undefined && m.scoreRival !== undefined && (
                        <span className="font-black text-xs bg-[var(--bg)] px-2 py-0.5 rounded-md border border-[var(--line)]">
                          {m.scoreMareo} – {m.scoreRival}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--mute)] mt-0.5 flex items-center gap-2">
                      <span>{formattedDate}</span>
                      <span>·</span>
                      <span>{m.isHome ? 'En casa' : 'A domicilio'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      hasData
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {hasData ? `${recordsCount} con minutos` : 'Pendiente'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--mute)]" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Añadir Partido */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-md rounded-2xl p-5 shadow-2xl border border-[var(--line)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight">Nuevo partido</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--mute)] hover:bg-[var(--line)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                    Jornada
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={round}
                    onChange={(e) => setRound(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm font-bold text-center"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                    Fecha del partido
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                  Rival
                </label>
                <input
                  type="text"
                  placeholder="Ej. C.D. Montevil"
                  value={rival}
                  onChange={(e) => setRival(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm font-medium"
                  required
                />
              </div>

              <div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)]/50">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-semibold text-xs block">Partido en casa</span>
                    <span className="text-[11px] text-[var(--mute)]">
                      {isHome ? 'Jugamos en Mareo' : 'Jugamos como visitantes'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isHome}
                    onChange={(e) => setIsHome(e.target.checked)}
                    className="w-5 h-5 accent-[var(--red)] rounded cursor-pointer"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-[var(--red)] hover:bg-[var(--red-hover)] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm text-xs"
              >
                <Plus className="w-4 h-4" /> Crear partido en calendario
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
