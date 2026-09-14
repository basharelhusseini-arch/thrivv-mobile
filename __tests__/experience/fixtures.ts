export const fixtureUser = { id: '11111111-1111-4111-8111-111111111111', email: 'member@example.test', firstName: 'Alex', lastName: 'Morgan' };
export const fixtureDay = '2026-09-14';
export const fixtureVerification = {
  gymId: '22222222-2222-4222-8222-222222222222', date: fixtureDay, timezone: 'Asia/Dubai', verificationEnabled: true, rewardsEnabled: true,
  score: null, estimatedPoints: 40, creditedPoints: 0, rewardStatus: 'checkin_required',
  manual: { eligible: true, enabled: true, checkedIn: false, verified: false, canScan: false, estimatedPoints: 40 }, workouts: [],
};
export const fixtureApis: Record<string, unknown> = {
  '/api/auth/me': { user: fixtureUser, isPlatformAdmin: true },
  '/api/score/today': { score: { date: fixtureDay, score: null, subtotal: 0, complete: false }, average: 78.5, coverage: 4, expected: 7, provisional: true, history: [0,1,2,3,4,5,6].map((n) => ({date: `2026-09-${String(8+n).padStart(2,'0')}`, score: n < 4 ? 60+n*8 : null, subtotal: n<4 ? 60+n*8 : 0, complete: n<4})) },
  '/api/member/workout-verification': fixtureVerification,
  '/api/rewards/points': { points: 240, daily: fixtureVerification, offers: [{ id: 'test_offer', name: 'Partner reward — synthetic preview', points: 100 }], redemptions: [{ id: '33333333-3333-4333-8333-333333333333', offer_id: 'test_previous', points: 60, status: 'pending', created_at: '2026-09-13T10:00:00Z', reward_offers: { name: 'Previous reward — synthetic preview' } }], transactions: [{ id: 'tx1', kind: 'daily_credit', amount: 40, score_date: '2026-09-13', created_at: '2026-09-13T10:00:00Z' }] },
  '/api/leaderboard': { hasGym: true, currentRank: 2, rankedCount: 3, weekStart: fixtureDay, weekEnd: '2026-09-20', leaderboard: [{id:'other1',name:'Jordan',rank:1,score:85,scored_days:1},{id:fixtureUser.id,name:'Alex Morgan',rank:2,score:78,scored_days:1},{id:'other2',name:'Sam',rank:3,score:72,scored_days:1}] },
  '/api/checkin/today': { checkin: { did_workout: false, calories: 1800, sleep_hours: 7.5, habit_details: { stretching: true } } },
  '/api/workout-plans': [{ id: 'plan1', name: 'Strength foundations', description: 'A balanced week of strength sessions.', status:'active', goal:'build_muscle', duration:4, frequency:3, difficulty:'intermediate' }],
  '/api/whoop/status': { connected: false },
};
