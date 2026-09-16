// Exercise the real production Next build, without real credentials or database writes.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3101','--hostname','127.0.0.1'],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'https://placeholder.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'build-only-placeholder',SUPABASE_SERVICE_ROLE_KEY:'build-only-placeholder',JWT_SECRET:'build-only-placeholder-not-for-production'},stdio:['ignore','pipe','pipe']});
let browser;
try {
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout')),15000);server.stdout.on('data',d=>{if(d.toString().includes('Ready')){clearTimeout(timer);resolve();}});server.on('exit',()=>{clearTimeout(timer);reject(Error('Server exited'));});});
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of ['/member/login','/member/signup','/mobile','/']){
   const response=await page.goto('http://127.0.0.1:3101'+path);await page.waitForLoadState('networkidle');
   assert.equal(response.status(),200,path);assert.ok((await page.locator('body').innerText()).length>20,path);
   assert.equal(await page.locator('[data-nextjs-dialog]').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path);
  }
  await page.goto('http://127.0.0.1:3101/member/login');await page.getByRole('button',{name:/sign in/i}).waitFor();
  await page.waitForLoadState('networkidle');await page.waitForTimeout(1000);
  await page.screenshot({path:`/tmp/thrivv-login-${width}.png`,fullPage:true});assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width}px: real production login/signup/landing pages, navigation, no hydration errors or overflow.`);
 }
 const page=await browser.newPage();
 for(const path of ['/api/rewards/points','/api/admin/rewards','/api/habits']){const response=await page.request.get('http://127.0.0.1:3101'+path);assert.equal(response.status(),401,path);}
 const cross=await page.request.post('http://127.0.0.1:3101/api/auth/login',{headers:{Origin:'https://attacker.test','Content-Type':'text/plain'},data:'{}'});assert.equal(cross.status(),403);
 console.log('PASS real production anonymous guards and cross-origin login protection.');
} finally {if(browser)await browser.close();server.kill();}
