import { createGymWorkoutQr, verifyGymWorkoutQr } from '@/lib/gym-workout-qr';
const gym = '00000000-0000-4000-8000-000000000001', operator = '00000000-0000-4000-8000-000000000002';
const start = 1800000000000;
const original = process.env.GYM_WORKOUT_QR_SECRET;
beforeEach(() => { process.env.GYM_WORKOUT_QR_SECRET = Buffer.alloc(32, 9).toString('base64'); });
afterAll(() => { if (original === undefined) delete process.env.GYM_WORKOUT_QR_SECRET; else process.env.GYM_WORKOUT_QR_SECRET = original; });
test('same slot is stable, next 30-second slot rotates, expiry is 60 seconds', async () => {
 const a = await createGymWorkoutQr(gym, operator, start), b = await createGymWorkoutQr(gym, operator, start+1000), c = await createGymWorkoutQr(gym, operator, start+30000);
 expect(a.token).toBe(b.token); expect(c.token).not.toBe(a.token); expect(a.expiresAt).toBe(start+60000); expect(a.refreshAt).toBe(start+30000);
 expect(await verifyGymWorkoutQr(a.token, gym, start+59999)).toEqual(expect.objectContaining({gymId:gym,operatorId:operator}));
 await expect(verifyGymWorkoutQr(a.token, gym, start+60000)).rejects.toThrow();
});
test('rejects another gym, future code and tampered signature', async () => {
 const a=await createGymWorkoutQr(gym,operator,start);
 await expect(verifyGymWorkoutQr(a.token,operator,start)).rejects.toThrow();
 await expect(verifyGymWorkoutQr(a.token,gym,start-1)).rejects.toThrow();
 const parts=a.token.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);
 await expect(verifyGymWorkoutQr(parts.join('.'),gym,start)).rejects.toThrow();
});
test('missing or malformed dedicated secret fails closed',async()=>{
 delete process.env.GYM_WORKOUT_QR_SECRET;await expect(createGymWorkoutQr(gym,operator,start)).rejects.toThrow('QR setup required');
 process.env.GYM_WORKOUT_QR_SECRET='short';await expect(createGymWorkoutQr(gym,operator,start)).rejects.toThrow('QR setup required');
});
