'use client';

import React, { useState } from 'react';
import { Match, Team, Player, UserProfile } from '@/types';
import {
  ChevronLeft,
  Play,
  Edit3,
  Calendar,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { ManualMinutesModal } from './ManualMinutesModal';
import { updateMatch } from '@/lib/storage';

interface MatchDetailViewProps {
  match: Match;
  team: Team;
  players: Player[];
  currentUser: UserProfile;
  onBack: () => void;
  onPlayLive: () => void;
  onRefresh: () => void;
}

export function MatchDetailView({
  match,
  team,
  players,
  onBack,
  onPlayLive,
  onRefresh,
}: Omit<MatchDetailViewProps, 'currentUser'>) {
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [generalNote, setGeneralNote] = useState(match.generalNote || '');

  const totalDuration = team.settings.halfDurationMinutes * 2;
  const recordsList = Object.values(match.records || {});
  const playedRecords = recordsList.filter((r) => r.status === 'J');

  const maxMinutes = Math.max(1, ...playedRecords.map((r) => r.minutes));

  const handleNoteBlur = () => {
    updateMatch(match.id, { generalNote });
    onRefresh();
  };

  const formattedDate = match.date.split('-').reverse().join('/');

  return (
    <div className="space-y-4 animate-in fade-in">
      <button
        onClick={onBack}
        className="text-xs font-bold text-[var(--red)] flex items-center gap-1 hover:underline"
      >
        <ChevronLeft className="w-4 h-4" /> Volver a Partidos
      </button>

      {/* Tarjeta de Cabecera del Partido */}
      <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--line)] shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xl tracking-tight">
                {match.matchType === 'tournament'
                  ? match.tournamentName || 'Torneo'
                  : match.matchType === 'friendly'
                  ? 'Partido Amistoso'
                  : `Jornada ${match.round}`}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  match.status === 'finished'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {match.status === 'finished' ? 'Finalizado' : 'Pendiente'}
              </span>
              {match.matchType === 'tournament' && (
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  Torneo · Partido {match.round}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--mute)] mt-0.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {formattedDate} ·{' '}
              {match.isHome ? 'Mareo vs ' : ''}
              {match.rival}
              {!match.isHome ? ' vs Mareo' : ''}
            </p>
          </div>

          {match.scoreMareo !== undefined && match.scoreRival !== undefined && (
            <div className="text-right">
              <span className="text-2xl font-black text-[var(--ink)]">
                {match.scoreMareo} – {match.scoreRival}
              </span>
              <span className="block text-[10px] text-[var(--mute)] uppercase font-bold">Resultado</span>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            onClick={onPlayLive}
            className="py-3 px-4 bg-[var(--red)] hover:bg-[var(--red-hover)] text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{match.status === 'finished' ? 'Reanudar con cronómetro' : 'Jugar con cronómetro'}</span>
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="py-3 px-4 bg-[var(--card)] border border-[var(--line)] hover:border-[var(--mute)] text-[var(--ink)] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Edit3 className="w-4 h-4 text-amber-600" />
            <span>Editar acta y minutos a mano</span>
          </button>
        </div>

        {/* Anotación del partido */}
        <div className="pt-1">
          <label className="block text-[11px] font-bold text-[var(--mute)] uppercase mb-1 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Anotación técnica del partido
          </label>
          <textarea
            rows={2}
            value={generalNote}
            onChange={(e) => setGeneralNote(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder="Observaciones tácticas, incidencias, arbitraje..."
            className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
          />
        </div>
      </div>

      {/* Minutos por jugador en este partido */}
      <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--line)] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[var(--red)]" />
            <span>Minutos disputados ({playedRecords.length} jugadores)</span>
          </h3>
          <span className="text-xs text-[var(--mute)]">Máx. {totalDuration} min</span>
        </div>

        {playedRecords.length === 0 ? (
          <p className="text-xs text-[var(--mute)] py-4 text-center">
            Aún no hay minutos registrados para este partido. Juega con el cronómetro o introdúcelos a mano.
          </p>
        ) : (
          <div className="space-y-2">
            {playedRecords
              .sort((a, b) => b.minutes - a.minutes)
              .map((rec) => {
                const player = players.find((p) => p.id === rec.playerId);
                if (!player) return null;

                const percent = Math.min(100, (rec.minutes / maxMinutes) * 100);

                return (
                  <div key={rec.playerId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-semibold">
                        <span>{player.fullName}</span>
                        {rec.isStarter && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                            Titular
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            rec.source === 'direct'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {rec.source}
                        </span>
                      </div>
                      <span className="font-black tabular-clock text-[var(--ink)]">
                        {rec.minutes} min
                      </span>
                    </div>

                    {/* Barra visual */}
                    <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--red)] rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Modal de edición manual */}
      <ManualMinutesModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        match={match}
        team={team}
        players={players}
        onSaved={onRefresh}
      />
    </div>
  );
}
