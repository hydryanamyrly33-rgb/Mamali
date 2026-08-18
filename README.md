# Mamali Orbit

مرکز فرمان اجتماعی سه‌بعدی، سریع و قابل نصب برای GitHub Pages.

**نسخه زنده:** [hydryanamyrly33-rgb.github.io/Mamali](https://hydryanamyrly33-rgb.github.io/Mamali/)

## قابلیت‌های اصلی

- موتور مدار سه‌بعدی بومی با CSS 3D و `requestAnimationFrame`
- کنترل با Drag، لمس و کلیدهای جهت‌دار
- پس‌زمینه Canvas با کیفیت تطبیقی
- سه تم Neon، Aurora و Solar
- پنل تنظیمات سینمایی با ورود مرحله‌ای، موج انرژی، سوییچ‌های متحرک و ذخیره امن در `localStorage`
- پشتیبانی از `prefers-reduced-motion`، حالت اقتصادی و Forced Colors
- Command Palette با میانبر `Ctrl/⌘ + K`
- **اجرای مستقیم اپ‌های Instagram، YouTube و Telegram** با fallback امن وب
- PWA آنلاین و همیشه به‌روز با آیکون‌های Android، حالت Standalone و پشتیبان آفلاین
- راهنمای تعاملی نصب Android درون خود برنامه
- بدون Framework، تبلیغات، Tracker، Analytics یا وابستگی CDN
- CSP محدود، لینک‌های امن، Responsive کامل و SEO

## App Linkهای بومی

هر سه پورتال از یک لانچر یکپارچه به نام `openNativeApp` در `assets/app.js` عبور می‌کنند:

| سرویس | Android | iOS / Scheme | Fallback وب |
|---|---|---|---|
| Instagram | Chrome `intent:` + پکیج `com.instagram.android` | `instagram://app` | `https://www.instagram.com/` |
| YouTube | Chrome `intent:` + پکیج `com.google.android.youtube` | `youtube://` | `https://www.youtube.com/` |
| Telegram | `tg://resolve?domain=Mr_CaceRo` | همان Scheme | `https://t.me/Mr_CaceRo` |

در Android، `intent:` شامل `S.browser_fallback_url` است؛ بنابراین اگر اپ نصب باشد مستقیماً اجرا می‌شود و در غیر این صورت Chrome نسخه وب را باز می‌کند. Schemeهای iOS/سایر سیستم‌ها نیز با رویدادهای `blur` و `visibilitychange` بررسی می‌شوند و در صورت پیدا نشدن اپ، پس از مکث کوتاه به نسخه وب می‌روند.

مرورگرها برای جلوگیری از سوءاستفاده فقط اجازه می‌دهند App Link در پاسخ مستقیم به کلیک کاربر اجرا شود؛ به همین دلیل انتقال داخل Handler همان کلیک انجام می‌شود و خودکار نیست.

## اپ Android چگونه ساخته شده؟

این پروژه یک **Progressive Web App (PWA)** است. برای قابل نصب شدن، چهار لایه دارد:

1. **HTTPS** — GitHub Pages پروژه را با اتصال امن ارائه می‌کند.
2. **Web App Manifest** — نام اپ، `start_url`، حالت `standalone`، رنگ‌ها، میانبرها و آیکون‌های ۱۹۲ و ۵۱۲ پیکسلی را تعریف می‌کند.
3. **Service Worker** — با راهبرد Online-first همیشه نسخه آنلاین را دوباره اعتبارسنجی می‌کند و فقط هنگام قطع شبکه سراغ Cache آفلاین می‌رود.
4. **Responsive App Shell** — رابط در پنجره مستقل، بدون نوار مرورگر و روی اندازه‌های مختلف درست کار می‌کند.

### نصب روی Android

1. نسخه زنده را در **Google Chrome** باز کنید.
2. دکمه «نصب اپ اندروید» داخل سایت را بزنید.
3. اگر Prompt خودکار در دسترس نبود، منوی سه‌نقطه Chrome و سپس **Install app** یا **Add to Home screen** را انتخاب کنید.
4. آیکون Mamali به Launcher اضافه می‌شود و برنامه در پنجره‌ای مستقل اجرا خواهد شد.

رویداد `beforeinstallprompt` در `assets/app.js` ذخیره می‌شود تا دکمه اختصاصی سایت Prompt بومی Android را باز کند. رویداد `appinstalled` نیز موفقیت نصب را ثبت و وضعیت دکمه‌ها را به‌روز می‌کند. در iOS، راهنمای دستی **Share → Add to Home Screen** نمایش داده می‌شود.

### آنلاین در حالت عادی، آفلاین فقط هنگام نیاز

نسخه نصب‌شده یک اپ آنلاین است و قابلیت‌های اینترنتی آن محدود نمی‌شوند. Service Worker نسخه `2.2.0` برای HTML، JavaScript، CSS و سایر فایل‌های داخلی ابتدا شبکه را بررسی می‌کند و پاسخ تازه را در Cache می‌گذارد. فقط اگر درخواست شبکه شکست بخورد، پاسخ ذخیره‌شده برگردانده می‌شود. همچنین URL نسخه‌دار CSS و JavaScript مانع ترکیب HTML جدید با کد قدیمی بعد از انتشار می‌شود.

در نتیجه:

- هنگام اتصال، کاربر همیشه تازه‌ترین نسخه GitHub Pages را می‌گیرد.
- هنگام قطع اینترنت، App Shell ذخیره‌شده همچنان اجرا می‌شود.
- پس از انتشار جدید، فایل قدیمی Service Worker باعث غیرفعال‌شدن دکمه‌های تازه نمی‌شود.

### تفاوت PWA و APK

- **PWA** از مرورگر نصب می‌شود، حجم کمی دارد و هر انتشار GitHub به‌طور خودکار نسخه نصب‌شده را به‌روز می‌کند.
- **APK/AAB** بسته بومی Android برای نصب مستقیم یا انتشار در Google Play است.
- اگر در آینده انتشار Play Store لازم باشد، همین PWA را می‌توان با **Trusted Web Activity (TWA)** و ابزارهایی مانند Bubblewrap به AAB تبدیل کرد؛ برای نصب فعلی Android نیازی به APK نیست.

همین توضیحات در بخش «اپ Android» و Dialog «جزئیات فنی نصب» داخل رابط برنامه نیز وجود دارد.

## ساختار پروژه

```text
.
├── .github/workflows/quality.yml
├── index.html
├── 404.html
├── manifest.webmanifest
├── sw.js
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── app.js
│   ├── styles.css
│   ├── favicon.svg
│   ├── social-preview.svg
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── icon-maskable-512.png
│   │   └── apple-touch-icon.png
│   └── screenshots/
└── tests/
    └── smoke.mjs
```

## اجرای محلی

به‌دلیل Service Worker پروژه را با HTTP اجرا کنید:

```bash
python3 -m http.server 8080
```

سپس `http://localhost:8080` را باز کنید. توجه کنید Prompt نصب کامل فقط روی HTTPS یا `localhost` و در مرورگر سازگار ظاهر می‌شود.

## شخصی‌سازی مقصدها

همه مقصدها در `SITE_CONFIG.apps` ابتدای `assets/app.js` متمرکز هستند. برای تغییر حساب یا کانال، Scheme، Android Intent و fallback همان سرویس را با هم به‌روزرسانی کنید. ویژگی‌های `data-native-app` در `index.html` شناسه سرویس هر کارت را مشخص می‌کنند.

## بررسی کیفیت

```bash
node --check assets/app.js
node --check sw.js
node tests/smoke.mjs
```

این بررسی‌ها با هر Push و Pull Request توسط GitHub Actions هم اجرا می‌شوند. Smoke Test وجود آیکون‌های PWA، تنظیمات Manifest، سه App Link، fallbackهای Android و راهنمای داخل برنامه را بررسی می‌کند.

## حریم خصوصی

تنظیمات فقط داخل مرورگر ذخیره می‌شوند. سایت هیچ داده‌ای را به سرور ارسال نمی‌کند و هیچ ابزار ردیابی یا تحلیل رفتار ندارد.
