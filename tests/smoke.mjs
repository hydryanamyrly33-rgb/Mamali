import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = [
  'index.html',
  '404.html',
  'assets/styles.css',
  'assets/app.js',
  'assets/favicon.svg',
  'assets/social-preview.svg',
  'manifest.webmanifest',
  'sw.js',
  'robots.txt',
  'sitemap.xml',
  '.nojekyll',
];

const failures = [];

for (const file of requiredFiles) {
  try { await access(file, constants.R_OK); }
  catch { failures.push(`فایل ضروری وجود ندارد: ${file}`); }
}

const html = await readFile('index.html', 'utf8');
const app = await readFile('assets/app.js', 'utf8');
const manifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'));

const requiredHtmlPatterns = [
  ['زبان فارسی', /<html[^>]+lang="fa"[^>]+dir="rtl"/i],
  ['توضیحات SEO', /<meta[^>]+name="description"/i],
  ['Content Security Policy', /Content-Security-Policy/i],
  ['Manifest', /rel="manifest"/i],
  ['Skip link', /class="skip-link"/i],
  ['عنوان اصلی', /<h1\b/i],
  ['Telegram app deep link', /href="tg:\/\/resolve\?domain=/i],
];

for (const [label, pattern] of requiredHtmlPatterns) {
  if (!pattern.test(html)) failures.push(`الزام HTML پیدا نشد: ${label}`);
}

const blankLinks = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)].map(match => match[0]);
for (const link of blankLinks) {
  if (!/rel="[^"]*noopener[^"]*"/i.test(link)) failures.push(`لینک _blank بدون noopener: ${link.slice(0, 100)}`);
}

const secretPatterns = [
  /github_pat_[A-Za-z0-9_]{20,}/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9_-]{32,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
for (const pattern of secretPatterns) {
  if (pattern.test(`${html}\n${app}`)) failures.push(`الگوی Secret مشکوک پیدا شد: ${pattern}`);
}

if (manifest.start_url !== '/Mamali/') failures.push('start_url مانیفست باید /Mamali/ باشد.');
if (manifest.display !== 'standalone') failures.push('PWA باید standalone باشد.');

if (failures.length) {
  console.error(`Smoke test failed with ${failures.length} problem(s):`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Smoke test passed: ${requiredFiles.length} files and ${requiredHtmlPatterns.length} HTML requirements checked.`);
