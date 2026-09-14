/** Legacy browser records are reminders, never evidence of a provider booking. */
export interface LocalBookingRecord {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  status: string;
}

export function readLocalBookingRecords(raw: string | null, userId: string): {
  records: LocalBookingRecord[];
  unreadable: boolean;
} {
  if (!raw) return { records: [], unreadable: false };
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return { records: [], unreadable: true };
    const records = value.filter((item): item is LocalBookingRecord => (
      item !== null && typeof item === 'object' && item.user_id === userId &&
      typeof item.id === 'string' && typeof item.title === 'string' &&
      typeof item.start_time === 'string' && Number.isFinite(Date.parse(item.start_time)) &&
      typeof item.status === 'string'
    ));
    return {
      records: records.sort((a, b) => Date.parse(b.start_time) - Date.parse(a.start_time)),
      unreadable: records.length !== value.length,
    };
  } catch {
    return { records: [], unreadable: true };
  }
}
