import { describe, it, expect } from 'vitest';
import { calculateMinutesFromEvents } from './minuteEngine';
import { MatchEvent } from '@/types';

describe('Stopwatch Recovery & Screen Lock Resiliency Tests', () => {
  it('recupera con exactitud el minutaje de juego tras una suspensión/bloqueo de pantalla de 15 minutos en el móvil', () => {
    // Escenario de campo real:
    // El entrenador arranca el cronómetro a las 10:00:00 UTC.
    // A las 10:07:00 UTC (segundo 420), realiza una sustitución (Sale P1, Entra P2).
    // Inmediatamente después, el entrenador bloquea el móvil o se suspende la pantalla durante 15 minutos reales.
    // A las 10:22:00 UTC, enciende la pantalla. El reloj de juego debe reflejar exactamente el avance real sin haber perdido segundos.
    // Al finalizar la 1ª parte en el segundo 1500 (min 25:00):
    // P1 jugó 7 min (420 seg)
    // P2 jugó 18 min (1080 seg)

    const baseTime = new Date('2026-10-10T10:00:00.000Z').getTime();

    const events: MatchEvent[] = [
      {
        id: 'ev-start',
        matchId: 'm-screen-lock',
        period: 1,
        type: 'MATCH_START',
        matchSecond: 0,
        realTimestamp: new Date(baseTime).toISOString(),
        createdBy: 'entrenador',
      },
      {
        id: 'ev-sub-1',
        matchId: 'm-screen-lock',
        period: 1,
        type: 'SUBSTITUTION',
        playerOutId: 'player-1',
        playerInId: 'player-2',
        matchSecond: 420, // 7 min
        realTimestamp: new Date(baseTime + 7 * 60 * 1000).toISOString(),
        createdBy: 'entrenador',
      },
      // Durante el bloqueo de pantalla no se emiten ticks artificiales; el estado se recupera del delta UTC
      {
        id: 'ev-half-end',
        matchId: 'm-screen-lock',
        period: 1,
        type: 'HALF_END',
        matchSecond: 1500, // 25 min reglamentarios
        realTimestamp: new Date(baseTime + 25 * 60 * 1000).toISOString(),
        createdBy: 'entrenador',
      },
    ];

    const result = calculateMinutesFromEvents(events, ['player-1']);

    expect(result.playerSeconds['player-1']).toBe(420);
    expect(result.playerMinutes['player-1']).toBe(7);

    expect(result.playerSeconds['player-2']).toBe(1080);
    expect(result.playerMinutes['player-2']).toBe(18);

    // Suma total en la posición: 7 + 18 = 25 min exactos
    expect(result.playerMinutes['player-1'] + result.playerMinutes['player-2']).toBe(25);
  });

  it('no suma minutos de juego si el móvil estuvo suspendido durante un tiempo muerto o pausa por lesión', () => {
    // A las 10:10:00 UTC (segundo 600, min 10), se para el cronómetro por lesión de un niño.
    // El móvil se bloquea durante 8 minutos reales.
    // A las 10:18:00 UTC se reanuda el cronómetro en el segundo 600.
    // El tiempo reglamentario de partido NO debe sumar esos 8 minutos de pausa.
    const baseTime = new Date('2026-10-10T10:00:00.000Z').getTime();

    const events: MatchEvent[] = [
      {
        id: '1',
        matchId: 'm-injury',
        period: 1,
        type: 'MATCH_START',
        matchSecond: 0,
        realTimestamp: new Date(baseTime).toISOString(),
        createdBy: 'entrenador',
      },
      {
        id: '2',
        matchId: 'm-injury',
        period: 1,
        type: 'CLOCK_PAUSE',
        matchSecond: 600, // min 10
        realTimestamp: new Date(baseTime + 10 * 60 * 1000).toISOString(),
        createdBy: 'entrenador',
      },
      // 8 minutos de tiempo muerto/lesión real transcurridos
      {
        id: '3',
        matchId: 'm-injury',
        period: 1,
        type: 'CLOCK_RESUME',
        matchSecond: 600, // Reanuda en el mismo segundo de juego efectivo
        realTimestamp: new Date(baseTime + 18 * 60 * 1000).toISOString(),
        createdBy: 'entrenador',
      },
      {
        id: '4',
        matchId: 'm-injury',
        period: 1,
        type: 'HALF_END',
        matchSecond: 1500, // min 25
        realTimestamp: new Date(baseTime + 33 * 60 * 1000).toISOString(),
        createdBy: 'entrenador',
      },
    ];

    const result = calculateMinutesFromEvents(events, ['titular-1']);

    // Titular 1 debe tener exactamente 25 minutos reglamentarios jugados, descontando la pausa
    expect(result.playerSeconds['titular-1']).toBe(1500);
    expect(result.playerMinutes['titular-1']).toBe(25);
  });
});
