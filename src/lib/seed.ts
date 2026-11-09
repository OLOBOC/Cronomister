import { Team, Player, Match, TrainingSession, AttendanceRecord, UserProfile, MatchPlayerRecord } from '@/types';

export const SEED_USERS: UserProfile[] = [
  {
    id: 'user-coach-1',
    email: 'entrenador@mareo.es',
    name: 'Entrenador Principal',
    role: 'admin',
    status: 'active',
    teamIds: ['team-prec', 'team-debb', 'team-deba'],
    password: 'mareo2026', // Contraseña inicial para pruebas
  },
  {
    id: 'user-delegate-1',
    email: 'delegado@mareo.es',
    name: 'Delegado de Campo',
    role: 'delegate',
    status: 'active',
    teamIds: ['team-prec', 'team-deba'],
    password: 'mareo2026',
    permissionsByTeam: {
      'team-prec': {
        pass_attendance: true,
        edit_convocatoria: true,
        control_match: true,
        add_notes: true,
        edit_past_data: false,
        download_pdf: false,
        view_stats: false,
      },
      'team-deba': {
        pass_attendance: true,
        edit_convocatoria: true,
        control_match: true,
        add_notes: true,
        edit_past_data: false,
        download_pdf: false,
        view_stats: false,
      },
    },
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
      id: 'team-deba',
      name: 'Debutantes A',
      settings: {
        playersOnPitch: 5,
        halfDurationMinutes: 25,
        showPositions: false,
        trainingDays: [2, 4],
        isConfigured: true, // Calendario oficial cargado desde liga
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
  ];

  // Plantilla oficial Pre C (11 jugadores)
  const playersPrec: Player[] = [
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

  // Plantilla oficial Debutantes A (Nacidos 2021)
  const playersDebuA: Player[] = [
    { id: 'p-da-1', teamId: 'team-deba', dorsal: 1, firstName: 'Mateo', fullName: 'Mateo Fernández', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-da-2', teamId: 'team-deba', dorsal: 2, firstName: 'Lucas', fullName: 'Lucas García', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-da-3', teamId: 'team-deba', dorsal: 3, firstName: 'Leo', fullName: 'Leo Rodríguez', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-da-4', teamId: 'team-deba', dorsal: 4, firstName: 'Hugo', fullName: 'Hugo López', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-da-5', teamId: 'team-deba', dorsal: 5, firstName: 'Enzo', fullName: 'Enzo Martínez', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-da-6', teamId: 'team-deba', dorsal: 6, firstName: 'Martín', fullName: 'Martín Sánchez', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-da-7', teamId: 'team-deba', dorsal: 7, firstName: 'Daniel', fullName: 'Daniel Pérez', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
    { id: 'p-da-8', teamId: 'team-deba', dorsal: 8, firstName: 'Álex', fullName: 'Álex González', isActive: true, createdAt: '2026-09-01T00:00:00Z' },
  ];

  const players: Player[] = [...playersPrec, ...playersDebuA];

  // Generación de sesiones de martes y jueves desde 01/09/2026 hasta 26/11/2026
  const sessions: TrainingSession[] = [];
  const attendance: AttendanceRecord[] = [];

  const startDate = new Date('2026-09-01T12:00:00Z');
  const endDate = new Date('2026-11-26T12:00:00Z');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 2 || day === 4) {
      const dateStr = d.toISOString().slice(0, 10);

      // Sesión Pre C
      sessions.push({
        id: `prec-${dateStr}`,
        teamId: 'team-prec',
        date: dateStr,
        generalNote: dateStr === '2026-10-29' ? 'Entrenamiento de repliegue y saques de banda' : '',
        createdAt: d.toISOString(),
      });

      // Sesión Debutantes A
      sessions.push({
        id: `deba-${dateStr}`,
        teamId: 'team-deba',
        date: dateStr,
        generalNote: '',
        createdAt: d.toISOString(),
      });

      // Asistencia histórica para sesiones hasta 2026-11-05
      if (dateStr <= '2026-11-05') {
        playersPrec.forEach((p) => {
          let status: 'S' | 'A' | 'N' = 'S';
          let note = '';

          if (p.id === 'p-7') {
            if (dateStr === '2026-10-22' || dateStr === '2026-10-27' || dateStr === '2026-11-03') {
              status = 'N';
            } else if (dateStr === '2026-10-29') {
              status = 'A';
              note = 'Avisó por resfriado';
            }
          } else {
            if (dateStr === '2026-10-15' && (p.id === 'p-2' || p.id === 'p-4')) {
              status = 'A';
              note = 'Viaje familiar';
            }
          }

          attendance.push({
            id: `att-${dateStr}-${p.id}`,
            sessionId: `prec-${dateStr}`,
            playerId: p.id,
            status,
            note,
            updatedAt: d.toISOString(),
          });
        });

        // Asistencia Debutantes A
        playersDebuA.forEach((p) => {
          attendance.push({
            id: `att-${dateStr}-${p.id}`,
            sessionId: `deba-${dateStr}`,
            playerId: p.id,
            status: 'S',
            updatedAt: d.toISOString(),
          });
        });
      }
    }
  }

  // --- CALENDARIO OFICIAL COMPLETO DEL PRE C (30 JORNADAS de prec.txt) ---
  // Escuela Futbol Mareo "C"
  const rawPrecMatches: Array<{
    round: number;
    date: string;
    rival: string;
    isHome: boolean;
    scoreMareo?: number;
    scoreRival?: number;
    status: 'finished' | 'scheduled';
    generalNote?: string;
  }> = [
    // Primera Vuelta
    { round: 1, date: '2026-10-03', rival: 'C.D. Montevil "A"', isHome: true, scoreMareo: 2, scoreRival: 2, status: 'finished', generalNote: 'Buen inicio de liga.' },
    { round: 2, date: '2026-10-10', rival: 'C.D. Virgen Inmaculada "A"', isHome: false, scoreMareo: 5, scoreRival: 5, status: 'finished', generalNote: 'Partido de ida muy disputado.' },
    { round: 3, date: '2026-10-17', rival: 'C.D. Lealtad de Villaviciosa "C"', isHome: true, scoreMareo: 9, scoreRival: 0, status: 'finished', generalNote: 'Gran victoria combinativa.' },
    { round: 4, date: '2026-10-24', rival: 'Gijón Fútbol Femenino "A"', isHome: false, scoreMareo: 1, scoreRival: 0, status: 'finished', generalNote: 'Victoria a domicilio sin encajar goles.' },
    { round: 5, date: '2026-10-31', rival: 'C.D. Manuel Rubio "B"', isHome: true, scoreMareo: 5, scoreRival: 3, status: 'finished', generalNote: 'Gran presión arriba.' },
    { round: 6, date: '2026-11-07', rival: 'C.D. Gijón Perchera F.S. "A"', isHome: false, scoreMareo: 3, scoreRival: 0, status: 'finished', generalNote: 'Victoria a domicilio 0-3.' },
    { round: 7, date: '2026-11-14', rival: 'Codema "C"', isHome: true, status: 'scheduled' },
    { round: 8, date: '2026-11-21', rival: 'Asunción C.F. "C"', isHome: false, status: 'scheduled' },
    { round: 9, date: '2026-11-28', rival: 'Asunción C.F. "F"', isHome: true, status: 'scheduled' },
    { round: 10, date: '2026-12-05', rival: 'Cimadevilla C.F. "A"', isHome: false, status: 'scheduled' },
    { round: 11, date: '2026-12-12', rival: 'Fabril C.D. "B"', isHome: true, status: 'scheduled' },
    { round: 12, date: '2026-12-19', rival: 'S.D.At. Camocha "B"', isHome: false, status: 'scheduled' },
    { round: 13, date: '2027-01-09', rival: 'C.D. N. Sra. Covadonga Roces "B"', isHome: true, status: 'scheduled' },
    { round: 14, date: '2027-01-16', rival: 'E.F. Viesques-Jesús Uribe "C"', isHome: true, status: 'scheduled' },
    { round: 15, date: '2027-01-23', rival: 'C.D. Arenal "B"', isHome: false, status: 'scheduled' },
    // Segunda Vuelta
    { round: 16, date: '2027-01-30', rival: 'C.D. Montevil "A"', isHome: false, status: 'scheduled' },
    { round: 17, date: '2027-02-06', rival: 'C.D. Virgen Inmaculada "A"', isHome: true, status: 'scheduled' },
    { round: 18, date: '2027-02-13', rival: 'C.D. Lealtad de Villaviciosa "C"', isHome: false, status: 'scheduled' },
    { round: 19, date: '2027-02-20', rival: 'Gijón Fútbol Femenino "A"', isHome: true, status: 'scheduled' },
    { round: 20, date: '2027-02-27', rival: 'C.D. Manuel Rubio "B"', isHome: false, status: 'scheduled' },
    { round: 21, date: '2027-03-06', rival: 'C.D. Gijón Perchera F.S. "A"', isHome: true, status: 'scheduled' },
    { round: 22, date: '2027-03-13', rival: 'Codema "C"', isHome: false, status: 'scheduled' },
    { round: 23, date: '2027-04-03', rival: 'Asunción C.F. "C"', isHome: true, status: 'scheduled' },
    { round: 24, date: '2027-04-10', rival: 'Asunción C.F. "F"', isHome: false, status: 'scheduled' },
    { round: 25, date: '2027-04-17', rival: 'Cimadevilla C.F. "A"', isHome: true, status: 'scheduled' },
    { round: 26, date: '2027-04-24', rival: 'Fabril C.D. "B"', isHome: false, status: 'scheduled' },
    { round: 27, date: '2027-05-08', rival: 'S.D.At. Camocha "B"', isHome: true, status: 'scheduled' },
    { round: 28, date: '2027-05-15', rival: 'C.D. N. Sra. Covadonga Roces "B"', isHome: false, status: 'scheduled' },
    { round: 29, date: '2027-05-22', rival: 'E.F. Viesques-Jesús Uribe "C"', isHome: false, status: 'scheduled' },
    { round: 30, date: '2027-05-29', rival: 'C.D. Arenal "B"', isHome: true, status: 'scheduled' },
  ];

  const matchesPrec: Match[] = rawPrecMatches.map((m) => {
    const matchId = `m-prec-${m.round}`;
    const records: Record<string, MatchPlayerRecord> = {};

    return {
      id: matchId,
      teamId: 'team-prec',
      round: m.round,
      date: m.date,
      rival: m.rival,
      isHome: m.isHome,
      matchType: 'league',
      scoreMareo: m.scoreMareo,
      scoreRival: m.scoreRival,
      status: m.status,
      generalNote: m.generalNote || '',
      records,
      createdAt: `${m.date}T10:00:00Z`,
    };
  });

  // Partido de Torneo para Pre C
  matchesPrec.push({
    id: 'm-prec-torneo-1',
    teamId: 'team-prec',
    round: 1,
    date: '2026-12-27',
    rival: 'Real Oviedo Prebenjamín',
    isHome: false,
    matchType: 'tournament',
    tournamentName: 'Torneo Solidario de Navidad Mareo',
    status: 'scheduled',
    generalNote: 'Fase eliminatoria del torneo navideño',
    records: {},
    createdAt: '2026-11-01T10:00:00Z',
  });

  // --- CALENDARIO OFICIAL COMPLETO DE DEBUTANTES A (de debuA.txt) ---
  // ESCUELA FÚTBOL MAREO NACIDOS 2021 "A"
  const rawDebuAMatches: Array<{
    round: number;
    date: string;
    rival: string;
    isHome: boolean;
  }> = [
    { round: 1, date: '2026-11-13', rival: 'TSK Roces Nacidos 2021 "B"', isHome: false },
    { round: 2, date: '2026-11-20', rival: 'Asunción C.F. Nacidos 2021 "A"', isHome: true },
    { round: 3, date: '2026-11-27', rival: 'Asunción C.F. Nacidos 2021 "C"', isHome: false },
    { round: 4, date: '2026-12-11', rival: 'Descansa (Jornada Libre)', isHome: true },
    { round: 5, date: '2026-12-18', rival: 'S.D. Llano 2.000 Nacidos 2021 "A"', isHome: true },
    { round: 6, date: '2027-01-15', rival: 'U.D. Gijón Industrial Nacidos 2021 "B"', isHome: false },
    { round: 7, date: '2027-01-22', rival: 'C.D. Montevil Nacidos 2021 "B"', isHome: true },
    { round: 8, date: '2027-01-29', rival: 'Codema Nacidos 2021 "A"', isHome: false },
    { round: 9, date: '2027-02-12', rival: 'S.D. At. Camocha Nacidos 2021 "A"', isHome: true },
  ];

  const matchesDebuA: Match[] = rawDebuAMatches.map((m) => ({
    id: `m-deba-${m.round}`,
    teamId: 'team-deba',
    round: m.round,
    date: m.date,
    rival: m.rival,
    isHome: m.isHome,
    matchType: 'league',
    status: 'scheduled',
    records: {},
    createdAt: `${m.date}T10:00:00Z`,
  }));

  // Partido de Torneo para Debutantes A
  matchesDebuA.push({
    id: 'm-deba-torneo-1',
    teamId: 'team-deba',
    round: 1,
    date: '2027-01-03',
    rival: 'Sporting Biberón',
    isHome: true,
    matchType: 'tournament',
    tournamentName: 'Mareo Cup Debutantes 2021',
    status: 'scheduled',
    generalNote: 'Partido de exhibición en campos de Mareo',
    records: {},
    createdAt: '2026-11-01T10:00:00Z',
  });

  const matches = [...matchesPrec, ...matchesDebuA];

  return { teams, players, sessions, attendance, matches };
}
