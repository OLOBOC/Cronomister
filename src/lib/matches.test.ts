import { describe, it, expect, beforeEach } from 'vitest';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

// Polyfill window y localStorage en Node
// @ts-expect-error Mock for tests
globalThis.localStorage = localStorageMock;
// @ts-expect-error Mock for tests
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};

import {
  initStore,
  getMatches,
  updateMatch,
  deleteMatch,
  getPlayers,
  updatePlayer,
  deletePlayer,
  setCurrentUser,
} from './storage';

describe('Gestión y edición de partidos y jugadores', () => {
  beforeEach(() => {
    localStorageMock.clear();
    initStore();
    setCurrentUser('user-coach-1'); // Admin
  });

  it('permite actualizar un partido y restablecerlo a pendiente eliminando el marcador', () => {
    const matches = getMatches('team-prec');
    expect(matches.length).toBeGreaterThan(0);

    const match = matches[0];
    // Primero simular que se guardó finalizado con marcador
    updateMatch(match.id, {
      status: 'finished',
      scoreMareo: 3,
      scoreRival: 1,
    });

    let updatedList = getMatches('team-prec');
    let target = updatedList.find((m) => m.id === match.id);
    expect(target?.status).toBe('finished');
    expect(target?.scoreMareo).toBe(3);
    expect(target?.scoreRival).toBe(1);

    // Ahora restablecer a pendiente eliminando el marcador
    updateMatch(match.id, {
      status: 'scheduled',
      scoreMareo: null,
      scoreRival: null,
    });

    updatedList = getMatches('team-prec');
    target = updatedList.find((m) => m.id === match.id);
    expect(target?.status).toBe('scheduled');
    expect(target?.scoreMareo).toBeUndefined();
    expect(target?.scoreRival).toBeUndefined();
  });

  it('permite eliminar un partido de la lista', () => {
    const initialMatches = getMatches('team-prec');
    const matchToDelete = initialMatches[initialMatches.length - 1];

    const result = deleteMatch(matchToDelete.id);
    expect(result).toBe(true);

    const finalMatches = getMatches('team-prec');
    expect(finalMatches.find((m) => m.id === matchToDelete.id)).toBeUndefined();
    expect(finalMatches.length).toBe(initialMatches.length - 1);
  });

  it('permite modificar los datos de un jugador', () => {
    const players = getPlayers('team-prec');
    expect(players.length).toBeGreaterThan(0);
    const player = players[0];

    const updated = updatePlayer(player.id, {
      fullName: 'Pelayo Modificado',
      dorsal: 99,
      position: 'Portero',
    });
    expect(updated).toBe(true);

    const reloaded = getPlayers('team-prec').find((p) => p.id === player.id);
    expect(reloaded?.fullName).toBe('Pelayo Modificado');
    expect(reloaded?.dorsal).toBe(99);
    expect(reloaded?.position).toBe('Portero');
  });

  it('permite eliminar un jugador de la plantilla', () => {
    const initialPlayers = getPlayers('team-prec');
    const playerToDelete = initialPlayers[0];

    const deleted = deletePlayer(playerToDelete.id);
    expect(deleted).toBe(true);

    const finalPlayers = getPlayers('team-prec');
    expect(finalPlayers.find((p) => p.id === playerToDelete.id)).toBeUndefined();
    expect(finalPlayers.length).toBe(initialPlayers.length - 1);
  });
});
