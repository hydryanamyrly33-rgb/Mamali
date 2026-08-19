# Mamali Orbit — راهنمای کامل برای AI بعدی (نسخه 3.6.2)

> اگر چت فعلی خطا داد، همین فایل را اول بخوان. به زبان ساده، از صفر تا صد.

## 1. پروژه چیست؟
- نام: Mamali Orbit
- لینک اصلی (Vercel): https://mamali-orbit.vercel.app/Mamali/
- لینک پشتیبان (GitHub Pages): https://hydryanamyrly33-rgb.github.io/Mamali/ — فقط بکاپ
- مخزن: https://github.com/hydryanamyrly33-rgb/Mamali
- نوع: PWA استاتیک + یک API کوچک برای قفل نشست
- زبان رابط: فارسی RTL
- صاحب پروژه گفته: Vercel اصل است، GitHub فقط پشتیبان

## 2. نسخه فعلی و مسیر نسخه‌ها
- فعلی: `3.6.2`
- قبلی: `3.6.1` → `3.6.0` → `3.5.0` → `3.4.0` → `3.3.1` → `3.3.0` → `3.2.0` → `3.1.0` → `3.0.0`
- آرشیو داخل برنامه: بخش `#versions` و فایل `history/versions.json`
- bump نسخه: `node scripts/release.mjs patch|minor|major`

## 3. ساختار فایل‌ها
```
index.html                 صفحه ورود + اپ
assets/app.js              قلب برنامه
assets/styles.css          ظاهر
manifest.webmanifest       PWA — orientation: any (JS تصمیم می‌گیرد)
sw.js                      Service Worker online-first
version.json               کانال بروزرسانی
vercel.json                / → /Mamali/ + rewrite + API
api/session.js             قفل یک‌دستگاهی
history/versions.json      آرشیو نسخه‌ها
android/                   نمونه APK: FLAG_SECURE + portrait
ios/README.md
docs/
tests/smoke.mjs
PROJECT_GUIDE_FOR_NEXT_AI.md  همین فایل
```

## 4. جریان کاربر
1. باز کردن https://mamali-orbit.vercel.app/Mamali/
2. اسکریپت early در head: تشخیص دستگاه + قفل جهت + گرفتن `#id_token`
3. `AuthManager` در IndexedDB دنبال حساب فعال می‌گردد
4. اگر active: unlock. اگر نه: دروازه ورود
5. روی سایت دسکتاپ: دکمه سفید + دکمه رسمی GIS
6. روی اپ Chrome اندروید / PWA: دکمه سفید «ورود با گوگل» ریدایرکت می‌کند به accounts.google.com و با `#id_token` برمی‌گردد
7. JWT با JWK گوگل در مرورگر verify می‌شود. توکن ذخیره نمی‌شود
8. `SessionLockManager` ادعا می‌کند این ایمیل مال همین deviceId است
9. اگر ایمیل روی دستگاه دیگری زنده باشد: ورود رد می‌شود تا آنجا خروج بزند
10. بعد از ورود: مدار سه‌بعدی، پورتال‌ها، نصب، بروزرسانی، آرشیو نسخه‌ها

## 5. ورود گوگل در اپ اندروید (مهم‌ترین باگ قدیمی)
Google داخل PWA standalone پاپ‌آپ GIS را می‌بندد.

راه‌حل 3.5:
- دکمه اصلی `#googlePrimaryButton` → `startGoogleLogin()`
- اگر `prefersOAuthRedirect()` (PWA / WebView / Android): `window.location.assign` به OAuth implicit
- `redirect_uri` روی Vercel همیشه `https://mamali-orbit.vercel.app/Mamali/`
- توکن از hash/query به sessionStorage می‌رود و `handleExternalToken` آن را verify می‌کند

در Google Cloud Console باید باشد:
- Authorized JavaScript origins: `https://mamali-orbit.vercel.app`
- Authorized redirect URIs: `https://mamali-orbit.vercel.app/Mamali/`
- Client ID (عمومی): `737314975140-nhilm65a3mr9bsemufr4e83cmhisq77e.apps.googleusercontent.com`
- هیچ Client Secret داخل مخزن نگذار

## 6. قفل جهت
- اندروید / iOS / سایت موبایل: portrait
- ویندوز: landscape
- دسکتاپ دیگر: آزاد
- Manifest: `orientation: any` تا JS بتواند جدا تصمیم بگیرد
- `#rotatePrompt` باید کلاس `is-visible` بگیرد وگرنه CSS آن را مخفی نگه می‌دارد

## 7. اسکرین‌شات
- وب ۱۰۰٪ قابل بستن نیست
- 3.5 حداکثر تلاش: تاری روی blur/visibility، بلاک چاپ و کلیک‌راست، PrintScreen
- APK: `FLAG_SECURE` در `android/MainActivity.java`

## 8. مجوزها
- `#permissionDialog` باید در HTML باشد (در 3.4 جا افتاده بود و کار نمی‌کرد)
- Notification + storage.persist + orientation.lock
- فقط روی Android / PWA / wrapper، اولین ورود

## 9. قفل یک ایمیل = یک دستگاه
- `POST /api/session` با actionهای claim / heartbeat / release / status
- deviceId در localStorage: `mamali_device_id_v1`
- TTL ۱۵ دقیقه بعد از آخرین heartbeat
- اگر KV_REST_API_URL و KV_REST_API_TOKEN روی Vercel باشد، قفل پایدار است
- بدون KV: حافظه همان instance (بهترین تلاش). ورود اگر API در دسترس نباشد fail-open است تا کسی قفل نشود
- برای قفل جدی، در Vercel یک Upstash/KV وصل کن

## 10. باگ‌هایی که 3.5 و 3.6.2 درست کردند
- `$('#secureSetting')` و `$('#portraitSetting')` در HTML نبودند → `applySettings` بعد ورود کرش می‌کرد
- `#permissionDialog` نبود
- rotate prompt کلاس `is-visible` نداشت
- ورود گوگل در Chrome PWA به پاپ‌آپ وابسته بود



### افزوده‌های 3.6.2
- نسخه‌های 3.6.1 / 3.6.0 / 3.5.0 / 3.3.1 تا 3.0.0 از `history/play/era.html?v=` باز می‌شوند.
- نسخه 3.4.0 مسیر جدا دارد: `history/play/3.4.0/` و دیتابیس `mamali-archive-identity-340`.
- هیچ آیتم آرشیو نباید `play:null` داشته باشد.
- `SessionLockManager` و API heartbeat نباید کاربر همان دستگاه را وسط کار بیرون بیندازد.
- دکمه فرمان سریع روی موبایل مخفی نشود؛ اگر کلاس `command-launch` اضافه شد، `display:none` ممنوع است.

## 11. دیتابیس محلی
- IndexedDB: `mamali-trusted-identity-v1` نسخه 2
- store `sessions` + `events`
- فقط profile: sub, email, name, picture, verifiedAt — نه idToken

## 12. دیپلوی
- شاخه Arena این جلسه: `arena/01a01b45-mamali` — روی همین کار کن
- Vercel پروژه `mamali-orbit` از `main` پروداکشن می‌سازد
- برای زنده کردن سایت یا PR به main بده یا `vercel --prod`
- تست: `node --check assets/app.js && node tests/smoke.mjs`

## 13. امنیت توکن‌ها
کاربر قبلاً توکن Vercel و GitHub را در چت گذاشته. آن‌ها را داخل کد نگذار، commit نکن، revoke را پیشنهاد بده.
Client ID گوگل عمومی است.

## 14. چیزهایی که نباید خراب کنی
- `phone-frame` سایز اصلی (278 / 220 / 205)
- گوگل orb گرد 50%
- دقیقاً ۶ کارت feature-card
- start_url و rewrite `/Mamali/`
- زبان fa و dir=rtl

## 15. سوال‌های ساده برای کاربر
1. اپ را از Chrome نصب کرده یا APK وب‌ویو؟
2. ویندوز افقی بماند یا همه‌جا عمودی؟
3. قفل یک‌دستگاهی KV پایدار می‌خواهد؟
4. اسکرین‌شات وب نرم باشد یا حداکثر؟

---
Mamali Orbit 3.6.2 — Arena.ai Agent — 2026-08-19
