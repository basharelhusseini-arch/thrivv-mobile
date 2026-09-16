const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const navigationSource = fs.readFileSync(path.join(__dirname, '../navigation.ts'), 'utf8');
const navigationCode = ts.transpileModule(navigationSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const navigation = {};
new Function('exports', navigationCode)(navigation);

const appSource = fs.readFileSync(path.join(__dirname, '../../app/index.tsx'), 'utf8');
const appAst = ts.createSourceFile('index.tsx', appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isJsxAttribute(node) && node.name.getText(appAst) === 'onOpenWindow') {
    callback = node.initializer.expression.getText(appAst);
  }
  ts.forEachChild(node, visit);
}
visit(appAst);
assert.ok(callback, 'The native shell handles links that open a new window');

function run(targetUrl) {
  const external = [];
  const checked = [];
  const injected = [];
  const handler = new Function('appUrl', 'openExternal', 'allowNavigation', 'webView', `return (${callback});`)(
    navigation.appUrl,
    url => external.push(url),
    url => { checked.push(url); return navigation.navigationTarget(url, false) === 'app'; },
    { current: { injectJavaScript: value => injected.push(value) } },
  );
  handler({ nativeEvent: { targetUrl } });
  return { external, checked, injected };
}

test('opening the privacy policy preserves the native signup page', () => {
  for (const url of ['https://thrivv.dev/privacy', 'https://www.thrivv.dev/privacy?source=signup']) {
    assert.deepEqual(run(url), { external: [url], checked: [], injected: [] });
  }
});

test('other app links keep the existing navigation behavior', () => {
  const url = 'https://thrivv.dev/member/dashboard';
  const result = run(url);
  assert.deepEqual(result.external, []);
  assert.deepEqual(result.checked, [url]);
  assert.equal(result.injected.length, 1);
  assert.ok(result.injected[0].includes(JSON.stringify(url)));
});

test('policy-shaped unsafe or lookalike links do not bypass native navigation controls', () => {
  for (const url of ['javascript:alert(1)', 'http://thrivv.dev/privacy', 'https://user:password@thrivv.dev/privacy', 'https://thrivv.dev.evil.com/privacy']) {
    assert.deepEqual(run(url), { external: [], checked: [url], injected: [] });
  }
});
