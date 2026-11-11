import { MatchEvent, MatchPlayerRecord } from '@/types';
import { isAttendanceIncludedInStats, isMatchIncludedInMinuteStats, getLinkedPlayerId } from './statsPolicy';

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
  const linkedId = getLinkedPlayerId(playerId);

  // Partidos en los que fue convocado / con registro (soporta jugadores con doble equipo)
  const getPlayerRecord = (m: { records: Record<string, MatchPlayerRecord> }) =>
    m.records[playerId] || (linkedId ? m.records[linkedId] : undefined);

  const relevantMatches = matches
    .filter((match) => isMatchIncludedInMinuteStats(match, playerId))
    .filter((m) => {
      const rec = getPlayerRecord(m);
      return rec && (rec.status === 'J' || rec.status === 'X');
    });

  const playedMatches = relevantMatches.filter((m) => getPlayerRecord(m)?.status === 'J');
  const starterMatches = playedMatches.filter((m) => getPlayerRecord(m)?.isStarter);

  const totalMinutes = playedMatches.reduce(
    (acc, m) => acc + (getPlayerRecord(m)?.minutes || 0),
    0
  );

  const countPlayed = playedMatches.length;
  const averageMinutesPerMatch = countPlayed > 0 ? totalMinutes / countPlayed : 0;
  const percentMatchTime =
    countPlayed > 0 && matchDurationMinutes > 0
      ? totalMinutes / (countPlayed * matchDurationMinutes)
      : 0;

  // Asistencia a entrenos (solo sobre sesiones registradas):
  // Agrupación por fecha de sesión para jugadores en doble equipo (evita que las faltas cuenten por dos)
  const targetPlayerIds = new Set(linkedId ? [playerId, linkedId] : [playerId]);
  const statisticalAttendance = attendance.filter((record) => (
    targetPlayerIds.has(record.playerId) && isAttendanceIncludedInStats(record)
  ));

  // Deduplicación por fecha de sesión:
  // Si en una fecha el jugador asistió ('S') en cualquiera de las sesiones -> cuenta como 'S' (asistió)
  // Si en una fecha no asistió, solo cuenta como 1 falta (avisada 'A' si avisó en alguna, o sin avisar 'N')
  const statusByDate = new Map<string, 'S' | 'A' | 'N'>();
  for (const record of statisticalAttendance) {
    const date = record.sessionId?.match(/\d{4}-\d{2}-\d{2}$/)?.[0] || record.sessionId || 'unknown';
    const current = statusByDate.get(date);
    if (!current) {
      statusByDate.set(date, record.status);
    } else if (record.status === 'S') {
      statusByDate.set(date, 'S'); // 'S' prima: si entrenó en uno de sus equipos, asistió
    } else if (current === 'N' && record.status === 'A') {
      statusByDate.set(date, 'A'); // Si avisó en alguno, computa como falta avisada
    }
  }

  const dedupedStatuses = Array.from(statusByDate.values());
  const attended = dedupedStatuses.filter((a) => a === 'S').length;
  const excused = dedupedStatuses.filter((a) => a === 'A').length;
  const unexcused = dedupedStatuses.filter((a) => a === 'N').length;
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
