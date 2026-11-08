import { Team, Player, Match, TrainingSession, AttendanceRecord, UserProfile } from '@/types';

export const SEED_USERS: UserProfile[] = [
  {
    id: 'user-coach-1',
    email: 'entrenador@mareo.es',
    name: 'Entrenador Principal',
    role: 'admin',
    teamIds: ['team-prec', 'team-debb', 'team-deba'],
  },
  {
    id: 'user-delegate-1',
    email: 'delegado@mareo.es',
    name: 'Delegado de Campo',
    role: 'delegate',
    teamIds: ['team-prec'],
  },
];

export function getInitialSeedData() {
  const teams: Team[] = [
    {
      id: 'team-prec',
      name: 'Pre C',
      settings: {
        playersOnPitch: 5,
        halfDurationMinutes: 25,
        showPositions: true,
        trainingDays: [2, 4], // Martes y Jueves
        isConfigured: true,
      },
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'team-debb',
      name: 'Debutantes B',
      settings: {
        playersOnPitch: 5,
        halfDurationMinutes: 25,
        showPositions: false,
        trainingDays: [2, 4],
        isConfigured: false, // Avisa si no están configurados
      },
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'team-deba',
      name: 'Debutantes A',
      settings: {
        playersOnPitch: 5,
        halfDurationMinutes: 25,
        showPositions: false,
        trainingDays: [2, 4],
        isConfigured: false, // Avisa si no están configurados
      },
      createdAt: '2026-09-01T00:00:00Z',
    },
  ];

  const players: Player[] = [
    { id: 'p-1', teamId: 'team-prec', dorsal: 1, firstName: 'Unai', fullName: 'Unai Robledo Sanchez', position: 'PT', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-2', teamId: 'team-prec', dorsal: 2, firstName: 'Mario', fullName: 'Mario Berdasco Amandi', position: 'Cierre', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-3', teamId: 'team-prec', dorsal: 3, firstName: 'Jose', fullName: 'Jose Diaz Diaz', position: 'Ala', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-4', teamId: 'team-prec', dorsal: 4, firstName: 'Martín', fullName: 'Martin Alvarez Menendez', position: 'Ala', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-5', teamId: 'team-prec', dorsal: 5, firstName: 'Gonzalo', fullName: 'Gonzalo Palmero Garcia', position: 'Ala', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-6', teamId: 'team-prec', dorsal: 6, firstName: 'Gino', fullName: 'Gino Onis Fonseca', position: 'Pívot', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-7', teamId: 'team-prec', dorsal: 7, firstName: 'Salvador', fullName: 'Salvador Milano', position: 'Pívot', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-8', teamId: 'team-prec', dorsal: 8, firstName: 'Aitor', fullName: 'Aitor Pedrayes Caravia', position: 'Ala', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-9', teamId: 'team-prec', dorsal: 9, firstName: 'Aleister', fullName: 'Aleister Smart Hastings', position: 'Ala', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-10', teamId: 'team-prec', dorsal: 10, firstName: 'Jorge', fullName: 'Jorge Vega Menendez', position: 'Ala', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-11', teamId: 'team-prec', dorsal: 11, firstName: 'Tokyo', fullName: 'Tokyo Mera Diaz', position: 'PT', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
  ];

  // Generación de sesiones de martes y jueves desde 01/09/2026 hasta 26/11/2026
  const sessions: TrainingSession[] = [];
  const attendance: AttendanceRecord[] = [];

  const startDate = new Date('2026-09-01T12:00:00Z');
  const endDate = new Date('2026-11-26T12:00:00Z');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
    if (day === 2 || day === 4) {
      const dateStr = d.toISOString().slice(0, 10);
      sessions.push({
        id: dateStr,
        teamId: 'team-prec',
        date: dateStr,
        generalNote: dateStr === '2026-10-29' ? 'Entrenamiento de repliegue y saques de banda' : '',
        createdAt: d.toISOString(),
      });

      // Asistencia histórica para sesiones hasta 2026-11-05
      if (dateStr <= '2026-11-05') {
        players.forEach((p) => {
          let status: 'S' | 'A' | 'N' = 'S';
          let note = '';

          // Registro específico para Salvador Milano (id p-7)
          if (p.id === 'p-7') {
            if (dateStr === '2026-10-22' || dateStr === '2026-10-27' || dateStr === '2026-11-03') {
              status = 'N';
            } else if (dateStr === '2026-10-29') {
              status = 'A';
              note = 'Avisó por resfriado';
            }
          } else {
            // Simulamos asistencia habitual para el resto del equipo
            if (dateStr === '2026-10-15' && (p.id === 'p-2' || p.id === 'p-4')) {
              status = 'A';
              note = 'Viaje familiar';
            }
          }

          attendance.push({
            id: `att-${dateStr}-${p.id}`,
            sessionId: dateStr,
            playerId: p.id,
            status,
            note,
            updatedAt: d.toISOString(),
          });
        });
      }
    }
  }

  // Calendario del Pre C (partidos de 50 min: 2 x 25 min)
  const matches: Match[] = [
    {
      id: 'm-1',
      teamId: 'team-prec',
      round: 1,
      date: '2026-10-03',
      rival: 'C.D. Montevil',
      isHome: true,
      scoreMareo: 4,
      scoreRival: 2,
      status: 'finished',
      generalNote: 'Buen inicio de temporada. Gran presión arriba.',
      records: {
        'p-1': { playerId: 'p-1', status: 'J', isStarter: true, minutes: 25, source: 'direct' },
        'p-2': { playerId: 'p-2', status: 'J', isStarter: true, minutes: 30, source: 'direct' },
        'p-3': { playerId: 'p-3', status: 'J', isStarter: true, minutes: 25, source: 'direct' },
        'p-6': { playerId: 'p-6', status: 'J', isStarter: true, minutes: 20, source: 'direct' },
        'p-7': { playerId: 'p-7', status: 'J', isStarter: true, minutes: 35, source: 'direct', note: 'Gol en jugada combinada' },
        'p-9': { playerId: 'p-9', status: 'J', isStarter: false, minutes: 27, source: 'direct' },
        'p-11': { playerId: 'p-11', status: 'J', isStarter: false, minutes: 25, source: 'direct' },
      },
      createdAt: '2026-10-03T10:00:00Z',
    },
    {
      id: 'm-2',
      teamId: 'team-prec',
      round: 2,
      date: '2026-10-10',
      rival: 'C.D. Virgen Inmaculada A',
      isHome: false,
      scoreMareo: 2,
      scoreRival: 2,
      status: 'finished',
      generalNote: 'Partido muy disputado bajo lluvia.',
      records: {
        'p-7': { playerId: 'p-7', status: 'X', isStarter: false, minutes: 0, source: 'manual', note: 'Falta justificada' },
        'p-1': { playerId: 'p-1', status: 'J', isStarter: true, minutes: 35, source: 'direct' },
        'p-2': { playerId: 'p-2', status: 'J', isStarter: true, minutes: 35, source: 'direct' },
        'p-3': { playerId: 'p-3', status: 'J', isStarter: true, minutes: 30, source: 'direct' },
        'p-4': { playerId: 'p-4', status: 'J', isStarter: true, minutes: 30, source: 'direct' },
        'p-5': { playerId: 'p-5', status: 'J', isStarter: true, minutes: 25, source: 'direct' },
      },
      createdAt: '2026-10-10T10:00:00Z',
    },
    {
      id: 'm-3',
      teamId: 'team-prec',
      round: 3,
      date: '2026-10-17',
      rival: 'C.D. Lealtad C',
      isHome: true,
      scoreMareo: 3,
      scoreRival: 1,
      status: 'finished',
      generalNote: 'Dominio claro del balón.',
      records: {
        'p-7': { playerId: 'p-7', status: 'J', isStarter: false, minutes: 29, source: 'direct' },
        'p-1': { playerId: 'p-1', status: 'J', isStarter: true, minutes: 25, source: 'direct' },
        'p-2': { playerId: 'p-2', status: 'J', isStarter: true, minutes: 28, source: 'direct' },
        'p-3': { playerId: 'p-3', status: 'J', isStarter: true, minutes: 25, source: 'direct' },
      },
      createdAt: '2026-10-17T10:00:00Z',
    },
    {
      id: 'm-4',
      teamId: 'team-prec',
      round: 4,
      date: '2026-10-24',
      rival: 'Gijón Fútbol Femenino A',
      isHome: false,
      scoreMareo: 1,
      scoreRival: 0,
      status: 'finished',
      generalNote: 'Defensa sólida todo el encuentro.',
      records: {
        'p-7': { playerId: 'p-7', status: 'J', isStarter: false, minutes: 20, source: 'direct' },
      },
      createdAt: '2026-10-24T10:00:00Z',
    },
    {
      id: 'm-5',
      teamId: 'team-prec',
      round: 5,
      date: '2026-10-31',
      rival: 'C.D. Manuel Rubio B',
      isHome: true,
      scoreMareo: 5,
      scoreRival: 3,
      status: 'finished',
      records: {
        'p-7': { playerId: 'p-7', status: 'J', isStarter: true, minutes: 25, source: 'direct' },
      },
      createdAt: '2026-10-31T10:00:00Z',
    },
    {
      id: 'm-6',
      teamId: 'team-prec',
      round: 6,
      date: '2026-11-07',
      rival: 'C.D. Gijón Perchera F.S. A',
      isHome: false,
      status: 'scheduled',
      records: {},
      createdAt: '2026-11-01T10:00:00Z',
    },
    {
      id: 'm-7',
      teamId: 'team-prec',
      round: 7,
      date: '2026-11-14',
      rival: 'Próximo rival',
      isHome: true,
      status: 'scheduled',
      records: {},
      createdAt: '2026-11-01T10:00:00Z',
    },
  ];

  return { teams, players, sessions, attendance, matches };
}
