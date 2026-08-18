# Mamali Orbit

مرکز فرمان اجتماعی سه‌بعدی، سبک و قابل نصب برای GitHub Pages.

[مشاهده نسخه زنده](https://hydryanamyrly33-rgb.github.io/Mamali/)

## قابلیت‌ها

- موتور مدار سه‌بعدی بومی با CSS 3D و `requestAnimationFrame`
- کنترل با Drag، لمس و کلیدهای جهت‌دار
- پس‌زمینه Canvas با کیفیت تطبیقی
- سه تم Neon، Aurora و Solar
- پنل تنظیمات با ذخیره امن در `localStorage`
- پشتیبانی از `prefers-reduced-motion` و حالت اقتصادی
- Command Palette با میانبر `Ctrl/⌘ + K`
- PWA قابل نصب و Service Worker برای اجرای آفلاین
- تلگرام با Deep Link مستقیم به اپلیکیشن و fallback وب
- بدون Framework، تبلیغات، Tracker یا Analytics
- CSP محدود، لینک‌های امن و بدون وابستگی CDN
- Responsive و مناسب موبایل، تبلت و دسکتاپ
- SEO، Open Graph، Sitemap، Robots و صفحه 404

## ساختار

```text
.
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
│   └── social-preview.svg
└── tests/
    └── smoke.mjs
```

## اجرای محلی

به‌دلیل Service Worker بهتر است پروژه را با HTTP اجرا کنید:

```bash
python3 -m http.server 8080
```

سپس `http://localhost:8080` را باز کنید.

## شخصی‌سازی لینک‌ها

تنظیم Deep Link تلگرام در ابتدای `assets/app.js` قرار دارد:

```js
telegram: {
  deepLink: 'tg://resolve?domain=Mr_CaceRo',
  fallback: 'https://t.me/Mr_CaceRo',
}
```

ساختار `tg://resolve?domain=...` مطابق مستندات رسمی Deep Link تلگرام است.

لینک‌های Instagram و YouTube داخل `index.html` و Command Palette در `assets/app.js` قابل تغییرند.

## بررسی کیفیت

```bash
node --check assets/app.js
node --check sw.js
node tests/smoke.mjs
```

همین بررسی‌ها با هر Push و Pull Request توسط GitHub Actions اجرا می‌شوند.

## حریم خصوصی

تنظیمات فقط داخل مرورگر ذخیره می‌شوند. سایت هیچ داده‌ای را به سرور ارسال نمی‌کند و هیچ ابزار ردیابی یا تحلیل رفتار ندارد.
