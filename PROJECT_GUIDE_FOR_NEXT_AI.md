# Mamali Orbit — راهنمای کامل برای AI بعدی (نسخه 3.3.1)

> این فایل برای این نوشته شده که اگر چت فعلی خطا داد، AI بعدی از صفر تا صد پروژه رو بفهمه. به زبان ساده.

## 1. پروژه چیست؟
- نام: Mamali Orbit
- لینک اصلی (Vercel): https://mamali-orbit.vercel.app/Mamali/
- لینک پشتیبان (GitHub Pages): https://hydryanamyrly33-rgb.github.io/Mamali/ (فقط بکاپ، اصلی ورسله)
- نوع: Progressive Web App (PWA) سه‌بعدی، قابل نصب روی Android و Windows
- زبان رابط: فارسی RTL
- بدون بک‌اند — فقط Static Hosting روی Vercel، همه چیز در مرورگر اتفاق می‌افته

## 2. ساختار فایل‌ها (حدود 6.7MB)

```
/ (root)
├── index.html (صفحه اصلی، دروازه ورود + اپ)
├── manifest.webmanifest (PWA manifest: name, icons, orientation portrait-primary)
├── sw.js (Service Worker: online-first, cache app-shell)
├── version.json (نسخه فعلی: 3.3.1)
├── vercel.json (redirect / -> /Mamali/ و rewrite)
├── 404.html (redirect به /Mamali/)
├── assets/
│   ├── app.js (قلب پروژه: 2400 خط، Auth + 3D + Device + Permissions)
│   ├── styles.css (1911 خط اصلی + 200 خط 3.3.1 fixes، لایه گرد گوگل + دستگاه + ویندوز)
│   ├── favicon.svg
│   ├── social-preview.svg
│   ├── icons/ (icon-192, 512, maskable-512, apple-touch-icon)
│   └── screenshots/ (android-wide, windows-wide, narrow)
├── tests/smoke.mjs (تست ضروری)
├── scripts/release.mjs (اسکریپت version bump)
└── .github/workflows/quality.yml
```

همه اینا باید تو ورک‌اسپیس آرنا باشن تا AI بفهمه.

## 3. جریان کاربر (User Flow)

1. کاربر وارد https://mamali-orbit.vercel.app/Mamali/ میشه
2. `index.html` لود میشه، `app.js` اول `OrientationLockManager` و `ScreenshotProtectionManager` و `DeviceDetectionManager` رو میاره
3. `AuthManager` چک می‌کنه آیا `IndexedDB` رکورد `current-google-account` داره و active هست؟
   - اگر active: مستقیم unlock و `initProtectedApp()` → نمایش app-shell
   - اگر locked یا هیچی: نمایش `authGate` (دروازه ورود)
4. تو دروازه: کاربر با Google وارد میشه (GIS + FedCM + OAuth redirect fallback)
5. توکن Google فقط همون لحظه با `crypto.subtle.verify` و JWK گوگل چک میشه، فقط `sub, email, name, picture` تو IndexedDB میمونه، خود توکن ذخیره نمیشه
6. بعد از ورود: `appShell.hidden=false`, `gate.hidden=true`, `initProtectedApp()` اجرا میشه (اگر قبلاً نشده)
7. داخل اپ: 3 پورتال (اینستا، یوتیوب، تلگرام) با `DeviceTiltController` و `OrbitEngine` سه‌بعدی
8. UpdateManager هر 30 ثانیه `version.json` رو چک می‌کنه، SW update رو میاره

## 4. قابلیت‌های کلیدی و چطور کار می‌کنن

### 4.1 ورود گوگل در اپ اندروید (مشکل اصلی نسخه قبل)
- **مشکل:** تو PWA نصب‌شده (WebAPK) و APK wrapper، پاپ‌آپ GIS بسته میشد چون گوگل WebView رو بلاک می‌کنه
- **راه‌حل 3 لایه‌ای (از 3.3):**
  1. FedCM: `use_fedcm_for_button: true, use_fedcm_for_prompt: true`
  2. OAuth id_token redirect: `buildOAuthUrl()` میره `https://accounts.google.com/o/oauth2/v2/auth?response_type=id_token&nonce=...&state=...&redirect_uri=https://mamali-orbit.vercel.app/Mamali/` — گوگل بعد با `#id_token=...` برمی‌گرده
  3. External browser fallback: `intent://...#Intent;package=com.android.chrome;end` + `window.open`
- وقتی برمی‌گرده، `sessionStorage.mamali_external_id_token` خونده میشه و `handleExternalToken()` اعتبارسنجی می‌کنه
- دکمه‌های fallback تو `google-auth-fallback` هستن: `#externalGoogleButton` و `#oauthRedirectButton`
- Client ID: `737314975140-nhilm65a3mr9bsemufr4e83cmhisq77e.apps.googleusercontent.com` — باید تو Google Console تو `Authorized JavaScript origins` باشه `https://mamali-orbit.vercel.app`

### 4.2 قفل عمودی (Portrait Lock)
- Manifest: `"orientation": "portrait-primary"` (قبلاً any بود)
- Meta: `<meta name="screen-orientation" content="portrait">`
- JS: `OrientationLockManager.lock()` با `screen.orientation.lock('portrait-primary')`، تلاش هر 2 ثانیه + رو `visibilitychange` و `orientationchange`
- اگر لنداسکیپ شد و عرض <=900px: `#rotatePrompt` نشون داده میشه (minimal, نه اذیت‌کن)
- تنظیمات: `settings.portrait` تو `localStorage` با کلید `mamali-orbit-settings-v3`

### 4.3 نشان گوگل گرد (درخواست کاربر)
- قبلاً `.auth-google-orb` مربعی با `border-radius: 27px` و گوشه‌های تیز بود
- الان `.auth-google-orb--round` با `border-radius: 50%` کاملاً گرد، سایز 92x92، بکگراند سفید براق
- `.auth-core--round` هم گرد (200px دایره) بدون متن `GOOGLE ID` و `ONE TAP` — کاربر گفت اونجا چیزی ننویس
- تو `index.html` تگ‌های `<strong>GOOGLE ID</strong>` حذف شدن

### 4.4 تشخیص هوشمند دستگاه
- کلاس جدید `DeviceDetectionManager` تو `app.js`
- `detect()` با `navigator.userAgent` و `userAgentData.platform`
- تشخیص: `android, ios, windows, macos, linux` + `mobile/desktop` + `chrome/edge/firefox/safari` + `PWA/Browser`
- Badge: `#deviceBadge` تو لاگین با آیکون 🤖 🪟 🍎 و متن مثل "Android · موبایل · chrome · PWA"
- Body datasets: `data-device-os`, `data-device-type`, `data-device-browser`, `data-is-standalone`
- CSS: `body[data-device-os="android"] .ambient--one` رنگ متفاوت، `is-windows`, `is-android` کلاس‌ها

### 4.5 طراحی ویندوز بهبود یافته
- مشکل قبل: فضای خالی زیاد، کاربر باید خیلی اسکرول می‌کرد
- راه‌حل:
  - `.windows-layout` با `gap` کمتر (28px به جای 96px)
  - `.system-strip` کامپکت‌تر (padding 32px)
  - هاور بهتر برای موس: `@media (hover:hover) and (pointer:fine)` → `transform: scale(1.01)`
  - `container-type` برای responsive هوشمند
  - در دسکتاپ عریض >1600px: `min-height: 78vh` و `padding 80px` تا فضای خالی کم بشه

### 4.6 ریسپانسیو هوشمند
- Grid اصلی: `hero` → 1fr روی موبایل، 0.82fr + 1.18fr روی دسکتاپ
- `android-section`: `minmax(340px, .86fr)` + `1.14fr`، روی <760px میشه 1fr (ستونی)
- `feature-grid`: 3 ستونه، روی 1060px → 2 ستونه، روی 760px → 1 ستونه
- `phone-frame` سایز `min(278px, 74%)`، روی 430px → 220px، روی 360px → 205px (حفظ طراحی اندروید اصلی)
- استفاده از `clamp()` و `min()` و `max()` برای هوشمند بودن

### 4.7 محافظت اسکرین‌شات (درخواست جدید کاربر: بدون خطای مزاحم)
- نسخه 3.3 اشتباه: overlay + toast بعد از PrintScreen اذیت‌کن بود
- نسخه 3.3.1 درست: فقط `FLAG_SECURE` برای APK
  ```js
  if (window.Android?.setSecureFlag) window.Android.setSecureFlag(true)
  ```
- برای وب: هیچ بلوکه و toast نیست، فقط `secure-mode-minimal` کلاس و `dragstart` برای عکس‌ها
- برای APK واقعی باید تو `MainActivity.java`:
  ```java
  getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
  ```
- کاربر گفت: اصلاً نخواد اجازه سیستمی بده تا اسکرین‌شات بگیره — یعنی FLAG_SECURE

### 4.8 درخواست مجوزها سیستمی دقیق (گوشی)
- `PermissionManager` چک می‌کنه `isStandalonePWA() || isAndroidWrapper() || isAndroid()`
- اگر `localStorage.mamali_permissions_requested_v3 !== '1'` و اولین ورود باشه: دیالوگ نمایش
- مجوزها:
  - Notification: `Notification.requestPermission()`
  - Persistent storage: `navigator.storage.persist()`
  - Orientation: `screen.orientation.lock()`
  - Secure mode
- UI: لیست با status `در انتظار / فعال ✓ / رد شد`
- بعد از allow: `localStorage.mamali_permissions_requested_v3 = '1'`

### 4.9 بقیه قابلیت‌های اصلی (از نسخه‌های قبل)
- `CosmosRenderer`: canvas ذرات با parallax موس
- `OrbitEngine`: 3 پورتال که دور M CORE می‌چرخن، drag + inertia + keyboard arrows
- `DeviceTiltController`: گوشی سه‌بعدی که موس/تاچ رو دنبال می‌کنه، 3 پروفایل soft/balanced/free + depth قابل تنظیم
- `UpdateManager`: هر 30s version.json رو چک، SW update با skipWaiting و countdown
- `SafeStorage`: localStorage wrapper امن
- Theme: neon/aurora/solar/prism
- Settings: particles, glow, motion, reducedMotion, sound, autoUpdate, deviceMotion, phoneDepth, quality, secure, portrait

## 5. ورژن‌گذاری
- فایل `version.json`: `3.3.1`
- `sw.js`: `CACHE_NAME = mamali-orbit-v3.3.1`
- `index.html`: `?v=3.3.1` برای CSS و JS
- اسکریپت: `node scripts/release.mjs patch/minor/major` → آپدیت همه جا

## 6. دیپلوی
- Vercel پروژه `mamali-orbit` به گیت‌هاب `hydryanamyrly33-rgb/Mamali` branch `main` وصله
- هر push به main → production deployment جدید
- `vercel.json`: redirect `/` → `/Mamali/` و rewrite `/Mamali/:path*` → `/:path*`
- کاربر گفت: ورسل لینک اصلیه، گیت‌هاب فقط بکاپ

## 7. امنیت و توکن‌ها
- کاربر توکن‌های Vercel `vcp_...` و GitHub `ghp_...` رو داده و گفته نگران نباش، اجازه کامل داری
- ولی برای AI بعدی: توکن‌ها رو تو کد نذار، فقط از env بخون
- Google Client ID عمومیه، اما Secret نباید باشه

## 8. سوالات ساده برای کاربر (که AI بعدی هم بپرسه)
1. تمرکز اصلی کاربرات اندرویده یا ویندوز هم مهمه؟ (برای اولویت responsive)
2. می‌خوای تو ویندوز افکت هاور موس متفاوت از اندروید باشه؟
3. برای تشخیص دستگاه، بنر بالای سایت که بگه "شما با ویندوز وارد شدید" خوبه؟
4. قفل عمودی تو ویندوز هم باشه یا فقط اندروید؟
5. برای اسکرین‌شات، آیا فقط APK مهمه یا وب هم باید حداقل overlay داشته باشه؟
6. مجوزها کدوما مهم‌ترن؟ notification, location, camera؟
7. آیا می‌خوای نسخه iOS هم پشتیبانی بشه یا فقط Android/Windows؟

## 9. چک‌لیست قبل از push
- [ ] `assets/app.js` APP_VERSION چک
- [ ] `assets/styles.css` حاوی fix گرد
- [ ] `index.html` v=3.3.1 و deviceBadge
- [ ] `manifest.webmanifest` orientation portrait-primary
- [ ] `sw.js` CACHE_NAME جدید
- [ ] `version.json` notes فارسی
- [ ] `tests/smoke.mjs` پاس بشه: `node tests/smoke.mjs`
- [ ] `git push origin main` → Vercel auto deploy
- [ ] چک https://mamali-orbit.vercel.app/Mamali/version.json

## 10. نکات برای AI بعدی
- اندروید دیزاین رو خراب نکن: `phone-frame` و `phone-stage` و `android-visual` اصلی رو دست نزن، فقط clamps اضافه کن
- گوگل orb گرد باشه: border-radius 50%
- ویندوز فضای خالی زیاد داره: gap کمتر، padding کمتر
- ریسپانسیو هوشمند: container queries و clamp
- اسکرین‌شات: فقط FLAG_SECURE، toast اذیت‌کن نذار
- همه فایل‌ها حدود 7MB، تو workspace هستن
- اگر چت خطا داد، این فایل رو بخون و ادامه بده

---
نوشته شده برای Mamali Orbit 3.3.1 — توسط Arena.ai Agent
تاریخ: 2026-08-19
