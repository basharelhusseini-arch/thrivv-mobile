const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../navigation.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const navigation = {};
new Function('exports', compiled)(navigation);
const { appUrl, startsWhoop, navigationTarget } = navigation;

test('member and gym workspace URLs remain inside the app', () => {
  for (const host of ['thrivv.dev', 'www.thrivv.dev', 'gyms.thrivv.dev']) {
    assert.equal(navigationTarget(`https://${host}/member/login`, false), 'app');
  }
  for (const url of ['https://thrivv.dev.evil.com', 'https://thrivv.dev@evil.com', 'https://thrivv.dev:8443']) {
    assert.equal(appUrl(url), null);
  }
});

test('WHOOP authorization and hosted HTTPS redirects retain the OAuth cookie store', () => {
  assert.equal(startsWhoop('https://thrivv.dev/api/whoop/connect'), true);
  assert.equal(startsWhoop('https://api.prod.whoop.com/oauth/oauth2/auth?state=sample'), true);
  assert.equal(navigationTarget('https://api.prod.whoop.com/oauth/oauth2/auth', false), 'provider');
  assert.equal(navigationTarget('https://hosted-login.example/sign-in', true), 'provider');
  assert.equal(navigationTarget('https://thrivv.dev/api/whoop/callback?code=sample', true), 'app');
  assert.equal(startsWhoop('https://api.prod.whoop.com.evil.com/oauth/oauth2/auth'), false);
});

test('ordinary links leave the app while executable, local and insecure URLs are blocked', () => {
  assert.equal(navigationTarget('https://restaurant.example/menu', false), 'external');
  assert.equal(navigationTarget('mailto:hello@thrivv.dev', false), 'external');
  assert.equal(navigationTarget('tel:+9711234567', false), 'external');
  for (const value of ['javascript:alert(1)', 'file:///secret', 'data:text/html,hello', 'http://thrivv.dev',
    'https://user:password@thrivv.dev', 'intent://something', 'not a URL']) {
    assert.equal(navigationTarget(value, true), 'blocked');
  }
});
