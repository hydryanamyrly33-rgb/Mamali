import { readFile, writeFile } from 'node:fs/promises';

const mode = process.argv[2];
if (!mode) {
  console.error('Usage: node scripts/release.mjs <major|minor|patch|x.y.z>');
  process.exit(1);
}

const versionPath = new URL('../version.json', import.meta.url);
const appPath = new URL('../assets/app.js', import.meta.url);
const workerPath = new URL('../sw.js', import.meta.url);
const htmlPath = new URL('../index.html', import.meta.url);
const release = JSON.parse(await readFile(versionPath, 'utf8'));
const current = release.version;
const parts = current.split('.').map(Number);

let next;
if (/^\d+\.\d+\.\d+$/.test(mode)) {
  next = mode;
} else if (['major', 'minor', 'patch'].includes(mode)) {
  const [major, minor, patch] = parts;
  if (mode === 'major') next = `${major + 1}.0.0`;
  if (mode === 'minor') next = `${major}.${minor + 1}.0`;
  if (mode === 'patch') next = `${major}.${minor}.${patch + 1}`;
} else {
  throw new Error(`Unknown release mode: ${mode}`);
}

if (next === current) throw new Error('The next version must differ from the current version.');

const toPersianDigits = value => String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
let app = await readFile(appPath, 'utf8');
let worker = await readFile(workerPath, 'utf8');
let html = await readFile(htmlPath, 'utf8');

app = app.replace(`const APP_VERSION = '${current}';`, `const APP_VERSION = '${next}';`);
worker = worker
  .replace(`const APP_VERSION = '${current}';`, `const APP_VERSION = '${next}';`)
  .replace(`mamali-orbit-v${current}`, `mamali-orbit-v${next}`)
  .replaceAll(`?v=${current}`, `?v=${next}`);
html = html
  .replaceAll(`?v=${current}`, `?v=${next}`)
  .replace(/(<[^>]+data-app-version[^>]*>)[^<]*(<\/[^>]+>)/g, `$1${toPersianDigits(next)}$2`);

release.previous_version = current;
release.version = next;
release.released_at = new Date().toISOString();

await Promise.all([
  writeFile(appPath, app),
  writeFile(workerPath, worker),
  writeFile(htmlPath, html),
  writeFile(versionPath, `${JSON.stringify(release, null, 2)}\n`),
]);

console.log(`Mamali release prepared: ${current} → ${next}`);
console.log('Update release notes, run tests, commit, tag, and deploy.');
