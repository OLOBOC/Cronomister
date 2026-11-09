'use client';

import {
  Team,
  Player,
  TrainingSession,
  AttendanceRecord,
  Match,
  MatchEvent,
  UserProfile,
  AppNote,
  MatchPlayerRecord,
} from '@/types';
import { getInitialSeedData, SEED_USERS } from './seed';

const STORAGE_KEYS = {
  TEAMS: 'cronomister_teams',
  PLAYERS: 'cronomister_players',
  SESSIONS: 'cronomister_sessions',
  ATTENDANCE: 'cronomister_attendance',
  MATCHES: 'cronomister_matches',
  EVENTS: 'cronomister_events',
  NOTES: 'cronomister_notes',
  CURRENT_USER_ID: 'cronomister_current_user_id',
  CURRENT_TEAM_ID: 'cronomister_current_team_id',
  USERS: 'cronomister_users',
};

// Event emitter para reactividad en componentes React sin dependencias externas pesadas
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error('Error in listener', e);
    }
  });
}

export function subscribeToStore(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Helpers seguros para LocalStorage
function getFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notify();
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err);
  }
}

/**
 * Inicializa los datos semilla si el almacenamiento está vacío o actualiza al calendario oficial v2
 */
export function initStore() {
  if (typeof window === 'undefined') return;

  const STORE_VERSION = 'cronomister_v2_league_calendars';
  const currentVersion = localStorage.getItem('cronomister_store_version');

  const existingTeams = localStorage.getItem(STORAGE_KEYS.TEAMS);
  if (!existingTeams || currentVersion !== STORE_VERSION) {
    const seed = getInitialSeedData();

    if (!existingTeams) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(seed.teams));
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(seed.players));
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(seed.sessions));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(seed.attendance));
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(seed.matches));
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, JSON.stringify(SEED_USERS[0].id));
      localStorage.setItem(STORAGE_KEYS.CURRENT_TEAM_ID, JSON.stringify(seed.teams[0].id));
    } else {
      // Actualización a v2: sincronizar los calendarios de Pre C y Debutantes A y plantillas
      const prevMatches = getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);
      const prevPlayers = getFromStorage<Player[]>(STORAGE_KEYS.PLAYERS, []);
      const prevTeams = getFromStorage<Team[]>(STORAGE_KEYS.TEAMS, []);

      // Conservar registros ya editados por el usuario
      const mergedMatches = [...seed.matches];
      prevMatches.forEach((pm) => {
        const seedIndex = mergedMatches.findIndex((m) => m.id === pm.id);
        if (seedIndex !== -1) {
          // Si el usuario ya tenía actas o minutos jugados en este partido, conservarlos
          if (Object.keys(pm.records || {}).length > 0) {
            mergedMatches[seedIndex].records = pm.records;
            mergedMatches[seedIndex].status = pm.status;
            mergedMatches[seedIndex].scoreMareo = pm.scoreMareo;
            mergedMatches[seedIndex].scoreRival = pm.scoreRival;
          }
        } else if (!pm.id.startsWith('m-prec-') && !pm.id.startsWith('m-deba-')) {
          // Partidos manuales creados por el usuario
          mergedMatches.push(pm);
        }
      });

      // Asegurar que Debutantes A tenga jugadores y esté marcado configurado
      const mergedPlayers = [...prevPlayers];
      seed.players.forEach((sp) => {
        if (!mergedPlayers.some((p) => p.id === sp.id)) {
          mergedPlayers.push(sp);
        }
      });

      const mergedTeams = seed.teams.map((st) => {
        const existing = prevTeams.find((pt) => pt.id === st.id);
        return existing ? { ...existing, settings: { ...existing.settings, isConfigured: true } } : st;
      });

      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(mergedMatches));
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(mergedPlayers));
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(mergedTeams));
    }

    localStorage.setItem('cronomister_store_version', STORE_VERSION);
    notify();
  }

  // Escuchar cambios de otras pestañas
  window.addEventListener('storage', () => {
    notify();
  });
}

// --- GESTIÓN DE USUARIOS Y ROLES ---

export function getUsers(): UserProfile[] {
  return getFromStorage<UserProfile[]>(STORAGE_KEYS.USERS, SEED_USERS);
}

export function getCurrentUser(): UserProfile {
  const users = getUsers();
  const currentId = getFromStorage<string>(STORAGE_KEYS.CURRENT_USER_ID, users[0]?.id || 'user-coach-1');
  return users.find((u) => u.id === currentId) || users[0];
}

export function setCurrentUser(userId: string) {
  setToStorage(STORAGE_KEYS.CURRENT_USER_ID, userId);
  // Ajustar equipo actual si el usuario no tiene acceso al actual
  const user = getUsers().find((u) => u.id === userId);
  const currentTeamId = getCurrentTeamId();
  if (user && !user.teamIds.includes(currentTeamId)) {
    setCurrentTeamId(user.teamIds[0] || '');
  }
}

export function inviteDelegate(teamId: string, email: string, name: string): UserProfile {
  const users = getUsers();
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (existing) {
    if (!existing.teamIds.includes(teamId)) {
      existing.teamIds.push(teamId);
      setToStorage(STORAGE_KEYS.USERS, users);
    }
    return existing;
  }

  const newUser: UserProfile = {
    id: `user-del-${Date.now()}`,
    email,
    name,
    role: 'delegate',
    teamIds: [teamId],
  };

  users.push(newUser);
  setToStorage(STORAGE_KEYS.USERS, users);
  return newUser;
}

// --- GESTIÓN DE EQUIPOS ---

export function getTeams(): Team[] {
  return getFromStorage<Team[]>(STORAGE_KEYS.TEAMS, []);
}

export function getAvailableTeamsForCurrentUser(): Team[] {
  const user = getCurrentUser();
  const allTeams = getTeams();
  return allTeams.filter((t) => user.teamIds.includes(t.id));
}

export function getCurrentTeamId(): string {
  const teams = getAvailableTeamsForCurrentUser();
  const fallback = teams[0]?.id || '';
  return getFromStorage<string>(STORAGE_KEYS.CURRENT_TEAM_ID, fallback);
}

export function setCurrentTeamId(teamId: string) {
  setToStorage(STORAGE_KEYS.CURRENT_TEAM_ID, teamId);
}

export function getCurrentTeam(): Team | null {
  const teamId = getCurrentTeamId();
  return getTeams().find((t) => t.id === teamId) || null;
}

export function updateTeamSettings(
  teamId: string,
  settings: Partial<Team['settings']>
): boolean {
  const user = getCurrentUser();
  if (user.role !== 'admin') {
    throw new Error('Solo el administrador puede modificar la configuración del equipo');
  }

  const teams = getTeams();
  const team = teams.find((t) => t.id === teamId);
  if (!team) return false;

  team.settings = {
    ...team.settings,
    ...settings,
    isConfigured: true,
  };

  setToStorage(STORAGE_KEYS.TEAMS, teams);
  return true;
}

// --- GESTIÓN DE JUGADORES (CRUD + CSV) ---

export function getPlayers(teamId?: string): Player[] {
  const all = getFromStorage<Player[]>(STORAGE_KEYS.PLAYERS, []);
  const targetTeam = teamId || getCurrentTeamId();
  return all.filter((p) => p.teamId === targetTeam);
}

export function getPlayerById(playerId: string): Player | null {
  const all = getFromStorage<Player[]>(STORAGE_KEYS.PLAYERS, []);
  return all.find((p) => p.id === playerId) || null;
}

export function addPlayer(
  player: Omit<Player, 'id' | 'teamId' | 'createdAt'>,
  teamId?: string
): Player {
  const targetTeam = teamId || getCurrentTeamId();
  const all = getFromStorage<Player[]>(STORAGE_KEYS.PLAYERS, []);

  const newPlayer: Player = {
    ...player,
    id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    teamId: targetTeam,
    createdAt: new Date().toISOString(),
  };

  all.push(newPlayer);
  setToStorage(STORAGE_KEYS.PLAYERS, all);
  return newPlayer;
}

export function updatePlayer(playerId: string, updates: Partial<Player>): boolean {
  const all = getFromStorage<Player[]>(STORAGE_KEYS.PLAYERS, []);
  const idx = all.findIndex((p) => p.id === playerId);
  if (idx === -1) return false;

  all[idx] = { ...all[idx], ...updates };
  setToStorage(STORAGE_KEYS.PLAYERS, all);
  return true;
}

export function deletePlayer(playerId: string): boolean {
  const user = getCurrentUser();
  if (user.role !== 'admin') {
    throw new Error('Solo el entrenador principal (admin) puede eliminar jugadores (RGPD)');
  }

  const all = getFromStorage<Player[]>(STORAGE_KEYS.PLAYERS, []);
  const filtered = all.filter((p) => p.id !== playerId);
  if (filtered.length === all.length) return false;

  setToStorage(STORAGE_KEYS.PLAYERS, filtered);
  return true;
}

export function importPlayers(
  parsedPlayers: Array<{ dorsal: number | null; firstName: string; fullName: string; position?: string }>,
  teamId?: string
): number {
  const targetTeam = teamId || getCurrentTeamId();
  const all = getFromStorage<Player[]>(STORAGE_KEYS.PLAYERS, []);
  let count = 0;

  for (const item of parsedPlayers) {
    const newPlayer: Player = {
      id: `p-${Date.now()}-${count}-${Math.floor(Math.random() * 1000)}`,
      teamId: targetTeam,
      dorsal: item.dorsal,
      firstName: item.firstName,
      fullName: item.fullName,
      position: item.position,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    all.push(newPlayer);
    count++;
  }

  setToStorage(STORAGE_KEYS.PLAYERS, all);
  return count;
}

// --- ENTRENAMIENTOS Y ASISTENCIA ---

export function getSessions(teamId?: string): TrainingSession[] {
  const targetTeam = teamId || getCurrentTeamId();
  const all = getFromStorage<TrainingSession[]>(STORAGE_KEYS.SESSIONS, []);
  return all
    .filter((s) => s.teamId === targetTeam)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function getOrCreateSession(date: string, teamId?: string): TrainingSession {
  const targetTeam = teamId || getCurrentTeamId();
  const all = getFromStorage<TrainingSession[]>(STORAGE_KEYS.SESSIONS, []);
  const existing = all.find((s) => s.teamId === targetTeam && s.date === date);

  if (existing) return existing;

  const newSession: TrainingSession = {
    id: date,
    teamId: targetTeam,
    date,
    generalNote: '',
    createdAt: new Date().toISOString(),
  };

  all.push(newSession);
  setToStorage(STORAGE_KEYS.SESSIONS, all);
  return newSession;
}

export function updateSessionNote(date: string, note: string, teamId?: string) {
  const targetTeam = teamId || getCurrentTeamId();
  const all = getFromStorage<TrainingSession[]>(STORAGE_KEYS.SESSIONS, []);
  const session = all.find((s) => s.teamId === targetTeam && s.date === date);
  if (session) {
    session.generalNote = note;
    setToStorage(STORAGE_KEYS.SESSIONS, all);
  }
}

export function getAttendance(teamId?: string): AttendanceRecord[] {
  const all = getFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
  if (!teamId) return all;
  const sessions = getSessions(teamId);
  const sessionIds = new Set(sessions.map((s) => s.id));
  return all.filter((a) => sessionIds.has(a.sessionId));
}

export function setAttendanceRecord(
  sessionId: string,
  playerId: string,
  status: 'S' | 'A' | 'N',
  note?: string
) {
  const all = getFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
  const idx = all.findIndex((a) => a.sessionId === sessionId && a.playerId === playerId);

  if (idx !== -1) {
    // Si pulsa el mismo estado ya activo, se desmarca (o se actualiza)
    all[idx].status = status;
    if (note !== undefined) all[idx].note = note;
    all[idx].updatedAt = new Date().toISOString();
  } else {
    all.push({
      id: `att-${sessionId}-${playerId}`,
      sessionId,
      playerId,
      status,
      note: note || '',
      updatedAt: new Date().toISOString(),
    });
  }

  setToStorage(STORAGE_KEYS.ATTENDANCE, all);
}

// --- PARTIDOS Y CRONÓMETRO ---

export function getMatches(teamId?: string): Match[] {
  const targetTeam = teamId || getCurrentTeamId();
  const all = getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);
  return all
    .filter((m) => m.teamId === targetTeam)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function getMatchById(matchId: string): Match | null {
  const all = getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);
  return all.find((m) => m.id === matchId) || null;
}

export function addMatch(
  match: Omit<Match, 'id' | 'teamId' | 'status' | 'records' | 'createdAt'>,
  teamId?: string
): Match {
  const targetTeam = teamId || getCurrentTeamId();
  const all = getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);

  const newMatch: Match = {
    ...match,
    id: `m-${Date.now()}`,
    teamId: targetTeam,
    status: 'scheduled',
    records: {},
    createdAt: new Date().toISOString(),
  };

  all.push(newMatch);
  setToStorage(STORAGE_KEYS.MATCHES, all);
  return newMatch;
}

export function updateMatch(matchId: string, updates: Partial<Match>): boolean {
  const all = getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);
  const idx = all.findIndex((m) => m.id === matchId);
  if (idx === -1) return false;

  all[idx] = { ...all[idx], ...updates };
  setToStorage(STORAGE_KEYS.MATCHES, all);
  return true;
}

export function updateMatchRosterManual(
  matchId: string,
  playerId: string,
  updates: Partial<MatchPlayerRecord>
) {
  const all = getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);
  const match = all.find((m) => m.id === matchId);
  if (!match) return;

  const currentRecord = match.records[playerId] || {
    playerId,
    status: 'J',
    isStarter: false,
    minutes: 0,
    source: 'manual',
  };

  match.records[playerId] = {
    ...currentRecord,
    ...updates,
    source: 'manual', // Marcar explícitamente con auditoría de origen manual
  };

  setToStorage(STORAGE_KEYS.MATCHES, all);
}

// Bloqueo de partido (Match Lock)
export function acquireMatchLock(matchId: string): { success: boolean; holderName?: string } {
  const user = getCurrentUser();
  const all = getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);
  const match = all.find((m) => m.id === matchId);
  if (!match) return { success: false };

  const now = Date.now();
  const lockExpiresMs = 45 * 1000; // 45 segundos de heartbeat lease

  if (match.lockedByUserId && match.lockedByUserId !== user.id) {
    const lockedAtTime = match.lockedAt ? new Date(match.lockedAt).getTime() : 0;
    const isLockActive = now - lockedAtTime < lockExpiresMs;

    // Si el usuario es admin, puede forzar la toma de control
    if (isLockActive && user.role !== 'admin') {
      return { success: false, holderName: match.lockedByUserName || 'otro delegado' };
    }
  }

  // Tomar bloqueo
  match.lockedByUserId = user.id;
  match.lockedByUserName = user.name;
  match.lockedAt = new Date().toISOString();
  setToStorage(STORAGE_KEYS.MATCHES, all);

  return { success: true };
}

export function releaseMatchLock(matchId: string) {
  const user = getCurrentUser();
  const all = getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);
  const match = all.find((m) => m.id === matchId);
  if (!match) return;

  if (match.lockedByUserId === user.id || user.role === 'admin') {
    match.lockedByUserId = null;
    match.lockedByUserName = null;
    match.lockedAt = null;
    setToStorage(STORAGE_KEYS.MATCHES, all);
  }
}

// Eventos de cronómetro
export function getMatchEvents(matchId: string): MatchEvent[] {
  const all = getFromStorage<MatchEvent[]>(STORAGE_KEYS.EVENTS, []);
  return all.filter((e) => e.matchId === matchId).sort((a, b) => a.matchSecond - b.matchSecond);
}

export function appendMatchEvent(event: Omit<MatchEvent, 'id' | 'realTimestamp' | 'createdBy'>): MatchEvent {
  const user = getCurrentUser();
  const all = getFromStorage<MatchEvent[]>(STORAGE_KEYS.EVENTS, []);

  const newEvent: MatchEvent = {
    ...event,
    id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    realTimestamp: new Date().toISOString(),
    createdBy: user.name,
  };

  all.push(newEvent);
  setToStorage(STORAGE_KEYS.EVENTS, all);
  return newEvent;
}

// --- ANOTACIONES (HISTORIAL) ---

export function getNotes(): AppNote[] {
  return getFromStorage<AppNote[]>(STORAGE_KEYS.NOTES, []);
}

export function addAppNote(note: Omit<AppNote, 'id' | 'date' | 'authorName'>): AppNote {
  const user = getCurrentUser();
  const all = getNotes();

  const newNote: AppNote = {
    ...note,
    id: `note-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    authorName: user.name,
  };

  all.push(newNote);
  setToStorage(STORAGE_KEYS.NOTES, all);
  return newNote;
}

// --- RGPD Y PORTABILIDAD DE DATOS ---

export function exportTeamData(teamId: string): string {
  const team = getTeams().find((t) => t.id === teamId);
  const players = getPlayers(teamId);
  const sessions = getSessions(teamId);
  const matches = getMatches(teamId);
  const attendance = getAttendance(teamId);

  const payload = {
    club: 'Escuela de Fútbol Mareo',
    exportedAt: new Date().toISOString(),
    team,
    players,
    sessions,
    attendance,
    matches,
  };

  return JSON.stringify(payload, null, 2);
}

export function deletePlayerData(playerId: string): boolean {
  const user = getCurrentUser();
  if (user.role !== 'admin') {
    throw new Error('Solo el entrenador principal puede ejercer el derecho de supresión RGPD');
  }

  // Eliminar de jugadores
  const players = getFromStorage<Player[]>(STORAGE_KEYS.PLAYERS, []);
  setToStorage(
    STORAGE_KEYS.PLAYERS,
    players.filter((p) => p.id !== playerId)
  );

  // Eliminar de asistencias
  const attendance = getFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
  setToStorage(
    STORAGE_KEYS.ATTENDANCE,
    attendance.filter((a) => a.playerId !== playerId)
  );

  // Anonimizar en partidos históricos
  const matches = getFromStorage<Match[]>(STORAGE_KEYS.MATCHES, []);
  matches.forEach((m) => {
    if (m.records[playerId]) {
      delete m.records[playerId];
    }
  });
  setToStorage(STORAGE_KEYS.MATCHES, matches);

  return true;
}
