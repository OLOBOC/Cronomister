function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

export function mergeAppendOnlyRecords(
  previous: unknown,
  incoming: unknown,
  ownerKey: string,
  ownerValue: string,
  allowAnyNewRecords: boolean
): unknown[] | null {
  if (!Array.isArray(incoming)) return null;
  const existing = Array.isArray(previous) ? previous : [];
  const records = new Map<string, unknown>();

  for (const entry of existing) {
    if (!entry || typeof entry !== 'object' || !('id' in entry)) return null;
    records.set(String((entry as { id: unknown }).id), entry);
  }
  for (const entry of incoming) {
    if (!entry || typeof entry !== 'object' || !('id' in entry)) return null;
    const record = entry as Record<string, unknown>;
    const id = String(record.id);
    const oldRecord = records.get(id);
    if (oldRecord) {
      if (stableStringify(oldRecord) !== stableStringify(record)) return null;
    } else {
      if (!allowAnyNewRecords && record[ownerKey] !== ownerValue) return null;
      records.set(id, record);
    }
  }
  return Array.from(records.values());
}
