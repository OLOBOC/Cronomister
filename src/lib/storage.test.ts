import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Match, MatchPlayerRecord } from '@/types';
import { getInitialSeedData } from './seed';
import { addMatch, getMatches, initStore, saveManualMatchSheet } from './storage';
import { mergeTeamMatches } from './cloudMerge';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

describe('Match storage', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { addEventListener: vi.fn() });
    vi.stubGlobal('localStorage', new MemoryStorage());
    initStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates distinct matches even when the clock returns the same ID value', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'same-id' });

    const first = addMatch(
      { round: 1, date: '2026-11-17', rival: 'Rival 1', isHome: true },
      'team-deba'
    );
    const second = addMatch(
      { round: 2, date: '2026-11-24', rival: 'Rival 2', isHome: false },
      'team-deba'
    );

    expect(second.id).not.toBe(first.id);
    expect(getMatches('team-deba').map((match) => match.id)).toContain(first.id);
    expect(getMatches('team-deba').map((match) => match.id)).toContain(second.id);
  });

  it('saves the manual match sheet and finished status together', () => {
    const match = addMatch(
      { round: 1, date: '2026-10-03', rival: 'Rival', isHome: true },
      'team-deba'
    );
    const record: MatchPlayerRecord = {
      playerId: 'p-da-1',
      status: 'J',
      isStarter: true,
      minutes: 32,
      source: 'manual',
    };

    expect(saveManualMatchSheet(match.id, {
      status: 'finished',
      scoreMareo: 2,
      scoreRival: 1,
      records: { [record.playerId]: record },
    })).toBe(true);

    const saved = getMatches('team-deba').find((item) => item.id === match.id);
    expect(saved).toMatchObject({
      status: 'finished',
      scoreMareo: 2,
      scoreRival: 1,
      records: { 'p-da-1': record },
    });
  });

  it('keeps historical match records and custom prefixed matches during store upgrades', () => {
    const seed = getInitialSeedData();
    const historicalRecord: MatchPlayerRecord = {
      playerId: 'p-1',
      status: 'J',
      isStarter: true,
      minutes: 24,
      source: 'manual',
    };
    const customMatch: Match = {
      id: 'm-prec-custom',
      teamId: 'team-prec',
      round: 31,
      date: '2026-10-11',
      rival: 'Partido personalizado',
      isHome: false,
      status: 'finished',
      records: {},
      createdAt: '2026-10-11T10:00:00Z',
    };
    const matches = seed.matches.map((match) => (
      match.id === 'm-prec-8'
        ? { ...match, records: { 'p-1': historicalRecord } }
        : match
    ));
    matches.push(customMatch);

    localStorage.setItem('cronomister_matches', JSON.stringify(matches));
    localStorage.setItem('cronomister_store_version', 'cronomister_v6_delegate_alvaro');
    localStorage.setItem('cronomister_attendance', JSON.stringify([{ id: 'existing-attendance' }]));
    localStorage.setItem('cronomister_current_user_id', JSON.stringify('user-coach-1'));

    initStore();

    const saved = getMatches('team-prec');
    expect(saved.find((match) => match.id === 'm-prec-8')?.records['p-1']).toEqual(historicalRecord);
    expect(saved.some((match) => match.id === customMatch.id)).toBe(true);
    expect(localStorage.getItem('cronomister_attendance')).toBe(JSON.stringify([{ id: 'existing-attendance' }]));
    expect(localStorage.getItem('cronomister_current_user_id')).toBe(JSON.stringify('user-coach-1'));
  });

  it('sets both Debutantes teams to 20 minutes per half without changing other teams', () => {
    const seedTeams = getInitialSeedData().teams;
    expect(seedTeams.find((team) => team.id === 'team-deba')?.settings.halfDurationMinutes).toBe(20);
    expect(seedTeams.find((team) => team.id === 'team-debb')?.settings.halfDurationMinutes).toBe(20);

    const teams = seedTeams.map((team) => ({
      ...team,
      settings: { ...team.settings, halfDurationMinutes: 25 },
    }));
    localStorage.setItem('cronomister_teams', JSON.stringify(teams));
    localStorage.removeItem('cronomister_debutantes_20_minute_halves_v1');

    initStore();

    const savedTeams = JSON.parse(localStorage.getItem('cronomister_teams') || '[]') as typeof teams;
    expect(savedTeams.find((team) => team.id === 'team-deba')?.settings.halfDurationMinutes).toBe(20);
    expect(savedTeams.find((team) => team.id === 'team-debb')?.settings.halfDurationMinutes).toBe(20);
    expect(savedTeams.find((team) => team.id === 'team-prec')?.settings.halfDurationMinutes).toBe(25);
  });

  it('keeps local matches missing from the cloud while applying cloud updates without duplicates', () => {
    const localMatches = getInitialSeedData().matches;
    const localOnlyMatch: Match = {
      id: 'm-local-only',
      teamId: 'team-deba',
      round: 10,
      date: '2027-03-01',
      rival: 'Partido guardado localmente',
      isHome: false,
      status: 'scheduled',
      records: {},
      createdAt: '2027-02-01T10:00:00Z',
    };
    const updatedCloudMatch = {
      ...localMatches.find((match) => match.id === 'm-deba-1')!,
      status: 'finished' as const,
    };

    const merged = mergeTeamMatches(
      [...localMatches, localOnlyMatch],
      'team-deba',
      [updatedCloudMatch]
    );

    expect(merged.filter((match) => match.teamId === 'team-deba')).toHaveLength(11);
    expect(merged.find((match) => match.id === localOnlyMatch.id)).toEqual(localOnlyMatch);
    expect(merged.find((match) => match.id === updatedCloudMatch.id)?.status).toBe('finished');
    expect(merged.filter((match) => match.id === updatedCloudMatch.id)).toHaveLength(1);
    expect(merged.some((match) => match.teamId === 'team-prec')).toBe(true);
  });
});
