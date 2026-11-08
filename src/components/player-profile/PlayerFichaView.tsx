'use client';

import React, { useState } from 'react';
import { Player, Team, Match, TrainingSession, AttendanceRecord, AppNote, UserProfile } from '@/types';
import {
  ChevronLeft,
  Download,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { calculatePlayerKPIs } from '@/lib/minuteEngine';
import { generatePlayerPdf } from '@/lib/pdfGenerator';
import { deletePlayerData } from '@/lib/storage';

interface PlayerFichaViewProps {
  player: Player;
  team: Team;
  matches: Match[];
  sessions: TrainingSession[];
  attendance: AttendanceRecord[];
  notes: AppNote[];
  currentUser: UserProfile;
  onBack: () => void;
  onRefresh: () => void;
}

export function PlayerFichaView({
  player,
  team,
  matches,
  sessions,
  attendance,
  notes,
  currentUser,
  onBack,
  onRefresh,
}: PlayerFichaViewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const totalMatchDuration = team.settings.halfDurationMinutes * 2;

  const playerAttendance = attendance.filter((a) => a.playerId === player.id);
  const kpis = calculatePlayerKPIs(
    player.id,
    matches.map((m) => ({ records: m.records, isFinished: m.status === 'finished' })),
    playerAttendance,
    totalMatchDuration
  );

  const handleDownloadPdf = () => {
    setIsDownloading(true);
    try {
      const doc = generatePlayerPdf({
        player,
        team,
        matches,
        sessions,
        attendance,
        notes,
      });

      const cleanFileName = `Informe_${player.fullName.replace(/\s+/g, '_')}_Mareo.pdf`;
      doc.save(cleanFileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Hubo un problema al generar el archivo PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeletePlayer = () => {
    if (!isAdmin) return;
    if (deleteConfirm) {
      deletePlayerData(player.id);
      onRefresh();
      onBack();
    } else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3500);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-8">
      <button
        onClick={onBack}
        className="text-xs font-bold text-[var(--red)] flex items-center gap-1 hover:underline"
      >
        <ChevronLeft className="w-4 h-4" /> Volver a Plantilla
      </button>

      {/* Cabecera del Jugador */}
      <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--line)] shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--red)] text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
              {player.dorsal !== null ? player.dorsal : '—'}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{player.fullName}</h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--mute)]">
                {team.settings.showPositions && player.position && (
                  <span className="font-bold text-[var(--ink)] bg-[var(--bg)] px-2 py-0.5 rounded-full border border-[var(--line)]">
                    {player.position}
                  </span>
                )}
                <span>Categoría {team.name}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="px-3.5 py-2.5 bg-[var(--red)] hover:bg-[var(--red-hover)] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Descargar</span> PDF
          </button>
        </div>
      </div>

      {/* 4 KPIs Clave */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
          <span className="text-[11px] font-bold text-[var(--mute)] uppercase block">Minutos totales</span>
          <div className="text-2xl font-black text-[var(--ink)] mt-0.5">{kpis.totalMinutes} min</div>
          <span className="text-[11px] text-[var(--mute)]">En {kpis.matchesAttended} partidos</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
          <span className="text-[11px] font-bold text-[var(--mute)] uppercase block">Media por partido</span>
          <div className="text-2xl font-black text-[var(--ink)] mt-0.5">
            {kpis.averageMinutesPerMatch.toFixed(1)} <span className="text-sm font-semibold text-[var(--mute)]">min</span>
          </div>
          <span className="text-[11px] text-[var(--mute)]">{kpis.matchesAsStarter} como titular</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
          <span className="text-[11px] font-bold text-[var(--mute)] uppercase block">% Tiempo disputado</span>
          <div className="text-2xl font-black text-[var(--ink)] mt-0.5">
            {(kpis.percentMatchTime * 100).toFixed(1)}%
          </div>
          <span className="text-[11px] text-[var(--mute)]">De partidos que jugó</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
          <span className="text-[11px] font-bold text-[var(--mute)] uppercase block">% Asistencia entrenos</span>
          <div className="text-2xl font-black text-emerald-600 mt-0.5">
            {kpis.attendanceCount.totalSessions > 0
              ? `${Math.round(kpis.attendancePercent * 100)}%`
              : '—'}
          </div>
          <span className="text-[11px] text-[var(--mute)]">
            {kpis.attendanceCount.attended} de {kpis.attendanceCount.totalSessions} sesiones
          </span>
        </div>
      </div>

      {/* Gráfica de Minutos por Partido (SVG accesible) */}
      <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--line)] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[var(--red)]" />
            <span>Minutos por jornada</span>
          </h3>
          <span className="text-xs text-[var(--mute)]">Duración: {totalMatchDuration} min</span>
        </div>

        <div className="overflow-x-auto pt-2 pb-1">
          <div className="min-w-[280px] h-32 flex items-end justify-around gap-2 px-2 border-b border-[var(--line)]">
            {matches.map((m) => {
              const rec = m.records[player.id];
              const isPlayed = rec && rec.status === 'J';
              const mins = isPlayed ? rec.minutes : 0;
              const heightPercent = totalMatchDuration > 0 ? Math.min(100, (mins / totalMatchDuration) * 100) : 0;

              return (
                <div key={m.id} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] font-black text-[var(--ink)] opacity-90 mb-1">
                    {isPlayed ? mins : rec ? '0' : '—'}
                  </span>
                  <div className="w-full max-w-[32px] bg-[var(--line)] rounded-t-md overflow-hidden h-24 flex items-end">
                    <div
                      className="w-full bg-[var(--red)] rounded-t-md transition-all duration-300"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--mute)] font-bold mt-1">
                    J{m.round}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Asistencia a Entrenamientos (Barra apilada) */}
      <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--line)] shadow-xs space-y-3">
        <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Distribución de asistencia a entrenos</span>
        </h3>

        {kpis.attendanceCount.totalSessions > 0 ? (
          <div>
            <div className="h-4 rounded-full bg-[var(--line)] overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{
                  width: `${(kpis.attendanceCount.attended / kpis.attendanceCount.totalSessions) * 100}%`,
                }}
                title={`Vino: ${kpis.attendanceCount.attended}`}
              />
              <div
                className="bg-amber-400 h-full transition-all"
                style={{
                  width: `${(kpis.attendanceCount.excused / kpis.attendanceCount.totalSessions) * 100}%`,
                }}
                title={`Avisó: ${kpis.attendanceCount.excused}`}
              />
              <div
                className="bg-rose-500 h-full transition-all"
                style={{
                  width: `${(kpis.attendanceCount.unexcused / kpis.attendanceCount.totalSessions) * 100}%`,
                }}
                title={`Sin avisar: ${kpis.attendanceCount.unexcused}`}
              />
            </div>

            <div className="flex items-center justify-around gap-2 text-xs pt-3 font-semibold">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                <CheckCircle className="w-3.5 h-3.5" /> Vino {kpis.attendanceCount.attended}
              </span>
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-3.5 h-3.5" /> Avisó {kpis.attendanceCount.excused}
              </span>
              <span className="flex items-center gap-1 text-rose-700 dark:text-rose-300">
                <XCircle className="w-3.5 h-3.5" /> Sin avisar {kpis.attendanceCount.unexcused}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--mute)]">Aún no hay entrenamientos registrados para este jugador.</p>
        )}
      </div>

      {/* RGPD: Eliminar jugador */}
      {isAdmin && (
        <div className="pt-2 text-center">
          <button
            onClick={handleDeletePlayer}
            className={`text-xs font-bold transition-all px-4 py-2 rounded-xl ${
              deleteConfirm
                ? 'bg-rose-600 text-white animate-pulse'
                : 'text-[var(--mute)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
            }`}
          >
            {deleteConfirm
              ? 'Toca de nuevo para confirmar eliminación definitiva (RGPD)'
              : 'Eliminar jugador y datos personales (Derecho de supresión)'}
          </button>
        </div>
      )}
    </div>
  );
}
