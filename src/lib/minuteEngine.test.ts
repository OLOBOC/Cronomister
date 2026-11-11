import { describe, it, expect } from 'vitest';
import { calculateMinutesFromEvents, calculatePlayerKPIs } from './minuteEngine';
import { MatchEvent, MatchPlayerRecord } from '@/types';

describe('Minute Engine - Event Based Calculation', () => {
  it('cumple la prueba obligatoria: titular sale al min 8, entra otro, a los 5 min vuelve a entrar el titular', () => {
    // Escenario obligatorio:
    // Parte de 25 min (1500 segundos).
    // Jugador A (p-A) titular entra en t=0 (segundo 0).
    // En t=480 (min 8:00): Sale p-A, entra p-B.
    // En t=780 (min 13:00, 5 min después): Sale p-B, vuelve a entrar p-A.
    // En t=1500 (min 25:00): Fin de la 1ª parte.
    // Resultado esperado:
    // p-A: 8 min + (25 - 13) min = 20 min (1200 seg).
    // p-B: 5 min (300 seg).

    const events: MatchEvent[] = [
      {
        id: 'ev-1',
        matchId: 'm-test',
        period: 1,
        type: 'MATCH_START',
        matchSecond: 0,
        realTimestamp: '2026-10-01T10:00:00Z',
        createdBy: 'u1',
      },
      {
        id: 'ev-2',
        matchId: 'm-test',
        period: 1,
        type: 'SUBSTITUTION',
        playerOutId: 'p-A',
        playerInId: 'p-B',
        matchSecond: 480, // min 8
        realTimestamp: '2026-10-01T10:08:00Z',
        createdBy: 'u1',
      },
      {
        id: 'ev-3',
        matchId: 'm-test',
        period: 1,
        type: 'SUBSTITUTION',
        playerOutId: 'p-B',
        playerInId: 'p-A',
        matchSecond: 780, // min 13 (8 + 5)
        realTimestamp: '2026-10-01T10:13:00Z',
        createdBy: 'u1',
      },
      {
        id: 'ev-4',
        matchId: 'm-test',
        period: 1,
        type: 'HALF_END',
        matchSecond: 1500, // min 25
        realTimestamp: '2026-10-01T10:25:00Z',
        createdBy: 'u1',
      },
    ];

    const result = calculateMinutesFromEvents(events, ['p-A']);

    expect(result.playerSeconds['p-A']).toBe(1200); // 480 + (1500 - 780) = 480 + 720 = 1200 seg
    expect(result.playerMinutes['p-A']).toBe(20);

    expect(result.playerSeconds['p-B']).toBe(300);  // 780 - 480 = 300 seg
    expect(result.playerMinutes['p-B']).toBe(5);
  });

  it('descuenta correctamente los tiempos de pausa por lesión o tiempo muerto', () => {
    // Titular juega desde seg 0 hasta seg 600 (min 10).
    // En seg 300 (min 5), pausa de 2 minutos que no debe contar como tiempo de juego.
    // Pausa en seg 300, reanudación en seg 300 (el reloj de partido no avanza durante la pausa).
    const events: MatchEvent[] = [
      { id: '1', matchId: 'm', period: 1, type: 'MATCH_START', matchSecond: 0, realTimestamp: '2026-10-01T10:00:00Z', createdBy: 'u1' },
      { id: '2', matchId: 'm', period: 1, type: 'CLOCK_PAUSE', matchSecond: 300, realTimestamp: '2026-10-01T10:05:00Z', createdBy: 'u1' },
      { id: '3', matchId: 'm', period: 1, type: 'CLOCK_RESUME', matchSecond: 300, realTimestamp: '2026-10-01T10:07:00Z', createdBy: 'u1' },
      { id: '4', matchId: 'm', period: 1, type: 'HALF_END', matchSecond: 1500, realTimestamp: '2026-10-01T10:27:00Z', createdBy: 'u1' },
    ];

    const result = calculateMinutesFromEvents(events, ['p-1']);
    expect(result.playerSeconds['p-1']).toBe(1500);
    expect(result.playerMinutes['p-1']).toBe(25);
  });

  it('calcula correctamente los KPIs del jugador según las reglas oficiales', () => {
    const matches = [
      {
        id: 'm-test-1',
        date: '2026-11-09',
        isFinished: true,
        records: {
          'p-1': { playerId: 'p-1', status: 'J' as const, isStarter: true, minutes: 35, source: 'direct' as const },
        },
      },
      {
        id: 'm-test-2',
        date: '2026-11-10',
        isFinished: true,
        records: {
          'p-1': { playerId: 'p-1', status: 'X' as const, isStarter: false, minutes: 0, source: 'manual' as const },
        },
      },
      {
        id: 'm-test-3',
        date: '2026-11-11',
        isFinished: true,
        records: {
          'p-1': { playerId: 'p-1', status: 'J' as const, isStarter: false, minutes: 25, source: 'direct' as const },
        },
      },
    ];

    const attendance = [
      { playerId: 'p-1', sessionId: '2026-11-09', status: 'S' as const },
      { playerId: 'p-1', sessionId: '2026-11-10', status: 'S' as const },
      { playerId: 'p-1', sessionId: '2026-11-11', status: 'A' as const },
      { playerId: 'p-1', sessionId: '2026-11-12', status: 'N' as const },
    ];

    // Duración partido = 50 min
    // Partidos con registro: 2 jugados (1 titular, 1 suplente) + 1 no vino = 3 total, 2 jugados
    // Minutos totales: 35 + 25 = 60
    // Media por partido jugado: 60 / 2 = 30 min
    // % del tiempo disputado: 60 / (2 * 50) = 60 / 100 = 60%
    // % asistencia: 2 / 4 = 50%
    const kpis = calculatePlayerKPIs('p-1', matches, attendance, 50);

    expect(kpis.matchesTotal).toBe(3);
    expect(kpis.matchesAttended).toBe(2);
    expect(kpis.matchesAsStarter).toBe(1);
    expect(kpis.totalMinutes).toBe(60);
    expect(kpis.averageMinutesPerMatch).toBe(30);
    expect(kpis.percentMatchTime).toBe(0.6);
    expect(kpis.attendanceCount.attended).toBe(2);
    expect(kpis.attendanceCount.excused).toBe(1);
    expect(kpis.attendanceCount.unexcused).toBe(1);
    expect(kpis.attendanceCount.totalSessions).toBe(4);
    expect(kpis.attendancePercent).toBe(0.5);
  });

  it('excludes matches before the stats start date but includes Perchera for later minute entry', () => {
    const records = {
      'p-1': { playerId: 'p-1', status: 'J' as const, isStarter: true, minutes: 30, source: 'manual' as const },
    };
    const matches = [
      { id: 'm-prec-1', date: '2026-10-03', isFinished: true, records },
      { id: 'm-prec-6', date: '2026-11-07', isFinished: true, records },
      { id: 'm-next', date: '2026-11-14', isFinished: false, records },
    ];

    const kpis = calculatePlayerKPIs('p-1', matches, [], 50);

    expect(kpis.matchesTotal).toBe(2);
    expect(kpis.matchesAttended).toBe(2);
    expect(kpis.totalMinutes).toBe(60);
    expect(kpis.averageMinutesPerMatch).toBe(30);
  });

  it('counts old training attendance only for Aitor as an individual historical exception', () => {
    const attendance = [
      { playerId: 'p-1', sessionId: '2026-10-01', status: 'S' as const },
      { playerId: 'p-8', sessionId: 'prec-2026-10-01', status: 'S' as const },
      { playerId: 'p-8', sessionId: '2026-11-09', status: 'A' as const },
    ];

    const regularPlayer = calculatePlayerKPIs('p-1', [], attendance, 50);
    const aitor = calculatePlayerKPIs('p-8', [], attendance, 50);

    expect(regularPlayer.attendanceCount.totalSessions).toBe(0);
    expect(aitor.attendanceCount.attended).toBe(1);
    expect(aitor.attendanceCount.excused).toBe(1);
    expect(aitor.attendanceCount.totalSessions).toBe(2);
  });

  it('includes Aitor historical match tracking while excluding the same matches for other players', () => {
    const matches = [
      {
        id: 'm-prec-1',
        date: '2026-10-03',
        isFinished: true,
        records: {
          'p-8': { playerId: 'p-8', status: 'J' as const, isStarter: true, minutes: 35, source: 'manual' as const },
          'p-1': { playerId: 'p-1', status: 'J' as const, isStarter: true, minutes: 35, source: 'manual' as const },
        },
      },
      {
        id: 'm-prec-2',
        date: '2026-10-10',
        isFinished: true,
        records: {
          'p-8': { playerId: 'p-8', status: 'X' as const, isStarter: false, minutes: 0, source: 'manual' as const },
          'p-1': { playerId: 'p-1', status: 'J' as const, isStarter: true, minutes: 30, source: 'manual' as const },
        },
      },
      ...[3, 4, 5].map((round, index) => ({
        id: `m-prec-${round}`,
        date: `2026-10-${17 + index * 7}`,
        isFinished: true,
        records: {
          'p-8': {
            playerId: 'p-8',
            status: 'J' as const,
            isStarter: false,
            minutes: [29, 20, 25][index],
            source: 'manual' as const,
          },
        },
      })),
    ];

    const aitor = calculatePlayerKPIs('p-8', matches, [], 50);
    const otherPlayer = calculatePlayerKPIs('p-1', matches, [], 50);

    expect(aitor.matchesTotal).toBe(5);
    expect(aitor.matchesAttended).toBe(4);
    expect(aitor.totalMinutes).toBe(109);
    expect(aitor.averageMinutesPerMatch).toBe(27.25);
    expect(otherPlayer.matchesTotal).toBe(0);
  });

  it('Debutantes A: las asistencias cuentan estrictamente a partir de 2026-11-12 y partidos a partir de 2026-11-13', () => {
    const nicolasId = 'p-da-nicolas';
    const attendance = [
      // Sesión de octubre (antes de fecha inicio): NO debe computar
      { playerId: nicolasId, sessionId: 'deba-2026-10-15', status: 'S' as const },
      // Sesión del 10 de noviembre: NO debe computar
      { playerId: nicolasId, sessionId: 'deba-2026-11-10', status: 'A' as const },
      // Sesión del jueves 12 de noviembre (mañana): SÍ computa
      { playerId: nicolasId, sessionId: 'deba-2026-11-12', status: 'S' as const },
      // Sesión del martes 17 de noviembre: SÍ computa
      { playerId: nicolasId, sessionId: 'deba-2026-11-17', status: 'A' as const },
    ];

    const matches = [
      // Partido anterior ficticio: NO computa
      {
        id: 'm-deba-pre',
        date: '2026-11-06',
        teamId: 'team-deba',
        isFinished: true,
        records: {
          [nicolasId]: { playerId: nicolasId, status: 'J' as const, isStarter: true, minutes: 25, source: 'manual' as const },
        },
      },
      // Partido del viernes 13 de noviembre (J1 oficial): SÍ computa
      {
        id: 'm-deba-1',
        date: '2026-11-13',
        teamId: 'team-deba',
        isFinished: true,
        records: {
          [nicolasId]: { playerId: nicolasId, status: 'J' as const, isStarter: true, minutes: 20, source: 'manual' as const },
        },
      },
    ];

    const kpis = calculatePlayerKPIs(nicolasId, matches, attendance, 50);

    // Solo 2 entrenos posteriores o iguales al 12/11/2026
    expect(kpis.attendanceCount.totalSessions).toBe(2);
    expect(kpis.attendanceCount.attended).toBe(1);
    expect(kpis.attendanceCount.excused).toBe(1);
    expect(kpis.attendancePercent).toBe(0.5);

    // Solo el partido del 13/11/2026
    expect(kpis.matchesTotal).toBe(1);
    expect(kpis.matchesAttended).toBe(1);
    expect(kpis.totalMinutes).toBe(20);
  });

  it('jugador de doble equipo (Pre C y Debutantes A): las faltas NO cuentan por dos en el mismo día', () => {
    // Martín Álvarez: p-4 en Pre C y p-da-martin-alvarez en Debutantes A
    const martinPrecId = 'p-4';
    const martinDebaId = 'p-da-martin-alvarez';

    // Caso 1: En la misma fecha (2026-11-12), entrena con Pre C ('S') pero en Debutantes A no está ('N').
    // Debe computar como ASISTIÓ ('S'), 0 faltas.
    const attCaso1 = [
      { playerId: martinPrecId, sessionId: 'prec-2026-11-12', status: 'S' as const },
      { playerId: martinDebaId, sessionId: 'deba-2026-11-12', status: 'N' as const },
    ];
    const kpisCaso1 = calculatePlayerKPIs(martinDebaId, [], attCaso1, 50);
    expect(kpisCaso1.attendanceCount.totalSessions).toBe(1);
    expect(kpisCaso1.attendanceCount.attended).toBe(1);
    expect(kpisCaso1.attendanceCount.unexcused).toBe(0);
    expect(kpisCaso1.attendanceCount.excused).toBe(0);

    // Caso 2: Falta justificada en ambos equipos el mismo día (2026-11-12).
    // NO debe contar como 2 faltas, sino como 1 sola falta avisada.
    const attCaso2 = [
      { playerId: martinPrecId, sessionId: 'prec-2026-11-12', status: 'A' as const },
      { playerId: martinDebaId, sessionId: 'deba-2026-11-12', status: 'A' as const },
    ];
    const kpisCaso2 = calculatePlayerKPIs(martinPrecId, [], attCaso2, 50);
    expect(kpisCaso2.attendanceCount.totalSessions).toBe(1);
    expect(kpisCaso2.attendanceCount.attended).toBe(0);
    expect(kpisCaso2.attendanceCount.excused).toBe(1);
    expect(kpisCaso2.attendanceCount.unexcused).toBe(0);

    // Caso 3: En un equipo avisa ('A') y en otro no avisa ('N') el mismo día (2026-11-12).
    // Cuenta como 1 falta avisada ('A'), nunca 2 faltas.
    const attCaso3 = [
      { playerId: martinPrecId, sessionId: 'prec-2026-11-12', status: 'A' as const },
      { playerId: martinDebaId, sessionId: 'deba-2026-11-12', status: 'N' as const },
    ];
    const kpisCaso3 = calculatePlayerKPIs(martinDebaId, [], attCaso3, 50);
    expect(kpisCaso3.attendanceCount.totalSessions).toBe(1);
    expect(kpisCaso3.attendanceCount.excused).toBe(1);
    expect(kpisCaso3.attendanceCount.unexcused).toBe(0);

    // Caso 4: En dos fechas distintas (12/11 y 17/11)
    // 12/11: Falta avisada en ambos -> 1 falta avisada
    // 17/11: Asistió en Pre C ('S') y 'N' en Debutantes -> Asistió
    const attCaso4 = [
      { playerId: martinPrecId, sessionId: 'prec-2026-11-12', status: 'A' as const },
      { playerId: martinDebaId, sessionId: 'deba-2026-11-12', status: 'A' as const },
      { playerId: martinPrecId, sessionId: 'prec-2026-11-17', status: 'S' as const },
      { playerId: martinDebaId, sessionId: 'deba-2026-11-17', status: 'N' as const },
    ];
    const kpisCaso4 = calculatePlayerKPIs(martinPrecId, [], attCaso4, 50);
    expect(kpisCaso4.attendanceCount.totalSessions).toBe(2);
    expect(kpisCaso4.attendanceCount.attended).toBe(1);
    expect(kpisCaso4.attendanceCount.excused).toBe(1);
    expect(kpisCaso4.attendanceCount.unexcused).toBe(0);
    expect(kpisCaso4.attendancePercent).toBe(0.5);
  });

  it('jugador de doble equipo: acumula minutos de partidos jugados con ambos equipos', () => {
    const martinPrecId = 'p-4';
    const martinDebaId = 'p-da-martin-alvarez';

    const matches: Array<{
      id: string;
      date: string;
      teamId: string;
      isFinished: boolean;
      records: Record<string, MatchPlayerRecord>;
    }> = [
      // Viernes 13/11: Convocado con Debutantes A (J1)
      {
        id: 'm-deba-1',
        date: '2026-11-13',
        teamId: 'team-deba',
        isFinished: true,
        records: {
          [martinDebaId]: { playerId: martinDebaId, status: 'J', isStarter: true, minutes: 20, source: 'manual' },
        },
      },
      // Sábado 14/11: Convocado con Pre C (J7 Codema)
      {
        id: 'm-prec-7',
        date: '2026-11-14',
        teamId: 'team-prec',
        isFinished: true,
        records: {
          [martinPrecId]: { playerId: martinPrecId, status: 'J', isStarter: false, minutes: 25, source: 'manual' },
        },
      },
    ];

    const kpis = calculatePlayerKPIs(martinDebaId, matches, [], 50);
    expect(kpis.matchesTotal).toBe(2);
    expect(kpis.matchesAttended).toBe(2);
    expect(kpis.matchesAsStarter).toBe(1);
    expect(kpis.totalMinutes).toBe(45); // 20 + 25 = 45 min
  });
});
