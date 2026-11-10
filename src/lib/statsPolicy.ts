export const STATS_START_DATE = '2026-11-09';
export const PERCHERA_MATCH_ID = 'm-prec-6';
export const LEGACY_ATTENDANCE_PLAYER_IDS = new Set(['p-8']);

export function isMatchIncludedInMinuteStats(match: { id?: string; date?: string }): boolean {
  return match.id === PERCHERA_MATCH_ID || Boolean(match.date && match.date >= STATS_START_DATE);
}

export function isAttendanceIncludedInStats(record: { playerId: string; sessionId?: string }): boolean {
  if (LEGACY_ATTENDANCE_PLAYER_IDS.has(record.playerId)) return true;
  const sessionDate = record.sessionId?.match(/\d{4}-\d{2}-\d{2}$/)?.[0];
  return Boolean(sessionDate && sessionDate >= STATS_START_DATE);
}
