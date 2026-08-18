# Mamali Orbit 3.1

مرکز فرمان اجتماعی سه‌بعدی، قابل نصب روی Android و Windows، با ورود Google، دستگاه مورد اعتماد و اجرای آفلاین کنترل‌شده.

**نسخه زنده:** [hydryanamyrly33-rgb.github.io/Mamali](https://hydryanamyrly33-rgb.github.io/Mamali/)

## قابلیت‌های نسخه ۳.۱

- دروازه ورود تمام‌صفحه؛ رابط اصلی تا احراز هویت `hidden`، `inert` و غیرقابل دسترسی می‌ماند
- ورود رسمی با **Google Identity Services** و مسیر مدرن **FedCM**
- اعتبارسنجی رمزنگاری‌شده JWT در مرورگر با کلید عمومی چرخشی Google
- کنترل `alg`، امضا، `aud`، `azp`، `iss`، `exp`، `iat`، `nbf`، `nonce` و ایمیل تأییدشده
- دیتابیس محلی IndexedDB برای دستگاه مورد اعتماد، بدون ذخیره ID Token یا Access Token
- بازگشت خودکار نشست فعال و دکمه «ادامه با همین حساب» پس از قفل‌کردن
- میانبر ویژه حساب ذخیره‌شده در Windows و رابط Google مناسب لمس در Android
- امکان قفل و خروج از Mamali یا حذف کامل نمایه از همان دستگاه
- ورود آفلاین فقط برای دستگاهی که قبلاً با Google تأیید و مورد اعتماد شده است
- حفظ همه قابلیت‌های ۳.۰: نصب Android/Windows، گوشی سه‌بعدی تعاملی، ساعت واقعی، App Linkهای بومی و بروزرسانی زنده

## تنظیم Google OAuth

Client ID وب برنامه در `SITE_CONFIG.googleClientId` قرار دارد. Client ID یک شناسه عمومی است و نباید با Client Secret اشتباه شود؛ **هیچ Client Secret یا کلید خصوصی نباید داخل این مخزن قرار گیرد.**

در Google Cloud Console، برای OAuth 2.0 Web Client باید این مبدأ در بخش **Authorized JavaScript origins** ثبت شود:

```text
https://hydryanamyrly33-rgb.github.io
```

مبدأ باید بدون مسیر `/Mamali/` نوشته شود. برای توسعه محلی می‌توان مبدأ دقیق سرور محلی را نیز جداگانه افزود، برای مثال:

```text
http://localhost:8080
```

صفحه Consent Screen، نام برنامه و وضعیت انتشار/Test Users نیز باید در Google Cloud Console صحیح باشند. این پیاده‌سازی از Callback جاوااسکریپتی و `ux_mode: popup` استفاده می‌کند و Redirect URI سمت سرور ندارد.

## چرخه ورود و دستگاه مورد اعتماد

### اولین ورود

1. `AuthManager` رابط اصلی را پنهان و غیرقابل تعامل نگه می‌دارد.
2. کتابخانه رسمی Google Identity Services از `accounts.google.com` بارگذاری می‌شود.
3. کاربر از دکمه رسمی Google و Account Chooser/FedCM استفاده می‌کند.
4. Google یک ID Token کوتاه‌عمر به Callback می‌دهد.
5. Mamali امضای RS256 را با JWK عمومی Google بررسی می‌کند و ادعاهای امنیتی را اعتبارسنجی می‌کند.
6. فقط نمایه حداقلی و وضعیت اعتماد در IndexedDB ثبت می‌شود؛ رشته Token ذخیره نمی‌شود.
7. پس از تأیید، رابط اصلی از حالت `inert` خارج و راه‌اندازی می‌شود.

### بازگشت، قفل و خروج

- اگر نشست محلی هنوز `active` باشد، وب‌سایت یا PWA همان دستگاه بدون تکرار Account Chooser باز می‌شود.
- «قفل و خروج از ماملی» نشست فعال را می‌بندد، اما حساب مورد اعتماد را برای ادامه یک‌لمسی نگه می‌دارد.
- در Windows، کارت «ادامه با همان حساب گوگل» در گوشه رابط ورود نمایش داده می‌شود.
- در Android، کارت حساب ذخیره‌شده و دکمه رسمی Google با اندازه مناسب لمس نمایش داده می‌شوند.
- «حذف حساب از این دستگاه» رکورد IndexedDB را با تأیید دومرحله‌ای پاک می‌کند. این کار حساب Google کاربر را حذف نمی‌کند.

## رفتار آفلاین

Service Worker پوسته برنامه را Online-first نگه می‌دارد. Google Sign-In برای اولین ورود به اینترنت نیاز دارد، اما کاربری که قبلاً روی همان Browser Profile تأیید شده است دو مسیر آفلاین دارد:

- نشست فعال: PWA پس از بازشدن آفلاین به‌طور خودکار ادامه می‌دهد.
- نشست قفل‌شده: کاربر روی حساب ذخیره‌شده می‌زند و مجوز محلی همان دستگاه را ادامه می‌دهد.

اگر دستگاه هیچ حساب مورد اعتمادی نداشته باشد، در حالت آفلاین دروازه ورود بسته می‌ماند و پیام روشن «اولین ورود نیازمند اینترنت است» نمایش داده می‌شود. این رفتار از گرفتارشدن کاربران قبلی جلوگیری می‌کند، بدون آن‌که یک کاربر تازه بتواند از دروازه عبور کند.

## مرز امنیتی مهم

Mamali روی GitHub Pages و بدون Backend اختصاصی اجرا می‌شود. بنابراین دروازه ۳.۱ یک **کنترل دسترسی سمت کاربر برای رابط و PWA** است و برای محافظت از داده عمومی همین برنامه مناسب است. اعتبار Token واقعاً با امضای Google بررسی می‌شود، اما برای پروژه‌ای که داده محرمانه، API خصوصی یا مجوزهای مالی دارد باید ID Token در Backend نیز اعتبارسنجی، Session امن `HttpOnly` صادر و همه APIها در سرور محافظت شوند.

## اپ Android و Windows

Mamali یک Progressive Web App استاندارد است و همان پروژه روی دو سیستم‌عامل نصب می‌شود.

### Android

1. نسخه زنده را در Google Chrome باز کنید.
2. وارد حساب Google شوید.
3. دکمه «نصب اپ اندروید» یا گزینه **Install app** را بزنید.
4. آیکون Mamali به Launcher اضافه و برنامه بدون نوار مرورگر اجرا می‌شود.

### Windows 10/11

1. سایت را در Microsoft Edge یا Google Chrome باز کنید.
2. وارد حساب Google شوید.
3. آیکون Install در نوار آدرس یا **Apps → Install Mamali** را انتخاب کنید.
4. Mamali وارد Start Menu می‌شود و می‌توان آن را به Taskbar پین کرد.

نسخه Windows یک EXE سنتی نیست؛ Edge/Chrome آن را به‌شکل اپ دسکتاپ مستقل نصب و بروزرسانی می‌کند.

## بروزرسانی زنده

نسخه ۳.۱ همچنان از سه لایه بروزرسانی استفاده می‌کند:

1. `version.json` آخرین SemVer و Release Noteها را منتشر می‌کند.
2. `UpdateManager` هنگام آنلاین‌شدن یا بازگشت به برنامه نسخه سرور را بررسی می‌کند.
3. Service Worker جدید در حالت `waiting` می‌ماند تا کاربر فعال‌سازی را تأیید کند؛ سپس پیام `SKIP_WAITING` دریافت می‌کند و برنامه با نسخه تازه راه‌اندازی می‌شود.

`version.json` هرگز از Cache پاسخ داده نمی‌شود. Update Center هنگام قطعی خاکستری و غیرفعال است و پس از اتصال دوباره خودکار بررسی می‌شود.

## نسخه‌گذاری SemVer

نسخه فعلی `3.1.0` است:

- `major` برای تغییر ناسازگار یا معماری بزرگ: `3.1.0 → 4.0.0`
- `minor` برای قابلیت جدید سازگار: `3.1.0 → 3.2.0`
- `patch` برای رفع اشکال: `3.1.0 → 3.1.1`

```bash
node scripts/release.mjs major
node scripts/release.mjs minor
node scripts/release.mjs patch
# یا نسخه دقیق
node scripts/release.mjs 3.2.0
```

## قابلیت‌های سه‌بعدی و App Linkها

- `DeviceTiltController`: Drag لمسی/موس، عمق، اینرسی، نور و بازگشت فنری گوشی
- ساعت واقعی دستگاه با Time Zone محلی مرورگر
- Instagram: Android Intent و `instagram://app`
- YouTube: Android Intent و `youtube://`
- Telegram: `tg://resolve?domain=Mr_CaceRo`
- همه App Linkها فقط پس از عمل مستقیم کاربر اجرا می‌شوند و Fallback وب دارند

## ساختار پروژه

```text
.
├── .github/workflows/quality.yml
├── index.html
├── manifest.webmanifest
├── version.json
├── sw.js
├── scripts/release.mjs
├── assets/
│   ├── app.js
│   ├── styles.css
│   ├── icons/
│   └── screenshots/
└── tests/smoke.mjs
```

## اجرای محلی

```bash
python3 -m http.server 8080
```

سپس `http://localhost:8080` را باز کنید. برای تست واقعی Google باید همین مبدأ دقیق در Authorized JavaScript origins کلاینت OAuth ثبت شده باشد. بدون آن، رابط ورود نمایش داده می‌شود اما Google ورود را با خطای Origin رد می‌کند.

## بررسی کیفیت

```bash
node --check assets/app.js
node --check sw.js
node --check scripts/release.mjs
node tests/smoke.mjs
```

Smoke Test هماهنگی نسخه، Client ID، دروازه قفل‌شده، IndexedDB، اعتبارسنجی JWT، FedCM، Windows/Android PWA، Update Center، Service Worker، App Linkها، آیکون‌ها و Manifest را بررسی می‌کند.

## حریم خصوصی

- Mamali تبلیغ، Tracker یا Analytics ندارد.
- هنگام ورود، مرورگر برای احراز هویت با Google Identity Services ارتباط برقرار می‌کند؛ سیاست حریم خصوصی Google بر همان مرحله اعمال می‌شود.
- ID Token فقط در حافظه Callback اعتبارسنجی و سپس رها می‌شود.
- شناسه Google (`sub`)، نام، ایمیل، تصویر اختیاری، زمان تأیید و وضعیت دستگاه مورد اعتماد در IndexedDB همان Browser Profile نگه‌داری می‌شود.
- تنظیمات ظاهر همچنان فقط در `localStorage` همان دستگاه هستند.
- کاربر هر زمان می‌تواند اطلاعات حساب محلی را از پنل «حساب و امنیت دستگاه» حذف کند.
