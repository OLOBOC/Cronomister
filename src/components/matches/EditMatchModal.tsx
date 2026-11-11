'use client';

import React, { useState } from 'react';
import { Match, Team, MatchType, MatchStatus } from '@/types';
import { X, Trophy, Medal, Users2, Trash2, Save, Calendar, ShieldAlert } from 'lucide-react';
import { updateMatch, deleteMatch } from '@/lib/storage';

interface EditMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  team: Team;
  onSaved: () => void;
  onDeleted?: () => void;
}

export function EditMatchModal({
  isOpen,
  onClose,
  match,
  team,
  onSaved,
  onDeleted,
}: EditMatchModalProps) {
  const [matchType, setMatchType] = useState<MatchType>(match.matchType || 'league');
  const [tournamentName, setTournamentName] = useState(match.tournamentName || '');
  const [round, setRound] = useState(match.round);
  const [date, setDate] = useState(match.date);
  const [rival, setRival] = useState(match.rival);
  const [isHome, setIsHome] = useState(match.isHome);
  const [status, setStatus] = useState<MatchStatus>(match.status || 'scheduled');
  
  const hasInitialScore = match.scoreMareo !== undefined && match.scoreRival !== undefined;
  const [hasScore, setHasScore] = useState(hasInitialScore);
  const [scoreMareo, setScoreMareo] = useState<number>(match.scoreMareo ?? 0);
  const [scoreRival, setScoreRival] = useState<number>(match.scoreRival ?? 0);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!rival.trim()) {
      setError('El nombre del rival no puede estar vacío');
      return;
    }

    try {
      updateMatch(match.id, {
        round: Number(round) || 1,
        date,
        rival: rival.trim(),
        isHome,
        matchType,
        tournamentName: matchType === 'tournament' ? tournamentName.trim() : undefined,
        status,
        scoreMareo: hasScore && status === 'finished' ? scoreMareo : null,
        scoreRival: hasScore && status === 'finished' ? scoreRival : null,
      });

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios');
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }

    try {
      deleteMatch(match.id);
      if (onDeleted) onDeleted();
      else onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el partido');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-md rounded-2xl p-5 shadow-2xl border border-[var(--line)] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Editar partido</h2>
            <p className="text-xs text-[var(--mute)]">Modifica los datos del encuentro o su estado</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:bg-[var(--line)]"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Tipo de Partido */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">
              Tipo de competición
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setMatchType('league')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  matchType === 'league'
                    ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                    : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)]'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Liga</span>
              </button>
              <button
                type="button"
                onClick={() => setMatchType('tournament')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  matchType === 'tournament'
                    ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                    : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)]'
                }`}
              >
                <Medal className="w-3.5 h-3.5 text-blue-500" />
                <span>Torneo</span>
              </button>
              <button
                type="button"
                onClick={() => setMatchType('friendly')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  matchType === 'friendly'
                    ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                    : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)]'
                }`}
              >
                <Users2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Amistoso</span>
              </button>
            </div>
          </div>

          {/* Nombre torneo si aplica */}
          {matchType === 'tournament' && (
            <div>
              <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">
                Nombre del Torneo
              </label>
              <input
                type="text"
                required
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="Ej. Torneo de Navidad Covadonga"
                className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium"
              />
            </div>
          )}

          {/* Jornada / Ronda y Fecha */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">
                {matchType === 'tournament' ? 'Partido nº' : 'Jornada'}
              </label>
              <input
                type="number"
                min={1}
                required
                value={round}
                onChange={(e) => setRound(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">
                Fecha
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium"
              />
            </div>
          </div>

          {/* Rival */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">
              Equipo rival
            </label>
            <input
              type="text"
              required
              value={rival}
              onChange={(e) => setRival(e.target.value)}
              placeholder="Ej. Real Oviedo, Astur, etc."
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-medium"
            />
          </div>

          {/* Condición de Local / Visitante */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">
              Campo
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsHome(true)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  isHome
                    ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                    : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)]'
                }`}
              >
                🏠 Mareo (En casa)
              </button>
              <button
                type="button"
                onClick={() => setIsHome(false)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  !isHome
                    ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                    : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)]'
                }`}
              >
                🚌 A domicilio
              </button>
            </div>
          </div>

          {/* Estado del partido */}
          <div className="pt-1">
            <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1">
              Estado del partido
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatus('scheduled');
                  setHasScore(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  status === 'scheduled'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                    : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)]'
                }`}
              >
                ⏳ Pendiente (por jugar)
              </button>
              <button
                type="button"
                onClick={() => setStatus('finished')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  status === 'finished'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)]'
                }`}
              >
                ✅ Finalizado (jugado)
              </button>
            </div>
          </div>

          {/* Marcador final */}
          {status === 'finished' && (
            <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasScore}
                  onChange={(e) => setHasScore(e.target.checked)}
                  className="rounded border-[var(--line)]"
                />
                <span>Registrar marcador final</span>
              </label>

              {hasScore && (
                <div className="flex items-center justify-around text-center pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mute)] uppercase mb-1">Mareo</label>
                    <input
                      type="number"
                      min={0}
                      value={scoreMareo}
                      onChange={(e) => setScoreMareo(Math.max(0, Number(e.target.value) || 0))}
                      className="w-16 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-center font-extrabold text-base"
                    />
                  </div>
                  <span className="text-xl font-black text-[var(--mute)]">–</span>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mute)] uppercase mb-1">Rival</label>
                    <input
                      type="number"
                      min={0}
                      value={scoreRival}
                      onChange={(e) => setScoreRival(Math.max(0, Number(e.target.value) || 0))}
                      className="w-16 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-center font-extrabold text-base"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                confirmDelete
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{confirmDelete ? '¿Confirmar borrado?' : 'Borrar partido'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl border border-[var(--line)] text-xs font-bold hover:bg-[var(--line)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[var(--red)] hover:bg-[var(--red-hover)] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
