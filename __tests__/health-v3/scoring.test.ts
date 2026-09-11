import { scoreWorkout, PROFILES } from '@/lib/workout-score';
import { calculateHealthScoreV3, eligibleHabits, ELIGIBLE_HABITS, HEALTH_VERSION } from '@/lib/health-score-v3';
import { localDate, dayStart, sevenDayAverage } from '@/lib/score-calendar';
import { parseWorkout } from '@/lib/whoop/workouts';
import { recoveryForDay } from '@/lib/whoop/recovery-day';
const all = Object.fromEntries(ELIGIBLE_HABITS.map(h => [h, true]));
const workout = { strain: 14, duration_ms: 3600000, sport_name: 'running', kilojoule: 400 * 4.184,
  zone_durations_ms: [0, 0, 3600000, 0, 0, 0], score_state: 'SCORED', end_at: '2026-01-01T12:00:00Z' };
test('agreed example is 60 + 18 + 10 = 88; max is 110', () => {
  expect(calculateHealthScoreV3(75,90,all)).toMatchObject({ training_score:60,recovery_score:18,habit_score:10,score:88,complete:true });
  expect(calculateHealthScoreV3(100,100,all).score).toBe(110);
});
test.each([0,50,90,100])('Recovery %s is the only sleep contribution', n => {
  expect(calculateHealthScoreV3(0,n,{}).recovery_score).toBe(n*.2);
});
test('fixed server habit whitelist ignores forged and truthy values', () => {
  expect(calculateHealthScoreV3(0,0,{ forged:true, sauna:'true', meditation:true }).habit_score).toBe(1.7);
  expect(Object.keys(eligibleHabits({}))).toHaveLength(6);
});
test('missing measurements and unconfirmed workout windows stay provisional, reported zero can rank', () => {
  expect(calculateHealthScoreV3(null,90,all).score).toBeNull();
  expect(calculateHealthScoreV3(75,null,all).score).toBeNull();
  expect(calculateHealthScoreV3(75,90,all,false).score).toBeNull();
  expect(calculateHealthScoreV3(0,90,{}).score).toBe(18);
});
test('components round before the total, not afterwards', () => {
  const r = calculateHealthScoreV3(33.333,33.333,{sauna:true});
  expect(r.score).toBe(35.1); expect(r.score).toBe(Math.round((r.training_score!+r.recovery_score!+r.habit_score)*10)/10);
});
test.each(['running','weightlifting','yoga'])('profile caps at 100: %s', name => {
  expect(scoreWorkout({...workout,sport_name:name,strain:21,kilojoule:9999})?.score).toBe(100);
});
test('unknown type uses cardio and Other label; weights sum to 100', () => {
  expect(scoreWorkout({...workout,sport_name:'unrecognised'})).toMatchObject({category:'cardio',label:'Other'});
  Object.values(PROFILES).forEach(p=>expect(p.weights.reduce((a,b)=>a+b,0)).toBe(100));
});
test('calories are lightly weighted and zone 5 has no advantage over zone 3', () => {
  expect(scoreWorkout({...workout,kilojoule:0})!.score).toBe(90);
  expect(scoreWorkout({...workout,zone_durations_ms:[0,0,0,600000,0,0]})!.score).toBe(scoreWorkout({...workout,zone_durations_ms:[0,0,0,0,0,600000]})!.score);
});
test.each([null,NaN,Infinity,-1])('invalid calories %s cannot score', kilojoule => expect(scoreWorkout({...workout,kilojoule})).toBeNull());
test('missing zones, overrun, pending and future workouts do not score', () => {
  expect(scoreWorkout({...workout,zone_durations_ms:null})).toBeNull();
  expect(scoreWorkout({...workout,zone_durations_ms:[0,0,3700000,0,0,0]})).toBeNull();
  expect(scoreWorkout({...workout,score_state:'PENDING_SCORE'})).toBeNull();
  expect(scoreWorkout({...workout,end_at:'2099-01-01'})).toBeNull();
});
test('WHOOP units are extracted without inventing missing values', () => {
  const p=parseWorkout({id:'00000000-0000-4000-8000-000000000001',start:'2026-01-01T11:00:00Z',end:workout.end_at,updated_at:workout.end_at,score_state:'SCORED',sport_name:'running',score:{strain:14,kilojoule:1673.6,zone_durations:{zone_zero_milli:0,zone_one_milli:0,zone_two_milli:3600000,zone_three_milli:0,zone_four_milli:0,zone_five_milli:0}}});
  expect(p).toMatchObject({duration_ms:3600000,workout_score:100,score_input_valid:true});
});
test('DST day boundaries and start attribution use gym calendar', () => {
  expect(dayStart('2026-03-08','America/New_York')).toBe('2026-03-08T05:00:00.000Z');
  expect(Date.parse(dayStart('2026-03-09','America/New_York'))-Date.parse(dayStart('2026-03-08','America/New_York'))).toBe(23*3600000);
  expect(localDate('2026-03-09T02:00:00Z','America/New_York')).toBe('2026-03-08');
});
test('seven-day mean excludes today, missing/incompatible days and pre-membership days', () => {
  const rows=[{date:'2026-09-08',score:88,complete:true,version:HEALTH_VERSION},{date:'2026-09-09',score:100,complete:true,version:'old'},{date:'2026-09-11',score:110,complete:true,version:HEALTH_VERSION}];
  expect(sevenDayAverage(rows,'2026-09-11','2026-09-08',HEALTH_VERSION)).toEqual({average:88,coverage:1,expected:3,provisional:true});
});
test('recovery belongs to local main sleep and matching cycle; naps and ambiguous days stay pending', () => {
  const sleep={id:'main',cycle_id:1,end:'2026-09-11T07:00:00Z',nap:false};
  const recovery={sleep_id:'main',cycle_id:1,score_state:'SCORED',updated_at:sleep.end,score:{recovery_score:90}};
  expect(recoveryForDay([sleep],[{...recovery,sleep_id:'other'},recovery],'2026-09-11','UTC').value).toBe(90);
  expect(recoveryForDay([{...sleep,nap:true}],[recovery],'2026-09-11','UTC').value).toBeNull();
  expect(recoveryForDay([sleep,{...sleep,id:'second'}],[recovery],'2026-09-11','UTC').value).toBeNull();
});

test('best eligible workout wins; duplicates do not stack; updates/deletions recompute', () => {
  const { bestDailyWorkout } = require('@/lib/workout-score');
  const row = (score: number) => ({workout_score:score,score_input_valid:true,score_state:'SCORED'});
  expect(bestDailyWorkout([row(50),row(75),row(75)])).toEqual({workoutScore:75,workoutsComplete:true});
  expect(bestDailyWorkout([row(50),row(60)]).workoutScore).toBe(60);
  expect(bestDailyWorkout([row(50)]).workoutScore).toBe(50);
  expect(bestDailyWorkout([])).toEqual({workoutScore:0,workoutsComplete:true});
  expect(bestDailyWorkout([row(75),{...row(90),score_input_valid:false}])).toEqual({workoutScore:75,workoutsComplete:false});
});

test('missing sport or strain stays incomplete without fabricated measurements', () => {
  expect(scoreWorkout({...workout,sport_name:null})).toBeNull();
  const row=parseWorkout({id:'00000000-0000-4000-8000-000000000001',start:'2026-01-01T11:00:00Z',end:workout.end_at,updated_at:workout.end_at,score_state:'SCORED'});
  expect(row.strain).toBeNull(); expect(row.score_input_valid).toBe(false);
});
