import { readLocalBookingRecords } from '@/lib/local-booking-records';

const record = { id: 'b1', user_id: 'member-a', title: 'Session with coach', start_time: '2026-09-16T09:00:00', status: 'booked' };

describe('legacy browser booking records', () => {
  it('reads only records owned by the current server-authenticated member', () => {
    const result = readLocalBookingRecords(JSON.stringify([record, { ...record, id: 'b2', user_id: 'member-b' }]), 'member-a');
    expect(result.records).toEqual([record]);
    expect(result.unreadable).toBe(true);
  });

  it('preserves past and cancelled records without converting them into confirmations', () => {
    const old = { ...record, id: 'old', start_time: '2020-01-01T09:00:00', status: 'cancelled' };
    const result = readLocalBookingRecords(JSON.stringify([old, record]), 'member-a');
    expect(result.records).toEqual([record, old]);
    expect(result.unreadable).toBe(false);
  });

  it('handles malformed storage and unusable dates without crashing or trusting another shape', () => {
    expect(readLocalBookingRecords('{broken', 'member-a')).toEqual({ records: [], unreadable: true });
    expect(readLocalBookingRecords('{}', 'member-a')).toEqual({ records: [], unreadable: true });
    expect(readLocalBookingRecords(JSON.stringify([null, 3, { ...record, start_time: 'invalid' }, record]), 'member-a')).toEqual({ records: [record], unreadable: true });
    expect(readLocalBookingRecords(null, 'member-a')).toEqual({ records: [], unreadable: false });
  });
});
