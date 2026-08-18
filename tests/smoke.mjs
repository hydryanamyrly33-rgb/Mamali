import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = [
  'index.html',
  '404.html',
  'assets/styles.css',
  'assets/app.js',
  'assets/favicon.svg',
  'assets/social-preview.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/screenshots/android-install-wide.png',
  'assets/screenshots/android-install-narrow.png',
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
  ['Instagram native app portal', /data-native-app="instagram"/i],
  ['YouTube native app portal', /data-native-app="youtube"/i],
  ['Telegram native app portal', /data-native-app="telegram"[^>]+href="tg:\/\/resolve\?domain=/i],
  ['Unified app action label', />بازکردن اپ\s*</i],
  ['Android install section', /id="android-app"/i],
  ['In-app PWA explanation', /PWA با APK چه فرقی دارد؟/i],
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
if (manifest.prefer_related_applications !== false) failures.push('prefer_related_applications باید false باشد.');

const icons = manifest.icons || [];
if (!icons.some(icon => icon.sizes === '192x192' && icon.src.includes('icon-192.png'))) failures.push('آیکون 192x192 در مانیفست تعریف نشده است.');
if (!icons.some(icon => icon.sizes === '512x512' && icon.src.includes('icon-512.png'))) failures.push('آیکون 512x512 در مانیفست تعریف نشده است.');
if (!icons.some(icon => icon.sizes === '512x512' && /maskable/.test(icon.purpose || '') && icon.src.includes('icon-maskable-512.png'))) failures.push('آیکون maskable در مانیفست تعریف نشده است.');
const screenshots = manifest.screenshots || [];
if (!screenshots.some(item => item.form_factor === 'wide')) failures.push('اسکرین‌شات wide در مانیفست تعریف نشده است.');
if (!screenshots.some(item => item.form_factor === 'narrow')) failures.push('اسکرین‌شات narrow در مانیفست تعریف نشده است.');

const requiredAppPatterns = [
  ['Instagram Android package', /package=com\.instagram\.android/],
  ['YouTube Android package', /package=com\.google\.android\.youtube/],
  ['Android browser fallback', /S\.browser_fallback_url=/],
  ['Telegram custom scheme', /tg:\/\/resolve\?domain=Mr_CaceRo/],
  ['Generic native launcher', /function openNativeApp\(/],
];
for (const [label, pattern] of requiredAppPatterns) {
  if (!pattern.test(app)) failures.push(`الزام App Link پیدا نشد: ${label}`);
}

if (failures.length) {
  console.error(`Smoke test failed with ${failures.length} problem(s):`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Smoke test passed: ${requiredFiles.length} files and ${requiredHtmlPatterns.length} HTML requirements checked.`);
