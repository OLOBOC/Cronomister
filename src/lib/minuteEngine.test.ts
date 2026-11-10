import { describe, it, expect } from 'vitest';
import { calculateMinutesFromEvents, calculatePlayerKPIs } from './minuteEngine';
import { MatchEvent } from '@/types';

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
});
