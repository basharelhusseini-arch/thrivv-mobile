import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const bundle=await readFile(process.argv[2]);const css=await readFile(process.argv[3]);
let workouts=[],requests=[];
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture');
 const json=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
 if(url.pathname==='/fixture.js'){res.end(bundle);return;}if(url.pathname==='/fixture.css'){res.end(css);return;}
 if(url.pathname==='/api/workouts/progress')return json({progress:[{name:'Bench Press',latestKg:60,bestKg:85,date:'2026-09-16'}]});
 if(url.pathname==='/api/workouts/log'&&req.method==='POST'){
  let raw='';for await(const c of req)raw+=c;const b=JSON.parse(raw);requests.push(b);
  const row={...b,id:'saved',memberId:b.expectedUserId,status:'completed',completedAt:new Date().toISOString()};workouts=[row];return json({workout:row},201);
 }
 if(url.pathname==='/api/workouts/log/saved'&&req.method==='PUT'){
  let raw='';for await(const c of req)raw+=c;const b=JSON.parse(raw);workouts=[{...workouts[0],...b}];return json({workout:workouts[0]});
 }
 if(url.pathname==='/api/workouts/log')return json({workouts,hasMore:false});
 if(url.pathname==='/api/rewards/points')return json({points:120,daily:{whoopConnected:false,gymId:'gym',manual:{eligible:true,enabled:true,checkedIn:false},creditedPoints:0,workouts:[]}});
 if(url.pathname==='/api/score/today')return json({score:null,history:[]});
 if(url.pathname==='/api/member/activity')return json({visits:12,weekDays:3,todayHabits:2,habitDays:4});
 if(url.pathname==='/api/leaderboard')return json({hasGym:true,leaderboard:[],rankedCount:0});
 if(url.pathname==='/api/whoop/status')return json({connected:false});
 if(url.pathname==='/api/admin/attention')return json({total:2,alertsConfigured:true,issues:[{id:'stock',priority:1,kind:'stock',title:'Partner reward: 0 codes remaining',tab:'Rewards',target:'offer',observed:'2026-09-17T12:00:00Z'},{id:'sync',priority:2,kind:'sync',title:'WHOOP import paused after 6 attempts',target:'member',observed:'2026-09-17T12:00:00Z'}]});
 if(url.pathname.startsWith('/api/'))return json({});
 res.end('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body style="background:#0d0f14"><div id="root"></div><script src="/fixture.js"></script></body></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1440]){
  workouts=[];requests=[];
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  await page.goto(origin);await page.getByLabel('Workout name',{exact:true}).fill('Upper body');await page.getByLabel('Movement',{exact:true}).fill('Bench Press');await page.getByLabel('Sets',{exact:true}).fill('3');await page.getByLabel('Reps per set',{exact:true}).fill('8');
  await page.getByText('Previous recorded weight:').waitFor();await page.getByText('Rest timer (optional)').click();await page.getByRole('button',{name:'Start',exact:true}).click();await page.getByText('1:30',{exact:true}).waitFor();await page.getByRole('button',{name:'Clear',exact:true}).click();
  await context.setOffline(true);await page.getByRole('button',{name:'Save workout',exact:true}).click();await page.getByRole('status').filter({hasText:'waiting to sync'}).first().waitFor();assert.equal(requests.length,0);
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('thrivv:workout-upload:')).length),1);
  await context.setOffline(false);await page.getByRole('status').filter({hasText:'1 workout synced.'}).waitFor();assert.equal(requests.length,1);
  await page.getByRole('heading',{name:'Upper body',exact:true}).click();await page.getByRole('button',{name:'Edit workout',exact:true}).click();
  const edit=page.getByRole('heading',{name:'Edit saved workout'}).locator('..');await edit.getByLabel('Workout name',{exact:true}).fill('Upper body edited');await edit.getByRole('button',{name:'Save workout',exact:true}).click();await page.getByRole('heading',{name:'Upper body edited',exact:true}).waitFor();assert.equal(workouts.length,1);
  await page.goto(origin+'?view=dashboard');await page.getByRole('heading',{name:'Your consistency'}).waitFor();assert.equal(await page.getByText('Your Health Score',{exact:true}).count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`/tmp/thrivv-reliability-dashboard-${width}.png`,fullPage:true});
  await page.goto(origin+'?view=operations');await page.getByText('Partner reward: 0 codes remaining',{exact:false}).waitFor();await page.getByRole('button',{name:'Retry sync'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`/tmp/thrivv-reliability-operations-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}px: offline queue, reconnect upload, edit, rest timer, previous weight, non-WHOOP home and prioritised queue.`);
 }
}finally{await browser.close();server.close();}
