import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const bundle=await readFile(process.argv[2]);const css=await readFile(process.argv[3]);
let checked=false,verified=false,posts=0,fail=false;
const code='thrivv-workout:synthetic-manual-camera-code';const png=await QRCode.toDataURL(code,{width:640,margin:4});
const server=createServer(async(req,res)=>{
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(req.url==='/fixture.js'){res.end(bundle);return;}if(req.url==='/fixture.css'){res.end(css);return;}
 if(req.url==='/api/member/workout-verification'){
  if(req.method==='POST'){let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);assert.equal(body.workoutId,'manual');assert.equal(body.qr,code);assert.match(body.requestId,/^[a-f0-9-]{36}$/);posts++;verified=true;return json({verified:true,reward:{status:'credited',awarded:40}});}
  if(fail)return json({},503);
  return json({gymId:'gym',date:'2026-09-13',timezone:'UTC',verificationEnabled:true,rewardsEnabled:true,workouts:[],creditedPoints:verified?40:0,rewardStatus:verified?'credited':'pending',manual:{eligible:true,enabled:true,checkedIn:checked,verified,canScan:checked,estimatedPoints:40}});
 }
 if(req.url==='/api/checkin/today'){
  if(req.method==='POST'){
   let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);
   assert.equal(body.didWorkout,true);assert.equal(body.calories,600);assert.equal(body.sleepHours,7.5);assert.deepEqual(body.habits,{sauna:true});
   checked=true;return json({success:true});
  }
  return json({checkin:{did_workout:false,calories:600,sleep_hours:7.5,habit_details:{sauna:true}}});
 }
 if(req.url.startsWith('/api/'))return json({});
 res.end('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body class="bg-black p-4"><div id="root"></div><script src="/fixture.js"></script></body></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [1440,390]){
  checked=false;verified=false;fail=false;posts=0;
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(png=>{
   navigator.mediaDevices.getUserMedia=async()=>{
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
    const img=new Image();img.src=png;await img.decode();canvas.getContext('2d').drawImage(img,0,0);
    const stream=canvas.captureStream(10);window.testStream=stream;return stream;
   };
  },png);
  await page.goto(origin);await page.getByRole('button',{name:'Scan gym QR',exact:true}).click();
  await page.getByRole('status').filter({hasText:'40 points earned.'}).waitFor();assert.equal(posts,1);
  await page.getByRole('heading',{name:'40 points earned'}).waitFor();
  assert.equal(await page.evaluate(()=>window.testStream.getTracks().every(t=>t.readyState==='ended')),true);
  assert.equal(await page.getByRole('button',{name:'Scan gym QR',exact:true}).count(),0);
  verified=false;posts=0;await page.reload();await page.getByRole('button',{name:'Scan gym QR',exact:true}).click();
  await page.getByRole('status').filter({hasText:'40 points earned.'}).waitFor();assert.equal(posts,1);
  await page.getByRole('heading',{name:'40 points earned'}).waitFor();
  assert.equal(await page.evaluate(()=>window.testStream.getTracks().every(t=>t.readyState==='ended')),true);
  assert.equal(await page.getByRole('button',{name:'Scan gym QR',exact:true}).count(),0,'credited workouts do not offer another scan');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/tmp/thrivv-manual-${width}.png`,fullPage:true});
  fail=true;await page.reload();await page.getByRole('alert').waitFor();fail=false;await page.getByRole('button',{name:'Refresh status'}).click();await page.getByRole('heading',{name:'40 points earned'}).waitFor();
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width}px manual checkin gate, synthetic camera QR decoding, request payload, credit feedback, safe repeat, camera cleanup, refresh retry, no overflow/errors.`);
 }
}finally{await browser.close();server.closeAllConnections();server.close();}
