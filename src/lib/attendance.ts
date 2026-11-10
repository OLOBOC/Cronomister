import { AttendanceRecord, AttendanceStatus, TrainingSession } from '@/types';

export function getNextAttendanceStatus(
  currentStatus: AttendanceStatus | undefined,
  requestedStatus: AttendanceStatus,
  toggleSelected = true
): AttendanceStatus | null {
  return toggleSelected && currentStatus === requestedStatus ? null : requestedStatus;
}

export function filterAttendanceForTeam(
  attendance: AttendanceRecord[],
  sessions: TrainingSession[],
  playerIds: Set<string>
): AttendanceRecord[] {
  const sessionIds = new Set(sessions.flatMap((session) => [session.id, session.date]));
  return attendance.filter((record) => (
    !record.deletedAt && sessionIds.has(record.sessionId) && playerIds.has(record.playerId)
  ));
}
