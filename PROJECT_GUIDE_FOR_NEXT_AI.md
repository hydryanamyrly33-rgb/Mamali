# Mamali Orbit — راهنمای کامل برای AI بعدی (نسخه 3.8.0)

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
- فعلی: `3.8.0`
- آرشیو داخل برنامه: بخش `#versions` و فایل `history/versions.json`
- bump نسخه: `node scripts/release.mjs patch|minor|major`

### مهم: آرشیو در ۳.۸.۰ خلوت شد
فقط دو نسخه می‌مانند:
- زنده: `/Mamali/` → نسخه ۳.۸.۰
- آرشیو: `/Mamali/history/play/3.0.0/` → نسخهٔ نخست ۳.۰.۰ (پوشه واقعی با `index.html` + `app.js` + `styles.css`)
- نسخه‌های میانی ۳.۱.۰ تا ۳.۶.۲ حذف شده‌اند؛ اگر خواستی دوباره اضافه‌شان کنی، پوشه واقعی هر نسخه را در `history/play/` برگردان و ورودی‌اش را در `history/versions.json` اضافه کن.
- در نسخهٔ ۳.۰.۰ دکمهٔ «بازگشت به نسخهٔ جدید» هست که به `/Mamali/` برمی‌گردد.
- IndexedDB جدا: `mamali-archive-identity-300`
- Service Worker آرشیو ثبت نمی‌شود تا PWA زنده را ندزدد
- `history/play/era.html` فقط fallback است، مسیر اصلی کارت‌ها نیست

## 3. ساختار فایل‌ها
```
index.html                 صفحه ورود + اپ زنده
assets/app.js              قلب برنامه زنده
assets/styles.css          ظاهر زنده
manifest.webmanifest       PWA — orientation: any (JS تصمیم می‌گیرد)
sw.js                      Service Worker online-first
version.json               کانال بروزرسانی
vercel.json                / → /Mamali/ + rewrite + API + play folders
api/session.js             قفل یک‌دستگاهی
history/versions.json      آرشیو نسخه‌ها (فقط 3.8.0 و 3.0.0)
history/play/3.0.0/        خود نسخهٔ نخست واقعی
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
10. «قفل و خروج از ماملی» قفل سرور را release می‌کند تا همان ایمیل روی دستگاه دیگر وارد شود
11. بعد از ورود: مدار سه‌بعدی، پورتال‌ها، نصب، بروزرسانی، آرشیو نسخه‌ها

## 5. ورود گوگل در اپ اندروید
Google داخل PWA standalone پاپ‌آپ GIS را می‌بندد.

راه‌حل:
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
- حداکثر تلاش: تاری روی blur/visibility، بلاک چاپ و کلیک‌راست، PrintScreen
- APK: `FLAG_SECURE` در `android/MainActivity.java`

## 8. مجوزها
- `#permissionDialog` باید در HTML باشد
- Notification + storage.persist + orientation.lock
- فقط روی Android / PWA / wrapper، اولین ورود

## 9. قفل یک ایمیل = یک دستگاه
- `POST /api/session` با actionهای claim / heartbeat / release / status
- deviceId در localStorage: `mamali_device_id_v1`
- TTL ۱۴ روز بعد از آخرین heartbeat؛ تا خروج نزند جای دیگر وارد نشود
- «قفل و خروج» و «حذف حساب» هر دو `release` می‌زنند
- اگر KV_REST_API_URL و KV_REST_API_TOKEN روی Vercel باشد، قفل بین instanceها پایدار است
- بدون KV: حافظه + فایل `/tmp` همان instance. ورود اگر API در دسترس نباشد fail-open است
- برای قفل جدی چندسروره، در Vercel یک Upstash/KV وصل کن

## 10. باگ‌هایی که تا 3.8.0 درست شدند
- کلیک نسخه‌ها می‌رفت یک صفحه ثابت era.html
- فرمان سریع روی گوشی مخفی می‌شد
- heartbeat کاربر را وسط کار پرت می‌کرد
- GIS popup داخل PWA اندروید می‌مرد
- «قفل و خروج» ایمیل را آزاد نمی‌کرد
- در 3.8.0 آرشیو شلوغ بود؛ خلوت شد به نسخهٔ نخست ۳.۰.۰ + نسخهٔ نو ۳.۸.۰ و نسخهٔ نخست دکمهٔ «بازگشت به نسخهٔ جدید» گرفت

## 11. دیتابیس محلی
- زنده: IndexedDB `mamali-trusted-identity-v1` نسخه 2
- آرشیو: `mamali-archive-identity-300` (فقط برای 3.0.0)
- store `sessions` + `events`
- فقط profile: sub, email, name, picture, verifiedAt — نه idToken

## 12. دیپلوی
- Vercel پروژه `mamali-orbit` از `main` پروداکشن می‌سازد
- برای زنده کردن سایت PR به main بده
- تست: `node --check assets/app.js && node tests/smoke.mjs`

## 13. امنیت توکن‌ها
توکن Vercel و GitHub را داخل کد نگذار، commit نکن.
Client ID گوگل عمومی است.

## 14. چیزهایی که نباید خراب کنی
- `phone-frame` سایز اصلی (278 / 220 / 205)
- گوگل orb گرد 50%
- دقیقاً ۶ کارت feature-card
- start_url و rewrite `/Mamali/`
- زبان fa و dir=rtl
- آرشیو فقط 3.0.0 و 3.8.0؛ نسخهٔ میانی بدون دلیل اضافه نکن

## 15. سوال‌های ساده برای کاربر
1. اپ را از Chrome نصب کرده یا APK وب‌ویو؟
2. ویندوز افقی بماند یا همه‌جا عمودی؟
3. قفل یک‌دستگاهی KV پایدار می‌خواهد؟
4. اسکرین‌شات وب نرم باشد یا حداکثر؟

---
Mamali Orbit 3.8.0 — Arena.ai Agent — 2026-08-19
