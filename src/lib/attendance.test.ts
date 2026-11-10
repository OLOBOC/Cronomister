import { describe, expect, it } from 'vitest';
import { AttendanceRecord, TrainingSession } from '@/types';
import { filterAttendanceForTeam } from './attendance';

describe('filterAttendanceForTeam', () => {
  const session: TrainingSession = {
    id: 'prec-2026-11-10',
    teamId: 'team-prec',
    date: '2026-11-10',
    createdAt: '2026-11-10T00:00:00.000Z',
  };

  it('includes existing attendance saved with the session date instead of the prefixed session ID', () => {
    const record: AttendanceRecord = {
      id: 'att-2026-11-10-p-1',
      sessionId: '2026-11-10',
      playerId: 'p-1',
      status: 'S',
      updatedAt: '2026-11-10T10:00:00.000Z',
    };

    expect(filterAttendanceForTeam([record], [session], new Set(['p-1']))).toEqual([record]);
  });

  it('keeps attendance isolated to players on the requested team when dates overlap', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'prec-record',
        sessionId: '2026-11-10',
        playerId: 'prec-player',
        status: 'S',
        updatedAt: '2026-11-10T10:00:00.000Z',
      },
      {
        id: 'deba-record',
        sessionId: '2026-11-10',
        playerId: 'deba-player',
        status: 'S',
        updatedAt: '2026-11-10T10:00:00.000Z',
      },
    ];

    expect(filterAttendanceForTeam(records, [session], new Set(['prec-player']))).toEqual([records[0]]);
  });
});
