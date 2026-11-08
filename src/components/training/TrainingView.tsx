'use client';

import React, { useState, useEffect } from 'react';
import { Team, Player, TrainingSession, AttendanceRecord } from '@/types';
import {
  Calendar,
  Plus,
  Check,
  X,
  AlertCircle,
  MessageSquare,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  getSessions,
  getOrCreateSession,
  updateSessionNote,
  getAttendance,
  setAttendanceRecord,
} from '@/lib/storage';

interface TrainingViewProps {
  team: Team;
  players: Player[];
}

export function TrainingView({ team, players }: TrainingViewProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayDayIndex = new Date().getDay();
  const isTrainingDayToday = team.settings.trainingDays.includes(todayDayIndex);

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [generalNote, setGeneralNote] = useState('');
  const [isNewDateModalOpen, setIsNewDateModalOpen] = useState(false);
  const [newDateInput, setNewDateInput] = useState(todayStr);
  const [openPlayerNoteId, setOpenPlayerNoteId] = useState<string | null>(null);

  // Carga inicial y reactiva
  const reloadData = () => {
    const sess = getSessions(team.id);
    setSessions(sess);

    // Si no hay fecha seleccionada o la actual no está, seleccionar la más cercana a hoy
    const current = sess.find((s) => s.date === selectedDate);
    if (!current) {
      if (sess.length > 0) {
        // Encontrar la más cercana a hoy
        const nextOrLast = sess.find((s) => s.date >= todayStr) || sess[sess.length - 1];
        setSelectedDate(nextOrLast.date);
        setGeneralNote(nextOrLast.generalNote || '');
      } else {
        // Crear sesión de hoy
        const initialSess = getOrCreateSession(todayStr, team.id);
        setSessions([initialSess]);
        setSelectedDate(todayStr);
        setGeneralNote(initialSess.generalNote || '');
      }
    } else {
      setGeneralNote(current.generalNote || '');
    }

    setAttendanceList(getAttendance(team.id));
  };

  useEffect(() => {
    reloadData();
  }, [team.id, selectedDate]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    const s = sessions.find((item) => item.date === date);
    setGeneralNote(s?.generalNote || '');
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDateInput) return;

    // Regla de negocio estricta: No registrar sesiones en el futuro
    if (newDateInput > todayStr) {
      alert('Por directriz técnica y RGPD, no está permitido registrar asistencias para sesiones futuras.');
      return;
    }

    getOrCreateSession(newDateInput, team.id);
    setSelectedDate(newDateInput);
    setIsNewDateModalOpen(false);
    reloadData();
  };

  const handleGeneralNoteChange = (text: string) => {
    setGeneralNote(text);
    updateSessionNote(selectedDate, text, team.id);
  };

  // Asistencia en 2 toques:
  // Si pulsa Vino -> estado 'S'
  // Si pulsa No vino -> si no estaba 'A' o 'N', pone 'N' (Sin avisar por defecto)
  // Sub-opciones cuando no viene: 'A' (Avisó) o 'N' (Sin avisar)
  const handleSetAttendance = (playerId: string, status: 'S' | 'A' | 'N') => {
    // Si la fecha es futura, bloquear
    if (selectedDate > todayStr) {
      alert('No se pueden registrar asistencias futuras.');
      return;
    }

    setAttendanceRecord(selectedDate, playerId, status);
    setAttendanceList(getAttendance(team.id));
  };

  const handleSetPlayerNote = (playerId: string, noteText: string) => {
    const existing = attendanceList.find(
      (a) => a.sessionId === selectedDate && a.playerId === playerId
    );
    const currentStatus = existing?.status || 'S';
    setAttendanceRecord(selectedDate, playerId, currentStatus, noteText);
    setAttendanceList(getAttendance(team.id));
  };

  // Contadores de la sesión activa
  const sessionAttendance = attendanceList.filter((a) => a.sessionId === selectedDate);
  const countAttended = sessionAttendance.filter((a) => a.status === 'S').length;
  const countExcused = sessionAttendance.filter((a) => a.status === 'A').length;
  const countUnexcused = sessionAttendance.filter((a) => a.status === 'N').length;

  return (
    <div className="space-y-4">
      {/* Sugerencia inteligente de hoy */}
      {isTrainingDayToday && selectedDate !== todayStr && (
        <div className="p-3.5 rounded-2xl bg-[var(--warnbg)] border border-[var(--gold)]/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--warn)] font-semibold">
            <Sparkles className="w-4 h-4 text-[var(--gold)] shrink-0" />
            <span>
              Hoy es {daysOfWeek[todayDayIndex].toLowerCase()} (día de entreno de {team.name}).
            </span>
          </div>
          <button
            onClick={() => handleSelectDate(todayStr)}
            className="px-3 py-1.5 bg-[var(--ink)] text-[var(--bg)] font-bold rounded-xl shrink-0 text-xs hover:opacity-90 transition-opacity"
          >
            Ir a sesión de hoy
          </button>
        </div>
      )}

      {/* Selector de sesión y fecha */}
      <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--line)] shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--red)]" />
            <span className="font-extrabold text-sm tracking-tight">Sesión de entrenamiento</span>
          </div>
          <button
            onClick={() => setIsNewDateModalOpen(true)}
            className="text-xs font-bold text-[var(--red)] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Otra fecha
          </button>
        </div>

        {/* Selector desplegable de sesiones */}
        <div className="relative">
          <select
            value={selectedDate}
            onChange={(e) => handleSelectDate(e.target.value)}
            className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] font-bold text-sm text-[var(--ink)] pr-9 focus:border-[var(--red)] cursor-pointer"
          >
            {sessions.map((s) => {
              const d = new Date(`${s.date}T12:00:00`);
              const dName = daysOfWeek[d.getDay()];
              const isToday = s.date === todayStr;
              const formatted = s.date.split('-').reverse().join('/');
              return (
                <option key={s.id} value={s.date}>
                  {dName} {formatted} {isToday ? '· (Hoy)' : ''}
                </option>
              );
            })}
          </select>
          <ChevronDown className="w-4 h-4 text-[var(--mute)] absolute right-3 top-3 pointer-events-none" />
        </div>

        {/* Resumen de asistencia en píldoras */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <Check className="w-3 h-3" /> Vino {countAttended}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Avisó {countExcused}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
            <X className="w-3 h-3" /> Sin avisar {countUnexcused}
          </span>
        </div>

        {/* Nota general de la sesión */}
        <textarea
          rows={2}
          value={generalNote}
          onChange={(e) => handleGeneralNoteChange(e.target.value)}
          placeholder="Anotación general del entrenamiento (ej. ejercicios trabajados, clima, intensidad)..."
          className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] placeholder:text-[var(--mute)] focus:border-[var(--red)]"
        />
      </div>

      {/* Lista de pasar lista jugador por jugador */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--mute)] px-1">
          <span className="font-bold uppercase tracking-wider">Pasar lista por jugador</span>
          <span>{players.length} jugadores</span>
        </div>

        {players.map((player) => {
          const rec = sessionAttendance.find((a) => a.playerId === player.id);
          const status = rec?.status;
          const isAttended = status === 'S';
          const isExcused = status === 'A';
          const isUnexcused = status === 'N';
          const isAbsent = isExcused || isUnexcused;
          const noteOpen = openPlayerNoteId === player.id;

          return (
            <div
              key={player.id}
              className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center font-bold text-xs shrink-0">
                    {player.dorsal !== null ? player.dorsal : '—'}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-sm block truncate">{player.fullName}</span>
                    {team.settings.showPositions && player.position && (
                      <span className="text-[11px] text-[var(--mute)]">{player.position}</span>
                    )}
                  </div>
                </div>

                {/* Botones de acción rápida: Vino / No vino / Anotación */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleSetAttendance(player.id, 'S')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isAttended
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-[var(--bg)] text-[var(--ink)] border-[var(--line)] hover:border-emerald-500'
                    }`}
                  >
                    Vino
                  </button>

                  <button
                    onClick={() => handleSetAttendance(player.id, isAbsent ? 'S' : 'N')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isAbsent
                        ? isExcused
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-[var(--bg)] text-[var(--ink)] border-[var(--line)] hover:border-rose-500'
                    }`}
                  >
                    No vino
                  </button>

                  <button
                    onClick={() => setOpenPlayerNoteId(noteOpen ? null : player.id)}
                    className={`p-2 rounded-xl text-xs border transition-colors ${
                      rec?.note
                        ? 'bg-[var(--gold)]/20 text-[var(--warn)] border-[var(--gold)]'
                        : 'bg-[var(--bg)] text-[var(--mute)] border-[var(--line)] hover:text-[var(--ink)]'
                    }`}
                    title="Añadir anotación para este jugador"
                    aria-label="Añadir anotación"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-selector de Falta: Avisó vs No avisó (segundo toque intuitivo) */}
              {isAbsent && (
                <div className="pt-2 border-t border-[var(--line)]/60 flex items-center justify-between text-xs animate-in fade-in duration-150">
                  <span className="text-[var(--mute)] font-medium">Motivo de la ausencia:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSetAttendance(player.id, 'A')}
                      className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                        isExcused
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-[var(--bg)] text-amber-700 dark:text-amber-300 border-[var(--line)] hover:border-amber-400'
                      }`}
                    >
                      Avisó
                    </button>
                    <button
                      onClick={() => handleSetAttendance(player.id, 'N')}
                      className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                        isUnexcused
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-[var(--bg)] text-rose-700 dark:text-rose-300 border-[var(--line)] hover:border-rose-400'
                      }`}
                    >
                      Sin avisar
                    </button>
                  </div>
                </div>
              )}

              {/* Input desplegable para la nota del jugador */}
              {(noteOpen || rec?.note) && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={rec?.note || ''}
                    onChange={(e) => handleSetPlayerNote(player.id, e.target.value)}
                    placeholder="Anotación sobre el jugador en este entreno..."
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal para crear otra sesión */}
      {isNewDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--card)] text-[var(--ink)] w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-[var(--line)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base">Crear o ir a otra fecha</h3>
              <button
                onClick={() => setIsNewDateModalOpen(false)}
                className="p-1 rounded-lg text-[var(--mute)] hover:bg-[var(--line)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1">
                  Fecha de la sesión
                </label>
                <input
                  type="date"
                  max={todayStr} // Bloquea fechas futuras en el picker
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] font-bold text-sm"
                  required
                />
                <span className="text-[11px] text-[var(--mute)] mt-1 block">
                  Solo se permiten fechas presentes o pasadas.
                </span>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[var(--red)] hover:bg-[var(--red-hover)] text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Abrir sesión
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
