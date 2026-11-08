export type UserRole = 'admin' | 'delegate';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamIds: string[];
}

export interface TeamSettings {
  playersOnPitch: number;      // ej. 5
  halfDurationMinutes: number; // ej. 25
  showPositions: boolean;      // true para Pre C, false para Debutantes
  trainingDays: number[];      // [2, 4] -> Martes (2) y Jueves (4)
  isConfigured: boolean;       // Bandera para avisar si Debutantes B/A no han sido configurados
}

export interface Team {
  id: string;
  name: string;
  settings: TeamSettings;
  createdAt: string;
}

export interface Player {
  id: string;
  teamId: string;
  dorsal: number | null;
  firstName: string;
  fullName: string;
  position?: string;
  isActive: boolean;
  createdAt: string;
}

// Estados de asistencia a entrenamientos
// S = Vino (Asistió)
// A = No vino pero avisó (Falta avisada)
// N = No vino y no avisó (Falta sin avisar)
export type AttendanceStatus = 'S' | 'A' | 'N';

export interface TrainingSession {
  id: string;          // Formato YYYY-MM-DD
  teamId: string;
  date: string;        // YYYY-MM-DD
  generalNote?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  playerId: string;
  status: AttendanceStatus;
  note?: string;
  updatedAt: string;
}

export type MatchStatus = 'scheduled' | 'in_progress' | 'finished';
export type MinutesSource = 'direct' | 'manual' | 'estimated';

export interface MatchPlayerRecord {
  playerId: string;
  status: 'J' | 'X'; // J = Jugó / Convocado, X = No convocado / No vino
  isStarter: boolean;
  minutes: number;
  source: MinutesSource;
  note?: string;
}

export interface Match {
  id: string;
  teamId: string;
  round: number;       // Jornada (1, 2, 3...)
  date: string;        // YYYY-MM-DD
  rival: string;
  isHome: boolean;
  generalNote?: string;
  scoreMareo?: number;
  scoreRival?: number;
  status: MatchStatus;
  // Bloqueo de partido (Match Lock)
  lockedByUserId?: string | null;
  lockedByUserName?: string | null;
  lockedAt?: string | null;
  records: Record<string, MatchPlayerRecord>; // playerId -> Record
  createdAt: string;
}

// Tipos de eventos para el cronómetro inmutable
export type MatchEventType =
  | 'MATCH_START'
  | 'CLOCK_PAUSE'
  | 'CLOCK_RESUME'
  | 'HALF_END'
  | 'SECOND_HALF_START'
  | 'MATCH_END'
  | 'SUBSTITUTION'
  | 'GOAL_MAREO'
  | 'GOAL_RIVAL';

export interface MatchEvent {
  id: string;
  matchId: string;
  period: 1 | 2;
  type: MatchEventType;
  playerOutId?: string; // En cambios: jugador que sale
  playerInId?: string;  // En cambios: jugador que entra
  goalPlayerId?: string;// En goles: jugador que marcó (opcional)
  matchSecond: number;  // Segundo del partido (ej. 480 = min 8)
  realTimestamp: string;// ISO UTC string
  createdBy: string;
  comment?: string;
}

export interface PlayerStats {
  matchesTotal: number;
  matchesAttended: number; // Partidos que jugó (st === 'J')
  matchesAsStarter: number;
  totalMinutes: number;
  averageMinutesPerMatch: number; // totalMinutes / matchesAttended
  percentMatchTime: number;       // totalMinutes / (matchesAttended * matchDuration)
  attendanceCount: {
    attended: number;  // S
    excused: number;   // A
    unexcused: number; // N
    totalSessions: number;
  };
  attendancePercent: number;      // attended / totalSessions
}

export interface AppNote {
  id: string;
  teamId: string;
  targetType: 'session' | 'match';
  targetId: string;
  playerId?: string;
  authorName: string;
  date: string;
  content: string;
}
