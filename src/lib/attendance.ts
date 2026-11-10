import { AttendanceRecord, TrainingSession } from '@/types';

export function filterAttendanceForTeam(
  attendance: AttendanceRecord[],
  sessions: TrainingSession[],
  playerIds: Set<string>
): AttendanceRecord[] {
  const sessionIds = new Set(sessions.flatMap((session) => [session.id, session.date]));
  return attendance.filter((record) => (
    sessionIds.has(record.sessionId) && playerIds.has(record.playerId)
  ));
}
