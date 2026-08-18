# Mamali Orbit 3.0

مرکز فرمان اجتماعی سه‌بعدی، چندسکویی و قابل نصب روی Android و Windows.

**نسخه زنده:** [hydryanamyrly33-rgb.github.io/Mamali](https://hydryanamyrly33-rgb.github.io/Mamali/)

## قابلیت‌های اصلی نسخه ۳.۰

- موتور مدار سه‌بعدی بومی با CSS 3D و `requestAnimationFrame`
- گوشی سه‌بعدی چندلایه با عمق، انعکاس، لبه‌های فیزیکی و مدارهای نوری
- حرکت گوشی با Hover، Drag موس و لمس انگشت، به‌همراه اینرسی و بازگشت فنری
- ساعت واقعی دستگاه کاربر با Time Zone محلی مرورگر
- نصب مستقیم به‌صورت اپ مستقل روی **Android و Windows 10/11**
- مرکز بروزرسانی زنده با تشخیص SemVer، اعلان نسخه جدید و فعال‌سازی با تأیید کاربر
- غیرفعال‌شدن هوشمند Update Center هنگام قطع اینترنت
- راهبرد Online-first؛ دریافت نسخه تازه آنلاین و استفاده از Cache فقط هنگام قطعی
- سه تم Neon، Aurora و Solar
- پنل تنظیمات سینمایی با موج انرژی، سوییچ‌های متحرک و ذخیره در `localStorage`
- Command Palette با میانبر `Ctrl/⌘ + K`
- اجرای مستقیم Instagram، YouTube و Telegram با fallback امن وب
- بدون Framework، تبلیغات، Tracker، Analytics یا وابستگی CDN
- CSP محدود، Responsive کامل، SEO و دسترس‌پذیری

## اپ Android و Windows

Mamali یک **Progressive Web App استاندارد** است. همان پروژه روی دو سیستم‌عامل مثل اپ مستقل نصب می‌شود:

### Android

1. نسخه زنده را در Google Chrome باز کنید.
2. دکمه «نصب اپ اندروید» یا گزینه **Install app** را بزنید.
3. آیکون Mamali به Launcher اضافه می‌شود.
4. برنامه بدون نوار مرورگر و در پنجره مستقل اجرا می‌شود.

### Windows 10/11

1. سایت را در Microsoft Edge یا Google Chrome باز کنید.
2. آیکون Install در نوار آدرس یا گزینه **Apps → Install Mamali** را انتخاب کنید.
3. Mamali وارد Start Menu می‌شود و می‌توان آن را به Taskbar پین کرد.
4. برنامه در پنجره مستقل، با آیکون و میانبرهای Manifest اجرا می‌شود.

این نسخه یک فایل EXE سنتی نیست؛ نسخه Windows از قابلیت نصب PWA خود Edge/Chrome استفاده می‌کند. نتیجه برای کاربر یک اپ دسکتاپ مستقل در Start Menu است، اما بروزرسانی و امنیت آن بدون Installer جداگانه مدیریت می‌شود.

## بروزرسانی زنده واقعی

نسخه ۳.۰ از سه لایه برای بروزرسانی استفاده می‌کند:

1. **`version.json`** آخرین نسخه پایدار، نسخه قبلی، تاریخ انتشار، پلتفرم‌ها و Release Noteها را منتشر می‌کند.
2. **`UpdateManager`** در `assets/app.js` به‌طور خودکار و هنگام بازگشت اینترنت نسخه سرور را بررسی می‌کند.
3. **Service Worker** جدید در حالت `waiting` می‌ماند تا کاربر دکمه بروزرسانی را بزند؛ سپس پیام `SKIP_WAITING` دریافت می‌کند، فعال می‌شود و برنامه را با نسخه جدید راه‌اندازی می‌کند.

رفتار Update Center:

- آنلاین و به‌روز: وضعیت سبز و بررسی دوره‌ای خودکار
- نسخه جدید: اعلان شناور، نمایش شماره جدید و دکمه «بروزرسانی»
- هنگام بروزرسانی: فعال‌سازی Worker جدید و Reload کنترل‌شده
- آفلاین: خاکستری، غیرفعال و بدون درخواست جعلی
- اتصال مجدد: بررسی خودکار نسخه بدون نیاز به بازکردن سایت اصلی

کاربر برای نسخه‌های بعدی نیازی به حذف برنامه و نصب دوباره ندارد.

## نسخه‌گذاری هوشمند SemVer

نسخه برنامه در حال حاضر `3.0.0` است و از الگوی عددی زیر استفاده می‌کند:

- `major` برای تغییر بزرگ: `3.0.0 → 4.0.0`
- `minor` برای قابلیت جدید: `3.0.0 → 3.1.0`
- `patch` برای رفع اشکال: `3.0.0 → 3.0.1`

اسکریپت انتشار، نسخه JavaScript، Service Worker، Cache، URLهای نسخه‌دار، HTML و `version.json` را هماهنگ تغییر می‌دهد:

```bash
node scripts/release.mjs major
node scripts/release.mjs minor
node scripts/release.mjs patch
# یا نسخه دقیق
node scripts/release.mjs 3.2.0
```

پس از اجرای اسکریپت باید Release Noteهای `version.json` تکمیل، تست‌ها اجرا و تغییرات Deploy شوند.

## Online-first و پشتیبان آفلاین

Service Worker ابتدا شبکه را با `cache: no-cache` بررسی می‌کند و پاسخ تازه را ذخیره می‌کند. فقط اگر درخواست شبکه شکست بخورد، پاسخ Cache برگردانده می‌شود.

`version.json` عمداً هرگز از Cache پاسخ داده نمی‌شود؛ بنابراین Update Center فقط وقتی سبز و فعال است که واقعاً به سرور وصل باشد.

فایل‌های JavaScript و CSS نیز با شماره نسخه بارگذاری می‌شوند تا HTML جدید هیچ‌وقت با کد قدیمی ترکیب نشود.

## گوشی سه‌بعدی تعاملی

`DeviceTiltController` مختصات اشاره‌گر یا لمس را به این متغیرها تبدیل می‌کند:

- جابه‌جایی سه‌بعدی X/Y
- چرخش X/Y/Z
- عمق و Scale هنگام Drag
- جهت سایه و نور محیط
- Parallax مدارهای اطراف
- سرعت و اینرسی پس از رهاکردن
- بازگشت فنری به موقعیت اصلی

در حالت Reduced Motion، اینرسی حذف و گوشی بدون حرکت اضافه Reset می‌شود.

## App Linkهای بومی

| سرویس | Android | iOS / Scheme | Fallback وب |
|---|---|---|---|
| Instagram | `intent:` + `com.instagram.android` | `instagram://app` | `instagram.com` |
| YouTube | `intent:` + `com.google.android.youtube` | `youtube://` | `youtube.com` |
| Telegram | `tg://resolve?domain=Mr_CaceRo` | همان Scheme | `t.me/Mr_CaceRo` |

Android Intentها شامل `S.browser_fallback_url` هستند. همه App Linkها فقط در پاسخ مستقیم به کلیک کاربر اجرا می‌شوند.

## ساختار پروژه

```text
.
├── .github/workflows/quality.yml
├── index.html
├── manifest.webmanifest
├── version.json
├── sw.js
├── scripts/
│   └── release.mjs
├── assets/
│   ├── app.js
│   ├── styles.css
│   ├── icons/
│   └── screenshots/
└── tests/
    └── smoke.mjs
```

## اجرای محلی

```bash
python3 -m http.server 8080
```

سپس `http://localhost:8080` را باز کنید. قابلیت Service Worker و نصب روی HTTPS یا localhost فعال است.

## بررسی کیفیت

```bash
node --check assets/app.js
node --check sw.js
node --check scripts/release.mjs
node tests/smoke.mjs
```

GitHub Actions همین بررسی‌ها را در هر Push و Pull Request اجرا می‌کند. Smoke Test هماهنگی نسخه، Windows/Android PWA، Update Center، Service Worker، App Linkها، آیکون‌ها و Manifest را بررسی می‌کند.

## حریم خصوصی

ساعت از زمان محلی مرورگر خوانده می‌شود و هیچ داده‌ای ارسال نمی‌کند. تنظیمات فقط روی دستگاه ذخیره می‌شوند. Update Center صرفاً فایل عمومی `version.json` را می‌خواند و هیچ شناسه، حساب کاربری یا اطلاعات تحلیلی ارسال نمی‌شود.
