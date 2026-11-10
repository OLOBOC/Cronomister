import { MatchEvent, MatchPlayerRecord } from '@/types';
import { isAttendanceIncludedInStats, isMatchIncludedInMinuteStats } from './statsPolicy';

export interface PlayerInterval {
  playerId: string;
  startSecond: number;
  endSecond: number;
}

export interface CalculationResult {
  playerSeconds: Record<string, number>;
  playerMinutes: Record<string, number>;
  activeOnPitch: Set<string>;
  currentMatchSecond: number;
  isClockRunning: boolean;
}

/**
 * Motor de cálculo de minutaje efectivo basado en eventos.
 * Procesa la secuencia ordenada de eventos inmutables.
 */
export function calculateMinutesFromEvents(
  events: MatchEvent[],
  starters: string[]
): CalculationResult {
  const sortedEvents = [...events].sort((a, b) => a.matchSecond - b.matchSecond);

  const playerSeconds: Record<string, number> = {};
  const activeEntrySecond: Record<string, number> = {};
  const activeOnPitch = new Set<string>();

  let isClockRunning = false;
  let currentMatchSecond = 0;

  for (const ev of sortedEvents) {
    currentMatchSecond = Math.max(currentMatchSecond, ev.matchSecond);

    switch (ev.type) {
      case 'MATCH_START': {
        isClockRunning = true;
        // Los titulares entran al segundo ev.matchSecond (normalmente 0)
        for (const pid of starters) {
          activeOnPitch.add(pid);
          activeEntrySecond[pid] = ev.matchSecond;
        }
        break;
      }

      case 'CLOCK_PAUSE': {
        if (isClockRunning) {
          // Congela los tramos hasta la reanudación
          for (const pid of activeOnPitch) {
            const entered = activeEntrySecond[pid] ?? ev.matchSecond;
            const delta = Math.max(0, ev.matchSecond - entered);
            playerSeconds[pid] = (playerSeconds[pid] || 0) + delta;
            activeEntrySecond[pid] = ev.matchSecond;
          }
          isClockRunning = false;
        }
        break;
      }

      case 'CLOCK_RESUME': {
        isClockRunning = true;
        for (const pid of activeOnPitch) {
          activeEntrySecond[pid] = ev.matchSecond;
        }
        break;
      }

      case 'SUBSTITUTION': {
        const outId = ev.playerOutId;
        const inId = ev.playerInId;

        // Jugador que sale
        if (outId && activeOnPitch.has(outId)) {
          if (isClockRunning) {
            const entered = activeEntrySecond[outId] ?? ev.matchSecond;
            const delta = Math.max(0, ev.matchSecond - entered);
            playerSeconds[outId] = (playerSeconds[outId] || 0) + delta;
          }
          activeOnPitch.delete(outId);
          delete activeEntrySecond[outId];
        }

        // Jugador que entra
        if (inId) {
          activeOnPitch.add(inId);
          activeEntrySecond[inId] = ev.matchSecond;
        }
        break;
      }

      case 'HALF_END': {
        if (isClockRunning) {
          for (const pid of activeOnPitch) {
            const entered = activeEntrySecond[pid] ?? ev.matchSecond;
            const delta = Math.max(0, ev.matchSecond - entered);
            playerSeconds[pid] = (playerSeconds[pid] || 0) + delta;
          }
          isClockRunning = false;
        }
        break;
      }

      case 'SECOND_HALF_START': {
        isClockRunning = true;
        for (const pid of activeOnPitch) {
          activeEntrySecond[pid] = ev.matchSecond;
        }
        break;
      }

      case 'MATCH_END': {
        if (isClockRunning) {
          for (const pid of activeOnPitch) {
            const entered = activeEntrySecond[pid] ?? ev.matchSecond;
            const delta = Math.max(0, ev.matchSecond - entered);
            playerSeconds[pid] = (playerSeconds[pid] || 0) + delta;
          }
          isClockRunning = false;
        }
        break;
      }

      default:
        // Goles u otros eventos no alteran los tramos directamente
        break;
    }
  }

  // Redondear a minutos reglamentarios enteros (con redondeo estándar o techo/suelo)
  const playerMinutes: Record<string, number> = {};
  for (const [pid, secs] of Object.entries(playerSeconds)) {
    playerMinutes[pid] = Math.round(secs / 60);
  }

  return {
    playerSeconds,
    playerMinutes,
    activeOnPitch,
    currentMatchSecond,
    isClockRunning,
  };
}

/**
 * Métricas estadísticas oficiales de un jugador
 */
export function calculatePlayerKPIs(
  playerId: string,
  matches: Array<{ id?: string; date?: string; records: Record<string, MatchPlayerRecord>; isFinished: boolean }>,
  attendance: Array<{ playerId: string; sessionId?: string; status: 'S' | 'A' | 'N' }>,
  matchDurationMinutes: number
) {
  // Partidos en los que fue convocado / con registro
  const relevantMatches = matches.filter((match) => isMatchIncludedInMinuteStats(match, playerId)).filter(
    (m) => m.records[playerId] && (m.records[playerId].status === 'J' || m.records[playerId].status === 'X')
  );

  const playedMatches = relevantMatches.filter((m) => m.records[playerId]?.status === 'J');
  const starterMatches = playedMatches.filter((m) => m.records[playerId]?.isStarter);

  const totalMinutes = playedMatches.reduce(
    (acc, m) => acc + (m.records[playerId]?.minutes || 0),
    0
  );

  const countPlayed = playedMatches.length;
  const averageMinutesPerMatch = countPlayed > 0 ? totalMinutes / countPlayed : 0;
  const percentMatchTime =
    countPlayed > 0 && matchDurationMinutes > 0
      ? totalMinutes / (countPlayed * matchDurationMinutes)
      : 0;

  // Asistencia a entrenos (solo sobre sesiones registradas)
  const statisticalAttendance = attendance.filter((record) => (
    record.playerId === playerId && isAttendanceIncludedInStats(record)
  ));
  const attended = statisticalAttendance.filter((a) => a.status === 'S').length;
  const excused = statisticalAttendance.filter((a) => a.status === 'A').length;
  const unexcused = statisticalAttendance.filter((a) => a.status === 'N').length;
  const totalSessions = attended + excused + unexcused;

  const attendancePercent = totalSessions > 0 ? attended / totalSessions : 0;

  return {
    matchesTotal: relevantMatches.length,
    matchesAttended: countPlayed,
    matchesAsStarter: starterMatches.length,
    totalMinutes,
    averageMinutesPerMatch,
    percentMatchTime,
    attendanceCount: {
      attended,
      excused,
      unexcused,
      totalSessions,
    },
    attendancePercent,
  };
}
