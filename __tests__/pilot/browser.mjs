// Synthetic HTTP fixtures + real browser interactions. No production calls or writes.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const bundle=await readFile(process.argv[2]);const css=await readFile(process.argv[3]);
const user={id:'11111111-1111-4111-8111-111111111111',firstName:'Test',lastName:'Member',email:'member@example.test'};
const gid='22222222-2222-4222-8222-222222222222';
const receipt={id:'33333333-3333-4333-8333-333333333333',offer_id:'fixture',points:400,status:'issued',created_at:'2026-09-17T12:00:00Z',expires_at:'2099-01-01T00:00:00Z',offer_snapshot:{name:'Fixture reward',partner_name:'Fixture merchant'}};
const verification={mode:'manual',whoopConnected:true,gymId:gid,date:'2026-09-17',timezone:'UTC',verificationEnabled:true,rewardsEnabled:true,manual:{eligible:true,enabled:true,checkedIn:true,verified:false,canScan:true,estimatedPoints:40},workouts:[],creditedPoints:0,score:65,rewardStatus:'verification_required'};
let logs=[],requests=[],preferences={available_rewards:false,voucher_expiry:false,weekly_target:0},resolutions=[];
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');const path=url.pathname;let body;
 if(req.method==='POST'){let raw='';for await(const chunk of req)raw+=chunk;body=JSON.parse(raw);}
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(path==='/fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle);}if(path==='/fixture.css'){res.setHeader('Content-Type','text/css');return res.end(css);}
 if(path==='/api/auth/me')return json({user,isPlatformAdmin:true});
 if(path==='/api/health/profile')return json({exists:true});
 if(path==='/api/whoop/status')return json({connected:false});
 if(path==='/api/member/workout-verification')return json(verification);
 if(path==='/api/score/today')return json({score:{score:65,complete:true},history:[],average:null});
 if(path==='/api/leaderboard')return json({hasGym:true,currentRank:1,rankedCount:2,weekStart:'2026-09-14',weekEnd:'2026-09-20',leaderboard:[{id:user.id,name:'Manual member',rank:1,score:90,scored_days:2},{id:'fixture-whoop',name:'WHOOP member',rank:1,score:90,scored_days:2}]});
 if(path==='/api/rewards/points')return json({points:600,daily:null,dailyWarning:'Today’s earning status is temporarily unavailable. Your wallet and vouchers are still accessible.',offers:[],redemptions:[receipt],transactions:[]});
 if(path==='/api/workouts/log'){
  if(req.method==='POST'){
   assert.equal(body.expectedUserId,user.id);assert.match(body.requestId,/^[a-f0-9-]{36}$/);requests.push(body.requestId);
   const log={...body,id:'fixture-log',memberId:user.id,status:'completed',completedAt:new Date().toISOString()};
   if(!logs.length){logs=[log];return json({error:'Connection interrupted. Retry with your saved entries.'},503);}
   assert.equal(requests[0],body.requestId);return json({workout:logs[0]});
  }
  return json({workouts:logs,hasMore:false});
 }
 if(path==='/api/member/notifications'){
  if(req.method==='POST'){assert.equal(body.expectedUserId,user.id);preferences={available_rewards:body.available_rewards,voucher_expiry:body.voucher_expiry,weekly_target:body.weekly_target};return json({saved:true});}
  return json({preferences,reminders:preferences.available_rewards?[{id:'fixture',title:'A reward is available',body:'Fixture offer',href:'/member/rewards'}]:[],scheduled:[]});
 }
 if(path==='/api/admin/rewards')return json({offers:[]});
 if(path==='/api/admin/rewards/branches')return json({gyms:[{id:gid,name:'Fixture branch'}]});
 if(path==='/api/admin/operations')return json({due:3,paused:0,running:0,oldestDue:null,failures:[]});
 if(path==='/api/admin/rewards/redemptions'){
  if(req.method==='POST'){assert.equal(body.redemptionId,receipt.id);assert.equal(body.reference,'MERCHANT-123');resolutions.push(body);receipt.status='cancelled';return json({saved:true});}
  return json({redemptions:[receipt],total:1});
 }
 if(path.endsWith('/pilot'))return json({from:'2026-08-01',to:'2026-09-17',timezone:'Asia/Beirut',members:12,joined:12,firstVerified:8,repeatVisitors:6,firstReward:2,verifiedVisitDays:30,verifiedParticipants:8,visitsPerMemberWeek:1.8,week4Eligible:8,week4Participating:6,codesIssued:2,confirmedUse:1,rejected:0,expired:0,refunded:0,unknownMembershipDates:0,weekly:[{week:'2026-09-14',visit_days:8,participants:6}]});
 if(path.startsWith('/api/'))return json({});
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body class="bg-black text-white"><div id="root"></div><script src="/fixture.js"></script></body></html>');
});
await new Promise(r=>server.listen(process.argv.includes('--serve')?4179:0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
if(process.argv.includes('--serve')){console.log(origin);}else{
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [390,1440]){
   logs=[];requests=[];preferences={available_rewards:false,voucher_expiry:false,weekly_target:0};receipt.status='issued';resolutions=[];
   const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/member/dashboard');await page.getByText('Weekly earned points · Everyone together · Spending does not affect rank').waitFor();
   assert.equal(await page.getByRole('link',{name:'Bookings',exact:true}).count(),0);
   await page.goto(origin+'/member/workouts/log');await page.getByLabel('Workout name',{exact:true}).fill('Test strength');
   await page.getByLabel('Movement',{exact:true}).fill('Test row');await page.getByLabel('Sets',{exact:true}).fill('2');await page.getByLabel('Reps per set').fill('8');
   await page.getByRole('button',{name:'Add weights / customize each set'}).click();
   await page.getByLabel('Weight (kg)',{exact:true}).nth(0).fill('20');await page.getByLabel('Weight (kg)',{exact:true}).nth(1).fill('22.5');await page.getByLabel('Reps',{exact:true}).nth(1).fill('6');
   await page.getByRole('button',{name:'Save workout',exact:true}).click();await page.getByRole('alert').filter({hasText:'Connection interrupted'}).waitFor();
   await page.getByRole('button',{name:'Save workout',exact:true}).click();await page.getByRole('heading',{name:'Logged workouts'}).waitFor();
   assert.equal(logs.length,1);assert.deepEqual(logs[0].exercises[0].setDetails,[{reps:8,weightKg:20},{reps:6,weightKg:22.5}]);
   await page.locator('summary').filter({hasText:'Test strength'}).click();await page.getByText('Set 2: 6 reps × 22.5 kg').waitFor();
   await page.getByRole('button',{name:'Repeat workout'}).click();await page.getByLabel('Workout name',{exact:true}).waitFor();assert.equal(await page.getByLabel('Weight (kg)',{exact:true}).nth(1).inputValue(),'22.5');
   await page.goto(origin+'/member/notifications');await page.getByLabel('Show rewards I can redeem').check();await page.getByLabel('My weekly attendance target').selectOption('3');await page.getByRole('button',{name:'Save preferences'}).click();await page.getByText('A reward is available',{exact:true}).waitFor();assert.equal(preferences.weekly_target,3);
   await page.goto(origin+'/member/rewards');await page.getByLabel('Points balance').waitFor();assert.ok((await page.getByLabel('Points balance').innerText()).includes('600'));await page.getByRole('button',{name:'My redemptions',exact:true}).click();await page.getByText('Fixture reward',{exact:true}).waitFor();
   await page.goto(origin+'/member/scan-workout');await page.getByRole('button',{name:'Scan gym QR',exact:true}).waitFor();await page.getByRole('heading',{name:'Your WHOOP workouts'}).waitFor();
   await page.goto(origin+`/gym/${gid}/dashboard`);await page.getByRole('heading',{name:'Pilot participation and rewards'}).waitFor();await page.getByText('2 issued · 1 merchant-confirmed uses').waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`/tmp/thrivv-pilot-gym-${width}.png`,fullPage:true});
   await page.goto(origin+'/admin/gyms');await page.getByRole('heading',{name:'Redemption operations'}).waitFor();await page.locator('summary').filter({hasText:'Fixture reward'}).click();await page.getByLabel('Resolution',{exact:true}).selectOption('refund');await page.getByLabel('Merchant confirmation reference',{exact:true}).fill('MERCHANT-123');await page.getByLabel('Reason',{exact:true}).fill('Invalid partner code');await page.getByRole('button',{name:'Record resolution'}).click();await page.locator('summary').filter({hasText:'cancelled'}).waitFor();assert.equal(resolutions.length,1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.screenshot({path:`/tmp/thrivv-pilot-admin-${width}.png`,fullPage:true});await page.close();console.log(`PASS ${width}px: mixed leaderboard, no Bookings, per-set save/retry/history/repeat, opt-in reminders, wallet outage, shared WHOOP attendance, gym report, audited refund form, no overflow or runtime errors.`);
  }
 }finally{await browser.close();server.closeAllConnections();server.close();}
}
