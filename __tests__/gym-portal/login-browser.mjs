// Built-app public-route smoke test. Synthetic env only; never submits credentials.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = 3197;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dummy', SUPABASE_SERVICE_ROLE_KEY: 'dummy', JWT_SECRET: 'synthetic-public-route-test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Next startup timed out')), 20000);
    server.stdout.on('data', chunk => { if (chunk.toString().includes('Ready')) { clearTimeout(timeout); resolve(); } });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Next exited: ${code}`)); });
  });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {}) });
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/member/login?portal=gym`);
    await page.getByRole('link', { name: 'Member login', exact: true }).click();
    await page.getByRole('link', { name: 'Gym login', exact: true }).waitFor();
    assert(page.url().includes('portal=member'));
    await page.getByRole('link', { name: 'Gym login', exact: true }).click();
    await page.getByRole('link', { name: 'Member login', exact: true }).waitFor();
    assert(page.url().includes('portal=gym'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `/tmp/thrivv-real-login-${width}.png`, fullPage: true });
    await page.goto(`http://127.0.0.1:${port}/admin/gyms`);
    await page.waitForURL('**/member/login?portal=gym**');
    assert.equal((await page.request.get(`http://127.0.0.1:${port}/api/auth/me`)).status(), 401);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS built Next app ${width}px: member/gym login switching, no overflow, unauthenticated admin redirect and API denial.`);
  }
} finally { await browser?.close(); server.kill('SIGTERM'); }
