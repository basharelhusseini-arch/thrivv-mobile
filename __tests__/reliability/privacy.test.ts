import {safeErrorRoute,safeErrorType} from '@/lib/error-reporting-shared';
test('error reports discard queries, fragments, record identifiers and arbitrary text',()=>{
 expect(safeErrorRoute('/api/member/alice@example.com/workouts/secret-id?token=secret#private')).toBe('/api/member/:id/workouts/:id');
 expect(safeErrorType('secret access token')).toBe('Error');expect(safeErrorType('TypeError')).toBe('TypeError');
});
