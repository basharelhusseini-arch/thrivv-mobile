// Run with `node scripts/export-logo.cjs` after changing the master wordmark.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/brand-wordmark.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportsObject = {};
new Function('exports', compiled)(exportsObject);
const mark = exportsObject.THRIVV_WORDMARK;
const output = path.join(root, 'public/brand');
fs.mkdirSync(output, { recursive: true });

for (const [variant, color] of Object.entries(mark.colors)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${mark.viewBox}" width="${mark.width}" height="${mark.height}" role="img" aria-label="Thrivv"><title>Thrivv</title><path fill="${color}" fill-rule="evenodd" d="${mark.path}"/></svg>\n`;
  fs.writeFileSync(path.join(output, `thrivv-wordmark-${variant}.svg`), svg);
}
console.log('Exported gold and white Thrivv wordmarks.');
