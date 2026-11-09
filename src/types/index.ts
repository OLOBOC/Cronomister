export type UserRole = 'admin' | 'delegate';
export type UserStatus = 'active' | 'invited' | 'disabled';

export type PermissionKey =
  | 'pass_attendance'    // Pasar lista
  | 'edit_convocatoria'  // Editar convocatoria y alineaciones
  | 'control_match'      // Iniciar y controlar partidos
  | 'add_notes'          // Anotar notas
  | 'edit_past_data'     // Editar datos pasados
  | 'download_pdf'       // Descargar PDF
  | 'view_stats';        // Ver estadísticas

export type UserPermissions = Record<PermissionKey, boolean>;

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status?: UserStatus;
  teamIds: string[];
  permissionsByTeam?: Record<string, UserPermissions>;
  invitedAt?: string;
  password?: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  teamId?: string;
  timestamp: string;
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
// S = Asistió
// A = No asistió – avisó (Falta avisada)
// N = No asistió – no avisó (Falta sin avisar)
export type AttendanceStatus = 'S' | 'A' | 'N';

// Motivos de falta en entrenamiento (opcional)
export type AttendanceReason = 'Lesión' | 'Enfermedad' | 'Familiar' | 'Otros' | null;

// Motivo de no convocatoria en partido
export type NonConvocationReason =
  | 'Decisión técnica'
  | 'Sanción'
  | 'Lesión'
  | 'Trámite de federación'
  | 'Otros'
  | null;

// Estado de ausencia de un convocado que no se presenta
export type MatchAbsenceStatus = 'warned' | 'no-warning' | null;

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
  reason?: AttendanceReason;  // Motivo de la falta (solo si status !== 'S')
  note?: string;
  updatedAt: string;
}

export type MatchStatus = 'scheduled' | 'in_progress' | 'finished';
export type MinutesSource = 'direct' | 'manual' | 'estimated';
export type MatchType = 'league' | 'tournament' | 'friendly';

// Estado de convocatoria en partido:
// J = Convocado (jugó o estuvo en banquillo)
// X = No convocado
export interface MatchPlayerRecord {
  playerId: string;
  status: 'J' | 'X'; // J = Convocado, X = No convocado
  isStarter: boolean;
  minutes: number;
  source: MinutesSource;
  note?: string;
  nonConvocationReason?: NonConvocationReason; // Solo cuando status === 'X'
  matchAbsenceStatus?: MatchAbsenceStatus;      // Convocado que no se presenta al partido
}

export interface Match {
  id: string;
  teamId: string;
  round: number;       // Jornada (1, 2, 3...)
  date: string;        // YYYY-MM-DD
  rival: string;
  isHome: boolean;
  matchType?: MatchType;       // 'league' (defecto), 'tournament', 'friendly'
  tournamentName?: string;     // Nombre del torneo (ej. "Torneo de Navidad", "Mareo Cup")
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
  matchesAttended: number; // Partidos que jugó (status === 'J')
  matchesAsStarter: number;
  totalMinutes: number;
  averageMinutesPerMatch: number; // totalMinutes / matchesAttended
  percentMatchTime: number;       // totalMinutes / (matchesAttended * matchDuration)
  attendanceCount: {
    attended: number;  // S = Asistió
    excused: number;   // A = No asistió – avisó
    unexcused: number; // N = No asistió – no avisó
    totalSessions: number;
  };
  attendancePercent: number; // attended / totalSessions
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
