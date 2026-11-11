export const STATS_START_DATE = '2026-11-09';
export const DEBA_ATTENDANCE_START_DATE = '2026-11-12';
export const DEBA_MATCH_START_DATE = '2026-11-13';
export const PERCHERA_MATCH_ID = 'm-prec-6';
export const LEGACY_ATTENDANCE_PLAYER_IDS = new Set(['p-8']);

/**
 * Pares de IDs de jugadores que compiten simultáneamente en Pre C y Debutantes A.
 * p-4 (Martín Álvarez en Pre C) <-> p-da-martin-alvarez (en Debutantes A)
 * p-3 (José Díaz en Pre C) <-> p-da-jose-diaz (en Debutantes A)
 */
export const DUAL_TEAM_PLAYER_PAIRS: [string, string][] = [
  ['p-4', 'p-da-martin-alvarez'],
  ['p-3', 'p-da-jose-diaz'],
];

export function getLinkedPlayerId(playerId: string): string | null {
  for (const [id1, id2] of DUAL_TEAM_PLAYER_PAIRS) {
    if (playerId === id1) return id2;
    if (playerId === id2) return id1;
  }
  return null;
}

export function isMatchIncludedInMinuteStats(
  match: { id?: string; date?: string; teamId?: string },
  playerId?: string
): boolean {
  if (playerId === 'p-8') return true;
  if (match.id === PERCHERA_MATCH_ID) return true;

  // Si el partido pertenece a Debutantes A o es de un jugador exclusivo de Debutantes A:
  // cuenta a partir del primer partido oficial (viernes 2026-11-13)
  const isDeba =
    match.teamId === 'team-deba' ||
    match.id?.startsWith('m-deba-') ||
    (Boolean(playerId?.startsWith('p-da-')) && !getLinkedPlayerId(playerId || ''));

  if (isDeba) {
    return Boolean(match.date && match.date >= DEBA_MATCH_START_DATE);
  }

  return Boolean(match.date && match.date >= STATS_START_DATE);
}

export function isAttendanceIncludedInStats(record: { playerId: string; sessionId?: string }): boolean {
  if (LEGACY_ATTENDANCE_PLAYER_IDS.has(record.playerId)) return true;
  const sessionDate = record.sessionId?.match(/\d{4}-\d{2}-\d{2}$/)?.[0] || record.sessionId;

  // Para Debutantes A, las asistencias cuentan a partir de mañana (2026-11-12)
  const isDeba =
    record.sessionId?.startsWith('deba-') ||
    (record.playerId.startsWith('p-da-') && !getLinkedPlayerId(record.playerId));

  if (isDeba) {
    return Boolean(sessionDate && sessionDate >= DEBA_ATTENDANCE_START_DATE);
  }

  return Boolean(sessionDate && sessionDate >= STATS_START_DATE);
}
