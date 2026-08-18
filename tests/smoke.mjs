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
  'assets/screenshots/windows-install-wide.png',
  'assets/screenshots/android-install-narrow.png',
  'manifest.webmanifest',
  'version.json',
  'scripts/release.mjs',
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
const serviceWorker = await readFile('sw.js', 'utf8');
const releaseScript = await readFile('scripts/release.mjs', 'utf8');
const manifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'));
const release = JSON.parse(await readFile('version.json', 'utf8'));
const escapedVersion = release.version.replaceAll('.', '\\.');

if (!/^\d+\.\d+\.\d+$/.test(release.version)) failures.push('نسخه باید از SemVer عددی x.y.z استفاده کند.');
if (!Array.isArray(release.notes) || !release.notes.length) failures.push('یادداشت انتشار version.json خالی است.');

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
  ['Install section', /id="android-app"/i],
  ['Windows install tab', /data-platform-tab="windows"/i],
  ['Android install tab', /data-platform-tab="android"/i],
  ['Install guide trigger', /data-open-dialog="installDialog"/i],
  ['Live Update Center', /id="updateCenter"/i],
  ['Update notification banner', /id="updateBanner"/i],
  ['Real device clock', /id="deviceClock"/i],
  ['Interactive phone', /id="interactivePhone"/i],
  ['Animated settings controls', /data-setting-code="PARTICLES"/i],
];
requiredHtmlPatterns.push(['Versioned application script', new RegExp(`assets/app\\.js\\?v=${escapedVersion}`, 'i')]);

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
  if (pattern.test(`${html}\n${app}\n${serviceWorker}\n${releaseScript}`)) failures.push(`الگوی Secret مشکوک پیدا شد: ${pattern}`);
}

if (manifest.start_url !== '/Mamali/') failures.push('start_url مانیفست باید /Mamali/ باشد.');
if (manifest.display !== 'standalone') failures.push('PWA باید standalone باشد.');
if (manifest.prefer_related_applications !== false) failures.push('prefer_related_applications باید false باشد.');
if (!manifest.launch_handler) failures.push('launch_handler مخصوص تجربه Windows تعریف نشده است.');
if (!(manifest.shortcuts || []).some(item => item.url?.includes('#updateCenter'))) failures.push('میانبر بروزرسانی مانیفست تعریف نشده است.');

const icons = manifest.icons || [];
if (!icons.some(icon => icon.sizes === '192x192' && icon.src.includes('icon-192.png'))) failures.push('آیکون 192x192 در مانیفست تعریف نشده است.');
if (!icons.some(icon => icon.sizes === '512x512' && icon.src.includes('icon-512.png'))) failures.push('آیکون 512x512 در مانیفست تعریف نشده است.');
if (!icons.some(icon => icon.sizes === '512x512' && /maskable/.test(icon.purpose || '') && icon.src.includes('icon-maskable-512.png'))) failures.push('آیکون maskable در مانیفست تعریف نشده است.');
const screenshots = manifest.screenshots || [];
if (!screenshots.some(item => item.form_factor === 'wide')) failures.push('اسکرین‌شات wide در مانیفست تعریف نشده است.');
if (!screenshots.some(item => item.src?.includes('windows-install-wide.png'))) failures.push('اسکرین‌شات نصب Windows در مانیفست تعریف نشده است.');
if (!screenshots.some(item => item.form_factor === 'narrow')) failures.push('اسکرین‌شات narrow در مانیفست تعریف نشده است.');

const requiredAppPatterns = [
  ['Current app version', new RegExp(`const APP_VERSION = '${escapedVersion}'`)],
  ['Instagram Android package', /package=com\.instagram\.android/],
  ['YouTube Android package', /package=com\.google\.android\.youtube/],
  ['Android browser fallback', /S\.browser_fallback_url=/],
  ['Telegram custom scheme', /tg:\/\/resolve\?domain=Mr_CaceRo/],
  ['Generic native launcher', /function openNativeApp\(/],
  ['Interactive 3D device controller', /class DeviceTiltController/],
  ['Real local clock', /function setupDeviceClock\(/],
  ['Windows platform detection', /return 'windows'/],
  ['Semantic version comparison', /function compareVersions\(/],
  ['Live update manager', /class UpdateManager/],
  ['Online and offline listeners', /addEventListener\('offline'/],
];
for (const [label, pattern] of requiredAppPatterns) {
  if (!pattern.test(app)) failures.push(`الزام App پیدا نشد: ${label}`);
}

const requiredServiceWorkerPatterns = [
  ['Service Worker current version', new RegExp(`mamali-orbit-v${escapedVersion}`)],
  ['Versioned CSS cache', new RegExp(`styles\\.css\\?v=${escapedVersion}`)],
  ['Versioned JS cache', new RegExp(`app\\.js\\?v=${escapedVersion}`)],
  ['Online-first network request', /fetch\(request, \{ cache: 'no-cache' \}\)/],
  ['Offline cached fallback', /caches\.match\(request\)/],
  ['Live-only version endpoint', /endsWith\('\/version\.json'\)/],
  ['User-controlled worker activation', /SKIP_WAITING/],
];
for (const [label, pattern] of requiredServiceWorkerPatterns) {
  if (!pattern.test(serviceWorker)) failures.push(`الزام Service Worker پیدا نشد: ${label}`);
}
if (serviceWorker.indexOf("fetch(request, { cache: 'no-cache' })") > serviceWorker.indexOf('caches.match(request)')) {
  failures.push('Service Worker باید قبل از Cache شبکه را بررسی کند.');
}
if (!/major.*minor.*patch/s.test(releaseScript)) failures.push('اسکریپت انتشار باید major/minor/patch را پشتیبانی کند.');

if (failures.length) {
  console.error(`Smoke test failed with ${failures.length} problem(s):`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Smoke test passed for Mamali v${release.version}: ${requiredFiles.length} files and ${requiredHtmlPatterns.length} HTML requirements checked.`);
