// Synthetic UI/API rehearsal; no credentials, Supabase writes, or production requests.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const bundle = await readFile(process.argv[2]);
const css = await readFile(process.argv[3]);
let authenticated = true, admin = false, failLogout = false, failQr = false;
let code = '', writes = 0, qrReads = 0, logouts = 0, authReads = 0;
const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  const json = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  if (path === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle); }
  if (path === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); return res.end(css); }
  if (path === '/api/auth/me') {
    authReads++;
    return json(authenticated ? { user: { id: 'synthetic', firstName: 'Test', lastName: 'Member', email: 'test@example.test' }, isPlatformAdmin: admin } : {}, authenticated ? 200 : 401);
  }
  if (path === '/api/auth/logout') {
    logouts++; await new Promise(r => setTimeout(r, 150));
    if (failLogout) return json({}, 500);
    authenticated = false; return json({ success: true });
  }
  if (path.endsWith('/code')) {
    if (req.method === 'POST') { writes++; await new Promise(r => setTimeout(r, 150)); code = `TEST-${writes}`; }
    return json({ status: code ? 'available' : 'missing', code });
  }
  if (path.endsWith('/workout-qr')) {
    qrReads++;
    if (failQr) return json({ error: 'Synthetic QR outage' }, 503);
    const svg = await QRCode.toString(`thrivv-workout:synthetic-${qrReads}`, { type: 'svg' });
    return json({ image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, serverNow: Date.now(), refreshAt: Date.now() + 30000, expiresAt: Date.now() + 60000 });
  }
  res.setHeader('Content-Type', 'text/html');
  res.end('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
try {
  for (const width of [1440, 390]) {
    authenticated = true; admin = width === 390; failLogout = false; failQr = false; code = '';
    const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('dialog', dialog => dialog.accept());
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const destination = admin ? '/admin/gyms' : '/gym/00000000-0000-4000-8000-000000000001/dashboard';
    const beforeAuth = authReads;
    await page.goto(origin + destination);
    await page.getByRole('button', { name: 'Create code', exact: true }).waitFor();
    assert.equal(authReads - beforeAuth, 1, 'one centralized initial auth request');
    const beforeWrites = writes;
    await page.getByRole('button', { name: 'Create code', exact: true }).dblclick();
    await page.getByRole('status').filter({ hasText: 'Gym code saved' }).waitFor();
    assert.equal(writes - beforeWrites, 1, 'double click produces one mutation');
    const firstCode = await page.getByRole('textbox', { name: 'Gym joining code' }).inputValue();
    await page.reload();
    await page.getByRole('textbox', { name: 'Gym joining code' }).waitFor();
    assert.equal(await page.getByRole('textbox', { name: 'Gym joining code' }).inputValue(), firstCode);
    await page.getByRole('button', { name: 'Replace code', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Gym code saved' }).waitFor();
    assert.notEqual(await page.getByRole('textbox', { name: 'Gym joining code' }).inputValue(), firstCode);
    await page.clock.install();
    await page.getByRole('button', { name: 'Open QR display' }).click();
    const qr = page.getByAltText('Rotating gym workout verification QR'); await qr.waitFor();
    const initialImage = await qr.getAttribute('src');
    await page.clock.fastForward(31000);
    await page.waitForFunction(src => document.querySelector('img[alt="Rotating gym workout verification QR"]')?.src !== src, initialImage);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hiddenReads = qrReads;
    await page.clock.fastForward(10000);
    assert.equal(qrReads, hiddenReads, 'hidden display pauses requests');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await qr.waitFor();
    assert(qrReads > hiddenReads, 'return refreshes the still-open display');
    failQr = true;
    await page.clock.fastForward(31000);
    await page.getByRole('alert').filter({ hasText: 'Synthetic QR outage' }).waitFor();
    assert.equal(await qr.count(), 1, 'valid code survives failed refresh');
    await page.clock.fastForward(31000);
    assert.equal(await qr.count(), 0, 'expired code is hidden');
    failQr = false;
    await page.getByRole('button', { name: 'Retry', exact: true }).click(); await qr.waitFor();
    await page.getByRole('button', { name: 'Close QR display' }).click();
    const closedReads = qrReads; await page.clock.fastForward(65000);
    assert.equal(qrReads, closedReads, 'closed display stops requests');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow');
    await page.screenshot({ path: `/tmp/thrivv-portal-${width}.png`, fullPage: true });
    if (width < 1024) await page.getByRole('button', { name: 'More navigation options' }).click();
    failLogout = true;
    await page.getByRole('button', { name: /Sign out/i }).click();
    await page.getByRole('alert').filter({ hasText: 'Sign out failed' }).waitFor();
    assert.equal(authenticated, true);
    failLogout = false;
    if (width < 1024) await page.getByRole('button', { name: 'More navigation options' }).click();
    const otherTab = await context.newPage();
    await otherTab.goto(origin + destination);
    await otherTab.getByRole('textbox', { name: 'Gym joining code' }).waitFor();
    const beforeLogout = logouts;
    await page.getByRole('button', { name: /Sign out/i }).click();
    await page.waitForURL('**/member/login?portal=gym&redirect=%2Fgym');
    await otherTab.waitForURL('**/member/login?portal=gym&redirect=%2Fgym');
    assert.equal(logouts - beforeLogout, 1);
    await page.goBack();
    if (page.url() === 'about:blank') await page.goto(origin + destination);
    await page.waitForURL('**/member/login?portal=gym&redirect=%2Fgym');
    await page.reload();
    await page.getByRole('link', { name: 'Member login', exact: true }).click();
    await page.getByRole('link', { name: 'Gym login', exact: true }).waitFor();
    assert(page.url().includes('portal=member'));
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${width}px: one auth fetch, create/replace/persist, duplicate clicks, QR rotation/expiry/retry/cleanup, logout failure/success/Back/refresh/other tab, login switching.`);
  }
  authenticated = true; admin = false;
  const member = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await member.goto(origin + '/member/dashboard');
  await member.getByRole('button', { name: /Sign out/i }).click();
  await member.waitForURL('**/member/login?portal=member');
  await member.reload();
  await member.getByRole('link', { name: 'Gym login', exact: true }).waitFor();
  await member.close();
  console.log('PASS member sidebar logout regression.');
} finally { await browser.close(); server.closeAllConnections(); server.close(); }
