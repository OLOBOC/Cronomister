'use client';

import React from 'react';
import { Team, Player, Match, AttendanceRecord, UserProfile } from '@/types';
import {
  Calendar,
  Play,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { calculatePlayerKPIs } from '@/lib/minuteEngine';
import { hasPermission } from '@/lib/permissions';

interface TeamSummaryViewProps {
  team: Team;
  players: Player[];
  matches: Match[];
  attendance: AttendanceRecord[];
  currentUser: UserProfile;
  onNavigateTab: (tab: 'resumen' | 'entreno' | 'partidos' | 'jugadores') => void;
  onSelectMatchForLive: (match: Match) => void;
  onOpenSettings: () => void;
  onSelectPlayer: (player: Player) => void;
}

export function TeamSummaryView({
  team,
  players,
  matches,
  attendance,
  currentUser,
  onNavigateTab,
  onSelectMatchForLive,
  onOpenSettings,
  onSelectPlayer,
}: TeamSummaryViewProps) {
  const isAdmin = currentUser.role === 'admin';
  const canViewStats = hasPermission(currentUser, team.id, 'view_stats');
  const totalDuration = team.settings.halfDurationMinutes * 2;

  // El siguiente partido se identifica por su estado, no por tener ya acta de minutos.
  const nextMatch = matches.find((match) => match.status === 'scheduled') || matches[0];

  // Cálculo de estadísticas de minutos de todo el equipo
  const playerStats = players.map((p) => {
    const playerAtt = attendance.filter((a) => a.playerId === p.id);
    const kpis = calculatePlayerKPIs(
      p.id,
      matches.map((m) => ({ id: m.id, date: m.date, records: m.records, isFinished: m.status === 'finished' })),
      playerAtt,
      totalDuration
    );
    return {
      player: p,
      kpis,
    };
  });

  const playersWhoPlayed = playerStats.filter((ps) => ps.kpis.matchesAttended > 0);
  const teamAverageMinutes =
    playersWhoPlayed.length > 0
      ? playersWhoPlayed.reduce((sum, ps) => sum + ps.kpis.totalMinutes, 0) / playersWhoPlayed.length
      : 0;

  const maxPlayerMinutes = Math.max(1, ...playerStats.map((ps) => ps.kpis.totalMinutes));

  return (
    <div className="space-y-4">
      {/* Aviso de configuración pendiente si es Debutantes sin ajustar */}
      {!team.settings.isConfigured && (
        <div className="p-4 rounded-2xl bg-[var(--warnbg)] border-2 border-[var(--gold)] flex items-start justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-start gap-2.5 text-[var(--warn)]">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[var(--gold)]" />
            <div>
              <p className="font-extrabold text-sm">Equipo con valores provisionales</p>
              <p className="mt-0.5 opacity-90">
                {team.name} tiene asignados los valores por defecto (5 en pista, 25 min/parte).
                Confírmalos o ajústalos según la competición de Mareo.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 bg-[var(--ink)] text-[var(--bg)] font-bold rounded-xl shrink-0 text-xs hover:opacity-90 transition-opacity"
            >
              Configurar
            </button>
          )}
        </div>
      )}

      {/* Tarjeta de Próximo Partido */}
      <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--line)] shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs text-[var(--mute)]">
          <span className="font-extrabold uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[var(--red)]" />
            <span>Próximo partido</span>
          </span>
          {nextMatch && (
            <span className="font-bold">
              {nextMatch.matchType === 'tournament'
                ? nextMatch.tournamentName || 'Torneo'
                : nextMatch.matchType === 'friendly'
                ? 'Amistoso'
                : `Jornada ${nextMatch.round}`}
            </span>
          )}
        </div>

        {nextMatch ? (
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  {nextMatch.isHome ? 'Mareo vs ' : ''}
                  {nextMatch.rival}
                  {!nextMatch.isHome ? ' vs Mareo' : ''}
                </h3>
                <p className="text-xs text-[var(--mute)] mt-0.5">
                  {nextMatch.date.split('-').reverse().join('/')} ·{' '}
                  {nextMatch.isHome ? 'En casa (Mareo)' : 'A domicilio'}
                </p>
              </div>

              <button
                onClick={() => onSelectMatchForLive(nextMatch)}
                className="px-4 py-3 bg-[var(--red)] hover:bg-[var(--red-hover)] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Jugar con cronómetro</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--mute)]">No hay partidos pendientes en el calendario.</p>
        )}
      </div>

      {/* Botón rápido Pasar Lista */}
      <button
        onClick={() => onNavigateTab('entreno')}
        className="w-full p-4 rounded-2xl bg-[var(--ink)] text-[var(--bg)] font-bold text-sm flex items-center justify-between shadow-xs hover:opacity-95 transition-opacity"
      >
        <div className="flex items-center gap-2.5">
          <ClipboardCheck className="w-5 h-5 text-[var(--gold)]" />
          <span>Pasar lista del entrenamiento de hoy</span>
        </div>
        <ChevronRight className="w-4 h-4 opacity-75" />
      </button>

      {/* Gráficas de Rendimiento (controladas por permiso de visualización de estadísticas) */}
      {canViewStats ? (
        <>
          {/* Gráfica de Minutos por Jugador y Media del Equipo */}
          <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--line)] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[var(--red)]" />
                <span>Minutos disputados (Total plantilla)</span>
              </h3>
              <span className="text-xs font-bold text-[var(--mute)]">
                Media equipo: {teamAverageMinutes.toFixed(0)} min
              </span>
            </div>

            {playerStats.length === 0 ? (
              <p className="text-xs text-[var(--mute)] text-center py-4">No hay jugadores registrados en el equipo.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {playerStats
                  .sort((a, b) => b.kpis.totalMinutes - a.kpis.totalMinutes)
                  .map(({ player, kpis }) => {
                    const percent = (kpis.totalMinutes / maxPlayerMinutes) * 100;

                    return (
                      <div
                        key={player.id}
                        onClick={() => onSelectPlayer(player)}
                        className="p-1 rounded-lg hover:bg-[var(--bg)] cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 font-bold text-[var(--mute)] text-[11px] text-right">
                              {player.dorsal ?? '—'}
                            </span>
                            <span className="font-semibold text-[var(--ink)] truncate max-w-[150px]">
                              {player.fullName}
                            </span>
                          </div>
                          <span className="font-bold tabular-clock text-[var(--ink)]">
                            {kpis.totalMinutes} min
                          </span>
                        </div>

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

          {/* Gráfica de Asistencia por Jugador */}
          <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--line)] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Asistencia por jugador a entrenos</span>
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="text-emerald-700 dark:text-emerald-300">■ Asistió</span>
                <span className="text-amber-700 dark:text-amber-300">■ Falta avisada</span>
                <span className="text-rose-700 dark:text-rose-300">■ Falta sin avisar</span>
              </div>
            </div>

            {playerStats.length === 0 ? (
              <p className="text-xs text-[var(--mute)] text-center py-4">Sin datos de asistencia.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {playerStats
                  .sort((a, b) => b.kpis.attendancePercent - a.kpis.attendancePercent)
                  .map(({ player, kpis }) => {
                    const total = kpis.attendanceCount.totalSessions;
                    const attendedPct = total > 0 ? (kpis.attendanceCount.attended / total) * 100 : 0;
                    const excusedPct = total > 0 ? (kpis.attendanceCount.excused / total) * 100 : 0;
                    const unexcusedPct = total > 0 ? (kpis.attendanceCount.unexcused / total) * 100 : 0;

                    return (
                      <div
                        key={player.id}
                        onClick={() => onSelectPlayer(player)}
                        className="p-1 rounded-lg hover:bg-[var(--bg)] cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--ink)] truncate max-w-[160px]">
                            {player.fullName}
                          </span>
                          <span className="font-bold text-[var(--ink)]">
                            {total > 0 ? `${Math.round(kpis.attendancePercent * 100)}%` : '—'}
                          </span>
                        </div>

                        <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden flex">
                          <div className="bg-emerald-500 h-full" style={{ width: `${attendedPct}%` }} />
                          <div className="bg-amber-400 h-full" style={{ width: `${excusedPct}%` }} />
                          <div className="bg-rose-500 h-full" style={{ width: `${unexcusedPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] text-center text-xs space-y-1 shadow-xs">
          <p className="font-bold text-[var(--ink)]">Estadísticas comparativas de equipo reservadas</p>
          <p className="text-[var(--mute)]">
            El acceso a las gráficas acumuladas de minutos y asistencia requiere permiso concedido por el Entrenador Principal.
          </p>
        </div>
      )}
    </div>
  );
}
