import { describe, expect, it } from 'vitest';
import { mergeAppendOnlyRecords } from './appendOnly';

describe('mergeAppendOnlyRecords', () => {
  it('retains existing records omitted by a stale device and appends the current user record', () => {
    const previous = [{ id: 'existing', userId: 'other-user', action: 'legacy' }];
    const incoming = [{ id: 'new', userId: 'current-user', action: 'attendance' }];

    expect(mergeAppendOnlyRecords(previous, incoming, 'userId', 'current-user', false)).toEqual([
      ...previous,
      ...incoming,
    ]);
  });

  it('rejects edits to an existing record', () => {
    const previous = [{ id: 'existing', userId: 'current-user', action: 'original' }];
    const incoming = [{ id: 'existing', userId: 'current-user', action: 'changed' }];

    expect(mergeAppendOnlyRecords(previous, incoming, 'userId', 'current-user', false)).toBeNull();
  });

  it('rejects a new record attributed to someone else', () => {
    const incoming = [{ id: 'forged', userId: 'other-user', action: 'forged' }];

    expect(mergeAppendOnlyRecords([], incoming, 'userId', 'current-user', false)).toBeNull();
  });
});
