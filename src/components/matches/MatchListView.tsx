'use client';

import React, { useState } from 'react';
import { Match, Team, MatchType } from '@/types';
import { Plus, Calendar, ChevronRight, X, Trophy, Medal, Users2 } from 'lucide-react';
import { addMatch } from '@/lib/storage';

interface MatchListViewProps {
  team: Team;
  matches: Match[];
  onSelectMatch: (match: Match) => void;
  onRefresh: () => void;
}

export function MatchListView({
  team,
  matches,
  onSelectMatch,
  onRefresh,
}: MatchListViewProps) {
  const [filterType, setFilterType] = useState<'all' | MatchType>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Formulario nuevo partido
  const [matchType, setMatchType] = useState<MatchType>('league');
  const [tournamentName, setTournamentName] = useState('');
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
        matchType,
        tournamentName: matchType === 'tournament' ? tournamentName.trim() : undefined,
      },
      team.id
    );

    setRival('');
    setTournamentName('');
    setIsAddModalOpen(false);
    onRefresh();
  };

  // Filtrado de partidos
  const filteredMatches = matches.filter((m) => {
    if (filterType === 'all') return true;
    const currentType = m.matchType || 'league';
    return currentType === filterType;
  });

  const countLeague = matches.filter((m) => !m.matchType || m.matchType === 'league').length;
  const countTournament = matches.filter((m) => m.matchType === 'tournament').length;
  const countFriendly = matches.filter((m) => m.matchType === 'friendly').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Calendario de Partidos</h2>
          <p className="text-xs text-[var(--mute)]">
            Liga oficial, torneos y amistosos de {team.name}
          </p>
        </div>

        <button
          onClick={() => {
            setRound(matches.length + 1);
            setIsAddModalOpen(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-[var(--red)] hover:bg-[var(--red-hover)] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir partido</span>
        </button>
      </div>

      {/* Filtros por tipo de competición */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
            filterType === 'all'
              ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] font-bold'
              : 'bg-[var(--card)] text-[var(--mute)] border-[var(--line)] hover:text-[var(--ink)]'
          }`}
        >
          Todos ({matches.length})
        </button>
        <button
          onClick={() => setFilterType('league')}
          className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 ${
            filterType === 'league'
              ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] font-bold'
              : 'bg-[var(--card)] text-[var(--mute)] border-[var(--line)] hover:text-[var(--ink)]'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" /> Liga ({countLeague})
        </button>
        <button
          onClick={() => setFilterType('tournament')}
          className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 ${
            filterType === 'tournament'
              ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] font-bold'
              : 'bg-[var(--card)] text-[var(--mute)] border-[var(--line)] hover:text-[var(--ink)]'
          }`}
        >
          <Medal className="w-3.5 h-3.5 text-blue-500" /> Torneos ({countTournament})
        </button>
        <button
          onClick={() => setFilterType('friendly')}
          className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 ${
            filterType === 'friendly'
              ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] font-bold'
              : 'bg-[var(--card)] text-[var(--mute)] border-[var(--line)] hover:text-[var(--ink)]'
          }`}
        >
          <Users2 className="w-3.5 h-3.5 text-emerald-500" /> Amistosos ({countFriendly})
        </button>
      </div>

      {/* Lista de Partidos */}
      <div className="space-y-2">
        {filteredMatches.length === 0 ? (
          <div className="p-8 text-center bg-[var(--card)] rounded-2xl border border-[var(--line)]">
            <Calendar className="w-10 h-10 text-[var(--mute)] mx-auto mb-2 opacity-50" />
            <p className="font-bold text-sm">No hay partidos en esta categoría</p>
            <p className="text-xs text-[var(--mute)] mt-1">
              Añade un nuevo partido o selecciona otro filtro.
            </p>
          </div>
        ) : (
          filteredMatches.map((m) => {
            const recordsCount = Object.values(m.records || {})
              .filter((record) => record.status === 'J' && record.minutes > 0)
              .length;
            const isFinished = m.status === 'finished';
            const hasScore = isFinished && m.scoreMareo !== undefined && m.scoreRival !== undefined;
            const statusLabel = isFinished
              ? recordsCount > 0
                ? `Finalizado · ${recordsCount} con minutos`
                : hasScore
                  ? 'Finalizado'
                  : 'Finalizado · sin minutos'
              : 'Pendiente';
            const formattedDate = m.date.split('-').reverse().join('/');
            const currentType = m.matchType || 'league';

            return (
              <div
                key={m.id}
                onClick={() => onSelectMatch(m)}
                className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--line)] hover:border-[var(--red)]/50 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex flex-col items-center justify-center shrink-0">
                    {currentType === 'tournament' ? (
                      <Medal className="w-5 h-5 text-blue-600" />
                    ) : currentType === 'friendly' ? (
                      <Users2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <>
                        <span className="text-[9px] text-[var(--mute)] font-bold uppercase">Jorn.</span>
                        <span className="font-black text-xs leading-none">{m.round}</span>
                      </>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm tracking-tight truncate">
                        {m.isHome ? 'vs ' : 'en '}
                        {m.rival}
                      </span>
                      {hasScore && (
                        <span className="font-black text-xs bg-[var(--bg)] px-2 py-0.5 rounded-md border border-[var(--line)]">
                          {m.scoreMareo} – {m.scoreRival}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--mute)] mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{formattedDate}</span>
                      <span>·</span>
                      <span>{m.isHome ? 'En casa' : 'A domicilio'}</span>
                      {currentType === 'tournament' && (
                        <>
                          <span>·</span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                            <Medal className="w-3 h-3" /> {m.tournamentName || 'Torneo'}
                          </span>
                        </>
                      )}
                      {currentType === 'friendly' && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            Amistoso
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isFinished
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {statusLabel}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--mute)]" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Añadir Partido (Soporte para Torneos y Liga) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-md rounded-2xl p-5 shadow-2xl border border-[var(--line)] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Nuevo partido</h2>
                <p className="text-xs text-[var(--mute)]">Liga, Torneo o Amistoso</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--mute)] hover:bg-[var(--line)]"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-3">
              {/* Selector de Tipo de Partido */}
              <div>
                <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
                  Tipo de competición
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMatchType('league')}
                    className={`py-2 px-2 text-xs rounded-xl font-bold border flex flex-col items-center gap-1 transition-all ${
                      matchType === 'league'
                        ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                        : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)] hover:border-[var(--mute)]'
                    }`}
                  >
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Liga</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchType('tournament')}
                    className={`py-2 px-2 text-xs rounded-xl font-bold border flex flex-col items-center gap-1 transition-all ${
                      matchType === 'tournament'
                        ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                        : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)] hover:border-[var(--mute)]'
                    }`}
                  >
                    <Medal className="w-4 h-4 text-blue-500" />
                    <span>Torneo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchType('friendly')}
                    className={`py-2 px-2 text-xs rounded-xl font-bold border flex flex-col items-center gap-1 transition-all ${
                      matchType === 'friendly'
                        ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                        : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)] hover:border-[var(--mute)]'
                    }`}
                  >
                    <Users2 className="w-4 h-4 text-emerald-500" />
                    <span>Amistoso</span>
                  </button>
                </div>
              </div>

              {/* Si es torneo, pedir nombre del torneo */}
              {matchType === 'tournament' && (
                <div className="animate-in fade-in">
                  <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                    Nombre del Torneo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Torneo de Navidad Mareo / Mareo Cup"
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium focus:border-blue-500"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                    {matchType === 'league' ? 'Jornada' : 'Nº Partido'}
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
                  placeholder="Ej. C.D. Montevil / Real Oviedo"
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
