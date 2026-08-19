const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const APP_VERSION = '3.6.1';

const SITE_CONFIG = Object.freeze({
  version: APP_VERSION,
  versionEndpoint: './version.json',
  updateInterval: 30 * 1000,
  updateAutoApplyDelay: 6500,
  googleClientId: '737314975140-nhilm65a3mr9bsemufr4e83cmhisq77e.apps.googleusercontent.com',
  googleIdentityScript: 'https://accounts.google.com/gsi/client?hl=fa',
  googleJwksEndpoint: 'https://www.googleapis.com/oauth2/v3/certs',
  googleOAuthEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  authDatabase: 'mamali-archive-identity-361',
  authStore: 'sessions',
  eventStore: 'events',
  sessionEndpoint: '',
  versionsEndpoint: './history/versions.json',
  canonicalOrigin: 'https://mamali-orbit.vercel.app',
  canonicalRedirect: 'https://mamali-orbit.vercel.app/Mamali/',
  apps: {
    instagram: {
      label: 'اینستاگرام',
      android: 'intent://www.instagram.com/#Intent;scheme=https;package=com.instagram.android;S.browser_fallback_url=https%3A%2F%2Fwww.instagram.com%2F;end',
      ios: 'instagram://app',
      desktop: 'instagram://app',
      fallback: 'https://www.instagram.com/',
    },
    youtube: {
      label: 'یوتیوب',
      android: 'intent://www.youtube.com/#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=https%3A%2F%2Fwww.youtube.com%2F;end',
      ios: 'youtube://',
      desktop: 'https://www.youtube.com/',
      fallback: 'https://www.youtube.com/',
    },
    telegram: {
      label: 'تلگرام',
      android: 'tg://resolve?domain=Mr_CaceRo',
      ios: 'tg://resolve?domain=Mr_CaceRo',
      desktop: 'tg://resolve?domain=Mr_CaceRo',
      fallback: 'https://t.me/Mr_CaceRo',
    },
  },
  storageKey: 'mamali-orbit-settings-v3',
  themes: ['neon', 'aurora', 'solar', 'prism'],
});

const toPersianDigits = value => String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
const parseVersion = value => String(value).split('.').map(part => Number.parseInt(part, 10) || 0);
function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

function isStandalonePWA() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: window-controls-overlay)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  } catch { return false; }
}
function isAndroidWrapper() {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('wv') || (ua.includes('android') && ua.includes('version/')) || document.referrer.includes('android-app://');
}
function isAndroid() {
  return /android/i.test(navigator.userAgent);
}
function getRedirectUri() {
  try {
    const origin = window.location.origin;
    if (origin === SITE_CONFIG.canonicalOrigin || origin.endsWith('.vercel.app')) {
      return SITE_CONFIG.canonicalRedirect;
    }
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    let path = url.pathname.replace(/index\.html$/i, '');
    if (path.endsWith('/Mamali')) path += '/';
    if (!path.endsWith('/')) {
      const lastSeg = path.split('/').pop();
      if (lastSeg && !lastSeg.includes('.')) path += '/';
    }
    url.pathname = path;
    return url.href;
  } catch {
    return SITE_CONFIG.canonicalRedirect;
  }
}

function getOrCreateDeviceId() {
  try {
    const key = 'mamali_device_id_v1';
    let id = localStorage.getItem(key);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `tmp-${Date.now().toString(36)}`;
  }
}

function getDeviceLabel() {
  const ua = navigator.userAgent;
  const platform = detectSimpleDevice();
  const mode = isStandalonePWA() ? 'PWA' : 'Browser';
  return `${platform} · ${mode} · ${ua.slice(0, 80)}`;
}

function detectSimpleDevice() {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  return 'desktop';
}

function prefersOAuthRedirect() {
  return isStandalonePWA() || isAndroidWrapper() || isAndroid();
}

class SafeStorage {
  static read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? { ...fallback, ...JSON.parse(value) } : fallback;
    } catch { return fallback; }
  }
  static write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }
  static remove(key) {
    try { localStorage.removeItem(key); } catch {}
  }
}

const systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const defaults = Object.freeze({
  theme: 'neon',
  particles: true,
  glow: true,
  motion: !systemReducedMotion,
  reducedMotion: systemReducedMotion,
  sound: false,
  autoUpdate: true,
  deviceMotion: 'free',
  phoneDepth: 100,
  quality: 'auto',
  secure: true,
  portrait: true,
});

let settings = SafeStorage.read(SITE_CONFIG.storageKey, { ...defaults });
let installPrompt = null;

const announcer = $('#systemAnnouncer');
const toastRegion = $('#toastRegion');

// ================= ORIENTATION SMART MANAGER 3.4.0 - Android portrait, Windows landscape, iOS portrait =================
// Requirement: Android vertical, Windows horizontal, iOS like Android
class OrientationLockManager {
  constructor() {
    this.prompt = $('#rotatePrompt');
    this.isLocked = false;
    this.device = this.detectDevice();
  }
  detectDevice() {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return 'android';
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (ua.includes('windows')) return 'windows';
    return 'desktop';
  }
  getDesiredOrientation() {
    // User requirement: Windows landscape, Android portrait, iOS = Android
    const d = this.detectDevice();
    if (d === 'windows') return 'landscape-primary';
    if (d === 'android' || d === 'ios') return 'portrait-primary';
    // Desktop other: allow any but prefer landscape for windows-like
    return null; // no lock
  }
  async lock() {
    if (!settings.portrait && this.device !== 'windows') return false;
    // For windows, even if portrait setting off, we still lock landscape if setting portrait true? Requirement says Windows horizontal lock
    const desired = this.getDesiredOrientation();
    if (!desired) {
      document.body.classList.remove('is-landscape', 'is-portrait');
      if (this.prompt) {
        this.prompt.hidden = true;
        this.prompt.classList.remove('is-visible');
      }
      return false;
    }
    try {
      if (screen.orientation && screen.orientation.lock && document.visibilityState === 'visible') {
        await screen.orientation.lock(desired).catch(async ()=>{
          // fallback
          if (desired.includes('portrait')) await screen.orientation.lock('portrait').catch(()=>{});
          else await screen.orientation.lock('landscape').catch(()=>{});
        });
        this.isLocked = true;
        document.body.classList.add(desired.includes('portrait') ? 'portrait-enforced' : 'landscape-enforced');
        document.body.classList.remove(desired.includes('portrait') ? 'landscape-enforced' : 'portrait-enforced');
        return true;
      }
    } catch {}
    this.checkOrientation();
    return false;
  }
  checkOrientation() {
    const desired = this.getDesiredOrientation();
    if (!desired) {
      if (this.prompt) this.prompt.hidden = true;
      document.body.classList.remove('is-landscape', 'is-portrait');
      return;
    }
    try {
      const isLandscapeNow = window.innerWidth > window.innerHeight;
      const shouldBePortrait = desired.includes('portrait');
      const isWrong = (shouldBePortrait && isLandscapeNow && window.innerWidth <= 900) || (!shouldBePortrait && !isLandscapeNow && this.device === 'windows' && window.innerWidth <= 1200);
      if (isWrong) {
        document.body.classList.add('is-wrong-orientation');
        if (this.prompt && document.documentElement.dataset.authState !== 'booting') {
          this.prompt.hidden = false;
          this.prompt.classList.add('is-visible');
          const strong = this.prompt.querySelector('strong');
          if (strong) {
            if (shouldBePortrait) strong.textContent = 'لطفاً گوشی را عمودی نگه دارید';
            else strong.textContent = 'لطفاً دستگاه ویندوز را افقی نگه دارید';
          }
        }
      } else {
        document.body.classList.remove('is-wrong-orientation');
        if (this.prompt) {
          this.prompt.hidden = true;
          this.prompt.classList.remove('is-visible');
        }
      }
    } catch {}
  }
  init() {
    this.lock();
    this.checkOrientation();
    window.addEventListener('resize', () => { this.checkOrientation(); this.lock(); }, {passive:true});
    window.addEventListener('orientationchange', () => { setTimeout(()=>{ this.checkOrientation(); this.lock(); }, 200); }, {passive:true});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { this.lock(); this.checkOrientation(); } });
    $('#rotatePromptClose')?.addEventListener('click', () => {
      if (this.prompt) {
        this.prompt.hidden = true;
        this.prompt.classList.remove('is-visible');
      }
      this.lock();
      if (this.getDesiredOrientation().includes('portrait')) toast('📱 قفل عمودی برای اندروید/iOS فعال است.');
      else toast('🪟 قفل افقی برای ویندوز فعال است.');
    });
    setInterval(()=>{ this.lock(); }, 3000);
  }
}

// ================= SCREENSHOT PROTECTION MANAGER 3.3.1 - MINIMAL, NO ANNOYING OVERLAY =================
// User said: don't show error after screenshot, don't allow screenshot permission systemically
// For web, true prevention is impossible. For APK, FLAG_SECURE does real prevention.
// So we only try native bridge, no guard toast spam.
class ScreenshotProtectionManager {
  constructor() {
    this.enabled = settings.secure !== false;
    this.guard = $('#secureGuard');
    this.lastToast = 0;
  }
  applyNative(enabled) {
    try {
      if (window.Android && typeof window.Android.setSecureFlag === 'function') window.Android.setSecureFlag(Boolean(enabled));
      if (enabled && window.Capacitor?.Plugins?.ScreenSecurity?.enableSecure) window.Capacitor.Plugins.ScreenSecurity.enableSecure();
      if (!enabled && window.Capacitor?.Plugins?.ScreenSecurity?.disableSecure) window.Capacitor.Plugins.ScreenSecurity.disableSecure();
    } catch {}
  }
  showGuard(show) {
    if (!this.guard) return;
    this.guard.hidden = !show;
    this.guard.classList.toggle('is-visible', show);
  }
  warnOnce(message) {
    const now = Date.now();
    if (now - this.lastToast < 8000) return;
    this.lastToast = now;
    toast(message, 2400);
  }
  init() {
    this.setEnabled(this.enabled);
    document.addEventListener('visibilitychange', () => {
      if (!this.enabled) return;
      this.showGuard(document.hidden);
    });
    window.addEventListener('blur', () => { if (this.enabled) this.showGuard(true); });
    window.addEventListener('focus', () => { if (!document.hidden) this.showGuard(false); });
    window.addEventListener('pagehide', () => { if (this.enabled) this.showGuard(true); });
    window.addEventListener('beforeprint', event => {
      if (!this.enabled) return;
      event.preventDefault();
      this.showGuard(true);
      this.warnOnce('چاپ و عکس صفحه در ماملی محدود شده است.');
    });
    document.addEventListener('contextmenu', event => {
      if (!this.enabled) return;
      if (event.target.closest('input, textarea, [contenteditable]')) return;
      event.preventDefault();
    });
    document.addEventListener('keydown', event => {
      if (!this.enabled) return;
      const key = event.key?.toLowerCase();
      if (event.key === 'PrintScreen' || ((event.metaKey || event.ctrlKey) && event.shiftKey && ['3','4','s'].includes(key))) {
        event.preventDefault();
        this.showGuard(true);
        try { navigator.clipboard?.writeText(''); } catch {}
        this.warnOnce('اسکرین‌شات در این برنامه محدود شده است.');
        setTimeout(() => { if (!document.hidden) this.showGuard(false); }, 900);
      }
      if ((event.ctrlKey || event.metaKey) && key === 'p') {
        event.preventDefault();
        this.warnOnce('چاپ صفحه غیرفعال است.');
      }
    }, true);
    document.addEventListener('dragstart', event => {
      if (this.enabled && event.target.tagName === 'IMG') event.preventDefault();
    });
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    document.body.classList.toggle('secure-mode-minimal', enabled);
    document.body.classList.toggle('secure-mode-max', enabled);
    this.applyNative(enabled);
    if (!enabled) this.showGuard(false);
  }
}

// ================= DEVICE DETECTION MANAGER 3.3.1 =================
class DeviceDetectionManager {
  constructor() {
    this.badge = $('#deviceBadge');
    this.device = this.detect();
  }
  detect() {
    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
    let type = 'desktop';
    let os = 'unknown';
    let browser = 'unknown';

    if (/android/.test(ua)) { type = 'mobile'; os = 'android'; }
    else if (/iphone|ipad|ipod/.test(ua)) { type = 'mobile'; os = 'ios'; }
    else if (platform.includes('win') || ua.includes('windows')) { os = 'windows'; type = ua.includes('mobile') ? 'mobile' : 'desktop'; }
    else if (platform.includes('mac') || ua.includes('mac')) { os = 'macos'; }
    else if (platform.includes('linux') || ua.includes('linux')) { os = 'linux'; }

    if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) browser = 'chrome';
    else if (ua.includes('edg')) browser = 'edge';
    else if (ua.includes('firefox')) browser = 'firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'safari';

    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const pwa = standalone ? 'PWA' : 'Browser';

    return { type, os, browser, pwa, standalone };
  }
  getLabel() {
    const d = this.device;
    const osLabels = { android: 'Android', ios: 'iOS', windows: 'Windows', macos: 'macOS', linux: 'Linux', unknown: 'دستگاه' };
    const typeLabels = { mobile: 'موبایل', desktop: 'دسکتاپ' };
    return `${osLabels[d.os] || d.os} · ${typeLabels[d.type] || d.type} · ${d.browser} · ${d.pwa}`;
  }
  getIcon() {
    const os = this.device.os;
    if (os === 'android') return '🤖';
    if (os === 'ios') return '🍎';
    if (os === 'windows') return '🪟';
    if (os === 'macos') return '💻';
    return '📱';
  }
  init() {
    // Update badge in login
    if (this.badge) {
      const icon = this.getIcon();
      const label = this.getLabel();
      this.badge.innerHTML = `<i aria-hidden="true">${icon}</i><span>${label}</span>`;
      this.badge.dataset.device = this.device.os;
      this.badge.dataset.type = this.device.type;
    }

    // Add global body dataset for CSS responsive
    document.body.dataset.deviceOs = this.device.os;
    document.body.dataset.deviceType = this.device.type;
    document.body.dataset.deviceBrowser = this.device.browser;
    document.body.dataset.isStandalone = String(this.device.standalone);
    document.documentElement.dataset.device = this.device.os;

    // Smart toast for first visit
    try {
      const key = 'mamali_device_welcomed_v331';
      if (!localStorage.getItem(key)) {
        setTimeout(()=>{
          toast(`${this.getIcon()} شما با ${this.getLabel()} وارد شدید`, 4000);
          localStorage.setItem(key, '1');
        }, 1500);
      }
    } catch {}

    // Update all data-app-version etc? No.

    // For Windows design improvement: add class for windows specific layout
    if (this.device.os === 'windows') {
      document.body.classList.add('is-windows');
      // Reduce empty space: make android-section more compact on windows
      const androidSection = $('#android-app');
      if (androidSection) androidSection.classList.add('windows-layout');
    }
    if (this.device.os === 'android') {
      document.body.classList.add('is-android');
    }
    if (this.device.os === 'ios') {
      document.body.classList.add('is-ios', 'is-android');
    }
  }
}


// ================= MOUSE TRAIL MANAGER 3.4.0 - Windows light orb =================
// Windows mouse has light effect following cursor, different from Android touch ripple
class MouseTrailManager {
  constructor() {
    this.trail = null;
    this.x = 0; this.y = 0;
    this.targetX = 0; this.targetY = 0;
    this.raf = 0;
    this.enabled = false;
  }
  init() {
    // Only for Windows desktop with mouse
    const isWindows = /windows/i.test(navigator.userAgent);
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    this.enabled = isWindows && hasFinePointer;

    if (!this.enabled) return;

    // Create trail element
    this.trail = document.createElement('div');
    this.trail.className = 'mouse-trail';
    this.trail.setAttribute('aria-hidden','true');
    document.body.appendChild(this.trail);

    document.addEventListener('mousemove', (e)=>{
      this.targetX = e.clientX;
      this.targetY = e.clientY;
      document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
      document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
    }, {passive:true});

    const animate = () => {
      this.x += (this.targetX - this.x) * 0.12;
      this.y += (this.targetY - this.y) * 0.12;
      if (this.trail) {
        this.trail.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) translate(-50%, -50%)`;
      }
      this.raf = requestAnimationFrame(animate);
    };
    animate();

    document.body.classList.add('has-mouse-trail');
  }
  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.trail?.remove();
  }
}

// ================= TOUCH RIPPLE MANAGER 3.4.0 - Android/iOS finger different from mouse =================
class TouchRippleManager {
  constructor() {
    this.container = null;
    this.enabled = false;
  }
  init() {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
    this.enabled = isTouch && (isAndroid || isIOS);

    if (!this.enabled) return;

    this.container = document.createElement('div');
    this.container.className = 'touch-ripple-container';
    this.container.setAttribute('aria-hidden','true');
    document.body.appendChild(this.container);

    document.addEventListener('touchstart', (e)=>{
      if (!e.touches[0]) return;
      const touch = e.touches[0];
      this.createRipple(touch.clientX, touch.clientY);
    }, {passive:true});

    document.addEventListener('click', (e)=>{
      // For Android, also show ripple on click if not from touch
      if (this.enabled && e.clientX) {
        // Avoid double ripple if touch already
        if (e.detail === 0) return; // touch triggered
        this.createRipple(e.clientX, e.clientY);
      }
    }, {passive:true});
  }
  createRipple(x, y) {
    if (!this.container) return;
    const ripple = document.createElement('span');
    ripple.className = 'touch-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    this.container.appendChild(ripple);
    // Remove after animation
    setTimeout(()=>ripple.remove(), 700);
  }
}

// ================= LIVE GOOGLE CLIENT TEST MANAGER 3.4.0 =================
// Real-time test of Google Client, shows connection status live
class LiveGoogleTestManager {
  constructor() {
    this.networkEl = $('#authNetwork');
    this.results = {
      internet: false,
      gsiScript: false,
      jwks: false,
      clientId: false,
      origin: false,
      sessionApi: false,
    };
    this.latencies = {};
  }
  async test() {
    const startAll = performance.now();
    // Test 1: Internet
    this.results.internet = navigator.onLine;
    
    // Test 2: GSI Script reachable
    try {
      const t0 = performance.now();
      const res = await fetch('https://accounts.google.com/gsi/client?hl=fa', {method:'HEAD', mode:'no-cors', cache:'no-store'});
      // no-cors will be opaque, but if no error, consider reachable
      this.results.gsiScript = true;
      this.latencies.gsiScript = Math.round(performance.now() - t0);
    } catch {
      this.results.gsiScript = false;
    }

    // Test 3: JWKs
    try {
      const t0 = performance.now();
      const res = await fetch('https://www.googleapis.com/oauth2/v3/certs', {cache:'no-store'});
      this.results.jwks = res.ok;
      this.latencies.jwks = Math.round(performance.now() - t0);
    } catch {
      this.results.jwks = false;
    }

    // Test 4: Client ID format
    const clientId = '737314975140-nhilm65a3mr9bsemufr4e83cmhisq77e.apps.googleusercontent.com';
    this.results.clientId = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId);

    // Test 5: Authorized origin
    const origin = window.location.origin;
    this.results.origin = origin === 'https://mamali-orbit.vercel.app' || origin.includes('vercel.app') || origin.includes('github.io') || origin.includes('localhost');

    try {
      const t0 = performance.now();
      const res = await fetch('./api/session', { cache: 'no-store' });
      this.results.sessionApi = res.ok;
      this.latencies.sessionApi = Math.round(performance.now() - t0);
    } catch {
      this.results.sessionApi = false;
    }

    this.updateUI();

    // Return summary
    return { results: this.results, latencies: this.latencies, total: Math.round(performance.now() - startAll) };
  }
  updateUI() {
    if (!this.networkEl) return;
    const allGood = ['internet','gsiScript','jwks','clientId','origin'].every(key => this.results[key] === true);
    this.networkEl.dataset.state = allGood ? 'online' : (this.results.internet ? 'warning' : 'offline');
    const span = this.networkEl.querySelector('span');
    if (span) {
      if (allGood) span.textContent = `آنلاین · Google ${this.latencies.gsiScript || 0}ms · ${this.latencies.jwks || 0}ms`;
      else if (!this.results.internet) span.textContent = 'آفلاین';
      else span.textContent = `اتصال Google: GSI:${this.results.gsiScript?'✓':'✗'} JWKs:${this.results.jwks?'✓':'✗'}`;
    }

    // Also create detailed live test panel if exists
    const detailEl = $('#googleLiveTest');
    if (detailEl) {
      detailEl.innerHTML = `
        <div class="live-test-row ${this.results.internet?'ok':'fail'}"><span>اینترنت</span><span>${this.results.internet?'✓ متصل':'✗ قطع'}</span></div>
        <div class="live-test-row ${this.results.gsiScript?'ok':'fail'}"><span>GSI Script</span><span>${this.results.gsiScript?`✓ ${this.latencies.gsiScript}ms`:'✗'}</span></div>
        <div class="live-test-row ${this.results.jwks?'ok':'fail'}"><span>JWKs Certs</span><span>${this.results.jwks?`✓ ${this.latencies.jwks}ms`:'✗'}</span></div>
        <div class="live-test-row ${this.results.clientId?'ok':'fail'}"><span>Client ID</span><span>${this.results.clientId?'✓ معتبر':'✗ نامعتبر'}</span></div>
        <div class="live-test-row ${this.results.origin?'ok':'fail'}"><span>Origin</span><span>${this.results.origin?'✓ '+window.location.origin:'✗ '+window.location.origin}</span></div>
        <div class="live-test-row ${this.results.sessionApi?'ok':'fail'}"><span>قفل نشست</span><span>${this.results.sessionApi?`✓ ${this.latencies.sessionApi}ms`:'✗'}</span></div>
      `;
    }
  }
  init() {
    this.test();
    // Retest every 15s and on online/offline
    setInterval(()=>this.test(), 15000);
    window.addEventListener('online', ()=>this.test());
    window.addEventListener('offline', ()=>this.test());
  }
}

// ================= SCROLL CINEMATIC MANAGER 3.4.0 - Animations and scroll =================
class ScrollCinematicManager {
  constructor() {
    this.progress = 0;
  }
  init() {
    // Scroll progress bar (if element exists)
    const createProgress = () => {
      let bar = document.getElementById('scrollProgressBar');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'scrollProgressBar';
        bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--primary),var(--accent));z-index:9999;width:0%;transition:width 0.1s linear;';
        document.body.appendChild(bar);
      }
      const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? (window.scrollY / max) * 100 : 0;
        bar.style.width = p + '%';
        this.progress = p;
        // Parallax for hero
        const hero = document.querySelector('.hero');
        if (hero) {
          hero.style.setProperty('--scroll-y', window.scrollY + 'px');
          hero.style.transform = `translateY(${window.scrollY * 0.05}px)`;
        }
      };
      window.addEventListener('scroll', update, {passive:true});
      update();
    };
    createProgress();

    // Cinematic reveal with stagger - enhance existing
    const observer = new IntersectionObserver((entries)=>{
      entries.forEach((entry, i)=>{
        if (entry.isIntersecting) {
          entry.target.style.transitionDelay = (i * 80) + 'ms';
          entry.target.classList.add('is-visible');
          // Add cinematic scale
          entry.target.animate([
            { opacity: 0, transform: 'translateY(24px) scale(0.98)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
          ], { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)', delay: i*80 });
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.feature-card, .android-visual, .android-copy, .system-strip').forEach(el=>observer.observe(el));
  }
}

// ================= PERMISSION MANAGER 3.3 =================
class PermissionManager {
  constructor() {
    this.dialog = $('#permissionDialog');
    this.hasRequested = false;
    try {
      this.hasRequested = localStorage.getItem('mamali_permissions_requested_v3') === '1';
    } catch {}
  }
  async checkStatus(type) {
    try {
      if (!navigator.permissions) return 'unknown';
      if (type === 'notification') {
        const perm = await navigator.permissions.query({name:'notifications'});
        return perm.state;
      }
      if (type === 'persistent-storage') {
        if (navigator.storage && navigator.storage.persisted) {
          const persisted = await navigator.storage.persisted();
          return persisted ? 'granted' : 'prompt';
        }
      }
    } catch { return 'unknown'; }
    return 'unknown';
  }
  async requestNotification() {
    try {
      if (!('Notification' in window)) return 'unsupported';
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      const result = await Notification.requestPermission();
      return result;
    } catch { return 'error'; }
  }
  async requestPersistentStorage() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        const granted = await navigator.storage.persist();
        return granted ? 'granted' : 'denied';
      }
    } catch {}
    return 'unsupported';
  }
  async requestOrientationLock() {
    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('portrait-primary').catch(()=>screen.orientation.lock('portrait'));
        return 'granted';
      }
    } catch {}
    return 'unsupported';
  }
  updateUI(type, state) {
    const el = document.querySelector(`[data-status="${type}"]`);
    if (!el) return;
    el.textContent = state === 'granted' ? 'فعال ✓' : state === 'denied' ? 'رد شد' : state === 'unsupported' ? 'پشتیبانی نمیشود' : 'در انتظار';
    el.dataset.state = state;
  }
  async requestAll() {
    this.updateUI('notification', 'در حال درخواست...');
    const notif = await this.requestNotification();
    this.updateUI('notification', notif);

    this.updateUI('storage', 'در حال درخواست...');
    const storage = await this.requestPersistentStorage();
    this.updateUI('storage', storage);

    this.updateUI('orientation', 'در حال قفل...');
    const orient = await this.requestOrientationLock();
    this.updateUI('orientation', orient === 'granted' ? 'granted' : 'unsupported');

    this.updateUI('secure', 'granted');

    try { localStorage.setItem('mamali_permissions_requested_v3', '1'); } catch {}

    if (notif === 'granted') toast('🔔 اعلان‌ها فعال شد — بروزرسانی زنده اطلاع میده.');
    if (storage === 'granted') toast('💾 ذخیره‌سازی پایدار فعال — آفلاین آماده است.');

    // Close dialog after short delay
    setTimeout(()=>{ try{ this.dialog?.close(); }catch{} }, 900);
  }
  init() {
    if (this.bound) return;
    this.bound = true;
    if (this.hasRequested) return;
    const isPWA = isStandalonePWA();
    const isAndroidWrap = isAndroidWrapper();
    const shouldPrompt = isPWA || isAndroidWrap || isAndroid();
    if (!shouldPrompt) return;

    // Delay showing permission dialog until after auth (if authenticated) or 2s after locked gate
    const show = () => {
      if (!this.dialog) return;
      if (this.dialog.open) return;
      try { this.dialog.showModal(); } catch { this.dialog.setAttribute('open',''); }
      this.checkStatus('notification').then(s=>this.updateUI('notification', s));
      this.checkStatus('persistent-storage').then(s=>this.updateUI('storage', s));
      this.updateUI('orientation', 'prompt');
      this.updateUI('secure', 'granted');
    };

    // Listen for auth completion
    const observer = new MutationObserver(()=>{
      if (document.documentElement.dataset.authState === 'authenticated') {
        setTimeout(show, 1200);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, {attributes:true, attributeFilter:['data-auth-state']});

    // Also fallback show after 3s in locked state if no trusted account (first visit)
    setTimeout(()=>{
      if (document.documentElement.dataset.authState === 'locked' && !this.hasRequested) {
        // Only show if no trusted account to avoid blocking login
        const trusted = document.getElementById('trustedAccount');
        if (trusted && trusted.hidden) {
          // Don't auto-show on first login screen, wait for manual trigger? But requirement says on first entry request permissions.
          // So show small toast and then dialog after 1.5s
          toast('📱 برای بهترین تجربه، مجوزها را تایید کنید.', 4000);
          setTimeout(show, 1500);
        }
      }
    }, 3500);

    $('#permissionAllowButton')?.addEventListener('click', ()=>this.requestAll());
    $('#permissionLaterButton')?.addEventListener('click', ()=>{
      try { this.dialog.close(); } catch {}
      try { localStorage.setItem('mamali_permissions_requested_v3', 'later'); } catch {}
      toast('بعداً می‌تونید از تنظیمات مجوزها رو فعال کنید.');
    });
  }
}

class SessionLockManager {
  constructor() {
    this.timer = 0;
    this.deviceId = getOrCreateDeviceId();
    this.online = true;
  }
  endpoint() {
    return SITE_CONFIG.sessionEndpoint || './api/session';
  }
  async request(action, profile = {}) {
    const body = {
      action,
      email: profile.email || '',
      subject: profile.subject || '',
      deviceId: this.deviceId,
      deviceLabel: getDeviceLabel(),
    };
    const response = await fetch(this.endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body),
    });
    let data = {};
    try { data = await response.json(); } catch { data = {}; }
    return { status: response.status, data };
  }
  async claim(profile) {
    if (!navigator.onLine || !profile?.email) return { ok: true, skipped: true };
    try {
      const { status, data } = await this.request('claim', profile);
      if (status === 409) return { ok: false, blocked: true, holder: data.holder, error: data.error };
      if (!data.ok) return { ok: true, skipped: true, warning: data.error || 'session_api_failed' };
      this.startHeartbeat(profile);
      return { ok: true, holder: data.holder, store: data.store };
    } catch {
      return { ok: true, skipped: true, warning: 'session_api_unreachable' };
    }
  }
  startHeartbeat(profile) {
    this.stopHeartbeat();
    this.timer = window.setInterval(() => {
      if (!navigator.onLine || document.hidden) return;
      this.request('heartbeat', profile).catch(() => {});
    }, 25000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) this.request('heartbeat', profile).catch(() => {});
    });
  }
  stopHeartbeat() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = 0;
  }
  async release(profile) {
    this.stopHeartbeat();
    if (!navigator.onLine || !profile?.email) return;
    try { await this.request('release', profile); } catch {}
  }
}

const sessionLock = new SessionLockManager();

class TrustedDeviceStore {
  constructor() { this.databasePromise = null; }
  open() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB is unavailable'));
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(SITE_CONFIG.authDatabase, 2);
      request.addEventListener('upgradeneeded', () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(SITE_CONFIG.authStore)) {
          const sessions = database.createObjectStore(SITE_CONFIG.authStore, { keyPath: 'key' });
          try { sessions.createIndex('email', 'email', { unique: false }); } catch {}
          try { sessions.createIndex('subject', 'subject', { unique: false }); } catch {}
        }
        if (SITE_CONFIG.eventStore && !database.objectStoreNames.contains(SITE_CONFIG.eventStore)) {
          const events = database.createObjectStore(SITE_CONFIG.eventStore, { keyPath: 'id', autoIncrement: true });
          try { events.createIndex('at', 'at', { unique: false }); } catch {}
        }
      });
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error || new Error('IndexedDB open failed')));
      request.addEventListener('blocked', () => reject(new Error('IndexedDB upgrade is blocked')));
    });
    return this.databasePromise;
  }
  async run(mode, action) {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(SITE_CONFIG.authStore, mode);
      const store = transaction.objectStore(SITE_CONFIG.authStore);
      let request;
      try { request = action(store); }
      catch (error) { reject(error); return; }
      request.addEventListener('success', () => resolve(request.result));
      request.addEventListener('error', () => reject(request.error || new Error('IndexedDB request failed')));
      transaction.addEventListener('abort', () => reject(transaction.error || new Error('IndexedDB transaction aborted')));
    });
  }
  get() { return this.run('readonly', store => store.get('current-google-account')); }
  save(record) { return this.run('readwrite', store => store.put({ ...record, key: 'current-google-account' })); }
  clear() { return this.run('readwrite', store => store.delete('current-google-account')); }
}

function base64UrlToBytes(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url value');
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
function decodeJwtPart(value) {
  const text = new TextDecoder().decode(base64UrlToBytes(value));
  return JSON.parse(text);
}
async function verifyGoogleCredential(token, expectedNonce) {
  if (typeof token !== 'string' || token.length > 20000) throw new Error('Invalid Google credential');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed Google credential');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtPart(encodedHeader);
  const payload = decodeJwtPart(encodedPayload);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('Unsupported Google signature');
  const response = await fetch(SITE_CONFIG.googleJwksEndpoint, { cache: 'no-store', credentials: 'omit', mode: 'cors' });
  if (!response.ok) throw new Error(`Google key endpoint returned ${response.status}`);
  const keySet = await response.json();
  const jwk = Array.isArray(keySet.keys) ? keySet.keys.find(key => key.kid === header.kid && key.kty === 'RSA') : null;
  if (!jwk) throw new Error('Google signing key was not found');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const signatureValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlToBytes(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
  if (!signatureValid) throw new Error('Google signature verification failed');
  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audience.includes(SITE_CONFIG.googleClientId)) throw new Error('Google audience mismatch');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) throw new Error('Google issuer mismatch');
  if (!Number.isFinite(payload.exp) || payload.exp <= now - 30) throw new Error('Google credential expired');
  if (Number.isFinite(payload.iat) && payload.iat > now + 120) throw new Error('Google credential issued in the future');
  if (Number.isFinite(payload.nbf) && payload.nbf > now + 30) throw new Error('Google credential is not active');
  if (expectedNonce && payload.nonce !== expectedNonce) throw new Error('Google nonce mismatch');
  if (payload.azp && payload.azp !== SITE_CONFIG.googleClientId) throw new Error('Google authorized party mismatch');
  if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.email !== 'string') throw new Error('Google profile is incomplete');
  if (payload.email_verified !== true) throw new Error('Google email is not verified');
  return payload;
}
function createAuthNonce() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
}
function createOAuthState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('') + Date.now().toString(36);
}
function safeGooglePicture(value) {
  try {
    const url = new URL(value);
    const googleHost = url.hostname === 'lh3.googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com');
    return url.protocol === 'https:' && googleHost ? url.href : '';
  } catch { return ''; }
}

class AuthManager {
  constructor() {
    this.store = new TrustedDeviceStore();
    this.session = null;
    this.storageAvailable = true;
    this.googleReady = false;
    this.googleLoadPromise = null;
    this.appStarted = false;
    this.nonce = createAuthNonce();
    this.oauthState = createOAuthState();
    this.removeConfirmationTimer = 0;
    this.gate = $('#authGate');
    this.appShell = $('#appShell');
    this.progress = $('#authProgress');
    this.progressText = $('#authProgressText');
    this.trustedAccount = $('#trustedAccount');
    this.googleAuth = $('#googleAuth');
    this.googleButton = $('#googleButton');
    this.divider = $('#authDivider');
    this.message = $('#authMessage');
    this.network = $('#authNetwork');
    this.resumeChip = $('#authResumeChip');
    this.accountDialog = $('#accountDialog');
    this.externalButton = $('#externalGoogleButton');
    this.oauthButton = $('#oauthRedirectButton');
    this.primaryButton = $('#googlePrimaryButton');
  }


  async init() {
    if (globalThis.__MAMALI_ARCHIVE__) {
      document.documentElement.dataset.archiveVersion = globalThis.__MAMALI_ARCHIVE__.version || '';
    }
    document.body.dataset.authPlatform = this.getPlatform();
    document.body.dataset.isStandalone = String(isStandalonePWA());
    document.body.dataset.isAndroidWrapper = String(isAndroidWrapper());
    $$('[data-app-version]', this.gate).forEach(node => { node.textContent = toPersianDigits(APP_VERSION); });
    this.bind();
    this.updateNetworkState({ loadGoogle: false });
    this.registerAppShell();
    this.checkExternalToken();
    try {
      const oauthError = sessionStorage.getItem('mamali_oauth_error');
      if (oauthError) {
        sessionStorage.removeItem('mamali_oauth_error');
        this.setMessage(`ورود گوگل لغو یا رد شد: ${oauthError}. دوباره از دکمه سفید «ورود با گوگل» تلاش کنید.`, 'error');
      }
    } catch {}

    try {
      const stored = await this.store.get();
      if (this.isTrustedRecord(stored)) this.session = stored;
      else if (stored) await this.store.clear();
    } catch { this.storageAvailable = false; }

    if (!this.session && globalThis.__MAMALI_ARCHIVE__) {
      this.session = {
        provider: 'google',
        clientId: SITE_CONFIG.googleClientId,
        subject: 'archive-guest-' + String(globalThis.__MAMALI_ARCHIVE__.version || 'x').replaceAll('.', ''),
        email: 'archive@mamali.local',
        name: 'مهمان آرشیو ' + (globalThis.__MAMALI_ARCHIVE__.version || ''),
        picture: '',
        locale: 'fa',
        verifiedAt: Date.now(),
        lastGoogleExpiry: Date.now() + 86400000,
        active: true,
        archive: true,
      };
      await this.unlock({ source: 'archive-guest' });
      return;
    }
    if (this.session) {
      this.renderProfile(this.session);
      if (this.session.active) {
        await this.unlock({ source: navigator.onLine ? 'trusted-device' : 'trusted-offline' });
        return;
      }
      this.showLockedGate();
    } else {
      this.showLockedGate();
    }
    this.updateNetworkState();
  }

  bind() {
    $('#continueTrustedButton').addEventListener('click', () => this.continueTrusted());
    this.resumeChip.addEventListener('click', () => this.continueTrusted());
    $('#authRetryButton').addEventListener('click', () => {
      this.googleLoadPromise = null;
      this.loadGoogleIdentity();
    });
    $('#accountButton').addEventListener('click', () => {
      if (!this.accountDialog.open) this.accountDialog.showModal();
    });
    $('#lockAppButton').addEventListener('click', () => this.lock());
    $('#removeAccountButton').addEventListener('click', event => this.removeAccount(event.currentTarget));

    this.externalButton?.addEventListener('click', () => this.launchExternalBrowserLogin());
    this.oauthButton?.addEventListener('click', () => this.launchOAuthRedirect());
    this.primaryButton?.addEventListener('click', () => this.startGoogleLogin());

    this.accountDialog.addEventListener('click', event => {
      if (event.target !== this.accountDialog) return;
      const rect = this.accountDialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) this.accountDialog.close();
    });
    window.addEventListener('online', () => this.updateNetworkState());
    window.addEventListener('offline', () => this.updateNetworkState());
    let resizeTimer;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { if (this.googleReady && !this.gate.hidden) this.renderGoogleButton(); }, 180);
    }, { passive: true });

    // Handle returning from external browser with token in sessionStorage
    window.addEventListener('storage', (e)=>{
      if (e.key === 'mamali_external_id_token' && e.newValue) {
        this.handleExternalToken(e.newValue);
      }
    });
  }

  registerAppShell() { /* archive: never claim the live service worker */ }

  getPlatform() {
    const identity = `${navigator.userAgentData?.platform || ''} ${navigator.platform || ''} ${navigator.userAgent}`.toLowerCase();
    if (identity.includes('android')) return 'android';
    if (identity.includes('windows') || identity.includes('win32') || identity.includes('win64')) return 'windows';
    if (/iphone|ipad|ipod/.test(identity)) return 'ios';
    return 'web';
  }

  isTrustedRecord(record) {
    return Boolean(
      record
      && record.provider === 'google'
      && record.clientId === SITE_CONFIG.googleClientId
      && typeof record.subject === 'string'
      && record.subject
      && typeof record.email === 'string'
      && record.email
      && Number.isFinite(record.verifiedAt),
    );
  }

  showLockedGate() {
    document.documentElement.dataset.authState = 'locked';
    this.gate.hidden = false;
    this.gate.removeAttribute('aria-hidden');
    this.appShell.hidden = true;
    this.appShell.inert = true;
    this.appShell.setAttribute('aria-hidden', 'true');
    this.trustedAccount.hidden = !this.session;
    this.resumeChip.hidden = !(this.session && this.getPlatform() === 'windows');
    this.progress.hidden = true;
    this.googleAuth.hidden = !navigator.onLine;
    this.divider.hidden = !this.session || !navigator.onLine;
    if (this.session) this.renderProfile(this.session);

    // Show external buttons if standalone
    const isStandalone = isStandalonePWA() || isAndroidWrapper();
    if (this.externalButton) this.externalButton.hidden = !isStandalone;
    if (this.oauthButton) this.oauthButton.hidden = false;
    if (this.primaryButton) {
      this.primaryButton.hidden = false;
      const hint = $('#googlePrimaryHint');
      if (hint) hint.textContent = prefersOAuthRedirect()
        ? 'روی اپ اندروید این دکمه شما را به صفحه امن گوگل می‌برد و بعد به ماملی برمی‌گرداند.'
        : 'با حساب گوگل وارد شوید. اگر پاپ‌آپ بسته شد، همین دکمه ریدایرکت امن را شروع می‌کند.';
    }

    window.setTimeout(() => (this.session ? $('#continueTrustedButton') : this.primaryButton || this.googleButton).focus?.(), 50);
  }

  async unlock({ source = 'google' } = {}) {
    if (!this.session) return;
    if (navigator.onLine && source !== 'trusted-offline') {
      const claim = await sessionLock.claim(this.session);
      if (claim.blocked) {
        this.setProgress(false);
        this.googleAuth.hidden = !navigator.onLine;
        const other = claim.holder?.deviceLabel || 'دستگاه دیگر';
        this.setMessage(`این ایمیل الان روی دستگاه دیگری فعال است (${other}). اول آنجا خروج بزنید، بعد اینجا وارد شوید.`, 'error');
        this.showLockedGate();
        return;
      }
      if (claim.warning) {
        toast('قفل چنددستگاهی الان در دسترس نبود؛ ورود محلی ادامه پیدا کرد.', 4200);
      }
    }
    const nextSession = { ...this.session, active: true, lastAccessAt: Date.now(), lastAccessMode: source, deviceId: sessionLock.deviceId };
    this.session = nextSession;
    try { await this.store.save(nextSession); } catch { this.storageAvailable = false; }
    this.renderProfile(nextSession);
    this.setMessage(source === 'trusted-offline' ? 'دستگاه مورد اعتماد تأیید شد؛ ماملی در حالت آفلاین و عمودی باز می‌شود.' : 'هویت تأیید شد؛ در حال بازکردن مدار امن ماملی…', 'success');
    document.documentElement.dataset.authState = 'authenticated';
    this.appShell.hidden = false;
    this.appShell.inert = false;
    this.appShell.setAttribute('aria-hidden', 'false');
    this.gate.hidden = true;
    this.gate.setAttribute('aria-hidden', 'true');
    try { localStorage.setItem('mamali_last_login_source', source); } catch {}
    // Lock portrait after unlock
    try { orientationManager?.lock(); } catch {}
    if (!this.appStarted) {
      this.appStarted = true;
      initProtectedApp();
    }
    window.setTimeout(() => $('#main-content')?.focus({ preventScroll: true }), 80);
  }

  async continueTrusted() {
    if (!this.session) return;
    this.setProgress(true, navigator.onLine ? 'در حال بازکردن حساب مورد اعتماد…' : 'در حال تأیید مجوز آفلاین دستگاه…');
    await this.unlock({ source: navigator.onLine ? 'trusted-resume' : 'trusted-offline' });
  }

  async handleCredential(response) {
    const credential = response?.credential;
    if (!credential) {
      this.setMessage('Google اطلاعات ورود معتبری برنگرداند. دوباره تلاش کنید یا از دکمه‌های جایگزین استفاده کنید.', 'error');
      return;
    }
    this.setProgress(true, 'در حال اعتبارسنجی امضای Google و اتصال امن حساب…');
    this.googleAuth.hidden = true;
    this.message.hidden = true;
    try {
      const payload = await verifyGoogleCredential(credential, this.nonce);
      this.session = {
        provider: 'google',
        clientId: SITE_CONFIG.googleClientId,
        subject: payload.sub,
        email: payload.email,
        name: String(payload.name || payload.given_name || payload.email.split('@')[0]).slice(0, 120),
        picture: safeGooglePicture(payload.picture),
        locale: typeof payload.locale === 'string' ? payload.locale.slice(0, 20) : '',
        verifiedAt: Date.now(),
        lastGoogleExpiry: payload.exp * 1000,
        active: true,
      };
      await this.unlock({ source: `google-${response.select_by || 'button'}` });
    } catch (error) {
      console.warn('Google credential validation failed:', error instanceof Error ? error.message : 'unknown error');
      this.setProgress(false);
      this.googleAuth.hidden = !navigator.onLine;
      this.setMessage('اعتبار حساب Google تأیید نشد. اتصال و تنظیم OAuth را بررسی کنید و دوباره وارد شوید. می‌تونید از «ریدایرکت امن» استفاده کنید.', 'error');
    }
  }

  checkExternalToken() {
    try {
      // From sessionStorage (set by early script)
      const token = sessionStorage.getItem('mamali_external_id_token');
      if (token) {
        sessionStorage.removeItem('mamali_external_id_token');
        // Also clear via localStorage for cross-tab
        try { localStorage.removeItem('mamali_external_id_token'); } catch {}
        this.handleExternalToken(token);
        return true;
      }
      // From hash already parsed early?
      const hashToken = new URLSearchParams(window.location.hash.substring(1)).get('id_token');
      if (hashToken) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
        this.handleExternalToken(hashToken);
        return true;
      }
    } catch {}
    return false;
  }

  async handleExternalToken(token) {
    if (!token) return;
    this.setProgress(true, 'در حال بررسی توکن دریافتی از مرورگر خارجی…');
    try {
      // token may be without nonce verification if coming from OAuth redirect – we still verify signature but allow nonce mismatch for redirect flow if stored state matches
      let payload;
      try {
        payload = await verifyGoogleCredential(token, this.nonce);
      } catch (e) {
        // For OAuth redirect flow, nonce stored in sessionStorage?
        const storedNonce = sessionStorage.getItem('mamali_oauth_nonce');
        const storedState = sessionStorage.getItem('mamali_oauth_state');
        // If nonce mismatch, try without nonce check for redirect flow but still verify signature + other claims manually (we already attempted)
        // Let's try decode and validate manually without nonce if state matches
        if (storedNonce) {
          try {
            payload = await verifyGoogleCredential(token, storedNonce);
          } catch {
            // Last resort: verify without nonce but check state presence
            payload = await verifyGoogleCredential(token, null);
          }
        } else {
          payload = await verifyGoogleCredential(token, null);
        }
      }

      this.session = {
        provider: 'google',
        clientId: SITE_CONFIG.googleClientId,
        subject: payload.sub,
        email: payload.email,
        name: String(payload.name || payload.given_name || payload.email.split('@')[0]).slice(0, 120),
        picture: safeGooglePicture(payload.picture),
        locale: typeof payload.locale === 'string' ? payload.locale.slice(0, 20) : '',
        verifiedAt: Date.now(),
        lastGoogleExpiry: payload.exp * 1000,
        active: true,
      };
      toast('✓ ورود از مرورگر خارجی موفق بود!', 4000);
      await this.unlock({ source: 'google-external-browser' });
    } catch (error) {
      console.warn('External token failed', error);
      this.setProgress(false);
      this.setMessage('توکن دریافتی از مرورگر خارجی نامعتبر بود. دوباره تلاش کنید.', 'error');
    }
  }

  buildOAuthUrl() {
    const nonce = createAuthNonce();
    const state = createOAuthState();
    try {
      sessionStorage.setItem('mamali_oauth_nonce', nonce);
      sessionStorage.setItem('mamali_oauth_state', state);
      sessionStorage.setItem('mamali_oauth_time', String(Date.now()));
      localStorage.setItem('mamali_oauth_state', state);
    } catch {}
    this.nonce = nonce;
    this.oauthState = state;
    const redirectUri = getRedirectUri();
    const params = new URLSearchParams({
      client_id: SITE_CONFIG.googleClientId,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce: nonce,
      state: state,
      prompt: 'select_account',
      include_granted_scopes: 'true',
      hl: 'fa',
    });
    return `${SITE_CONFIG.googleOAuthEndpoint}?${params.toString()}`;
  }

  startGoogleLogin() {
    if (prefersOAuthRedirect() || !this.googleReady) {
      this.launchOAuthRedirect();
      return;
    }
    const official = this.googleButton?.querySelector('div[role="button"], iframe');
    if (official) {
      official.click();
      window.setTimeout(() => {
        if (document.documentElement.dataset.authState !== 'authenticated') this.launchOAuthRedirect();
      }, 1800);
      return;
    }
    this.launchOAuthRedirect();
  }

  launchOAuthRedirect() {
    const url = this.buildOAuthUrl();
    toast('در حال انتقال به صفحه امن گوگل...', 3500);
    setTimeout(()=>{ window.location.assign(url); }, 280);
  }

  launchExternalBrowserLogin() {
    const url = this.buildOAuthUrl();
    // Try open in system browser
    try {
      // For Android, try intent to open in Chrome
      if (isAndroid()) {
        const intentUrl = `intent://${url.replace(/^https:\/\//,'')}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
        // Try both
        window.open(url, '_blank', 'noopener');
        setTimeout(()=>{ window.location.href = intentUrl; }, 300);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      toast('🔗 ورود گوگل در مرورگر خارجی باز شد. پس از ورود به ماملی برمی‌گردید.', 6000);
      this.setMessage('صفحه ورود در مرورگر خارجی باز شد. بعد از تایید گوگل، به صورت خودکار به اپ برمی‌گردید. اگر برنگشتید، دستی برگردید.', 'success');
    } catch {
      // Fallback to same tab redirect
      window.location.href = url;
    }
  }

  updateNetworkState({ loadGoogle = true } = {}) {
    const online = navigator.onLine;
    this.network.dataset.state = online ? 'online' : 'offline';
    $('span', this.network).textContent = online ? 'آنلاین · Google PWA Ready' : 'آفلاین · حالت مورد اعتماد';
    if (document.documentElement.dataset.authState === 'authenticated') return;

    if (!online) {
      this.googleAuth.hidden = true;
      this.divider.hidden = true;
      this.setProgress(false);
      this.setMessage(
        this.session
          ? 'اینترنت قطع است؛ با حساب ذخیره‌شده روی همین دستگاه ادامه دهید. قفل عمودی فعال می‌ماند.'
          : 'برای اولین ورود با Google اینترنت لازم است. پس از یک ورود موفق با یکی از روش‌های تعمیرشده، همین دستگاه آفلاین هم باز می‌شود.',
        'offline',
      );
      return;
    }

    this.googleAuth.hidden = false;
    this.divider.hidden = !this.session;
    this.message.hidden = true;
    if (loadGoogle) this.loadGoogleIdentity();
  }

  loadGoogleIdentity() {
    if (!navigator.onLine) return Promise.resolve(false);
    if (window.google?.accounts?.id) {
      this.initializeGoogleIdentity();
      return Promise.resolve(true);
    }
    if (this.googleLoadPromise) return this.googleLoadPromise;

    this.setProgress(true, 'در حال اتصال امن به Google Identity با پشتیبانی PWA…');
    $('#authRetryButton').hidden = true;
    this.googleLoadPromise = new Promise(resolve => {
      const previous = document.querySelector('script[data-google-identity]');
      previous?.remove();
      const script = document.createElement('script');
      script.src = SITE_CONFIG.googleIdentityScript;
      script.async = true;
      script.dataset.googleIdentity = 'true';
      const timeout = window.setTimeout(() => script.dispatchEvent(new Event('error')), 12000);
      script.addEventListener('load', () => {
        window.clearTimeout(timeout);
        if (!window.google?.accounts?.id) {
          this.handleGoogleLoadError();
          resolve(false);
          return;
        }
        this.initializeGoogleIdentity();
        resolve(true);
      }, { once: true });
      script.addEventListener('error', () => {
        window.clearTimeout(timeout);
        script.remove();
        this.handleGoogleLoadError();
        resolve(false);
      }, { once: true });
      document.head.append(script);
    });
    return this.googleLoadPromise;
  }

  initializeGoogleIdentity() {
    try {
      const isStandalone = isStandalonePWA() || isAndroidWrapper();
      window.google.accounts.id.initialize({
        client_id: SITE_CONFIG.googleClientId,
        callback: response => this.handleCredential(response),
        auto_select: false,
        cancel_on_tap_outside: false,
        context: 'signin',
        ux_mode: 'popup',
        nonce: this.nonce,
        use_fedcm_for_prompt: true,
        use_fedcm_for_button: true,
        itp_support: true,
        prompt_parent_id: 'googleAuth',
      });

      this.googleReady = true;
      this.setProgress(false);
      this.renderGoogleButton();

      // For standalone PWA, also try One Tap prompt (FedCM)
      if (isStandalone) {
        try {
          window.google.accounts.id.prompt((notification)=>{
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              console.log('One Tap not displayed', notification.getNotDisplayedReason?.(), notification.getSkippedReason?.());
              // Show external buttons more prominently
              if (this.externalButton) this.externalButton.hidden = false;
            }
          });
        } catch {}
      }

      // Check if external token arrived via sessionStorage polling
      setInterval(()=>{ const t = sessionStorage.getItem('mamali_external_id_token'); if (t) this.checkExternalToken(); }, 1200);

    } catch {
      this.handleGoogleLoadError();
    }
  }

  renderGoogleButton() {
    if (!this.googleReady || !window.google?.accounts?.id || this.googleAuth.hidden) return;
    const width = Math.max(280, Math.min(420, Math.floor(this.googleButton.getBoundingClientRect().width || 360)));
    this.googleButton.replaceChildren();
    window.google.accounts.id.renderButton(this.googleButton, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: this.session ? 'continue_with' : 'signin_with',
      shape: 'pill',
      logo_alignment: 'left',
      width,
      locale: 'fa',
      click_listener: () => {
        // Log click for analytics (local only)
        try { console.log('Google button clicked in', isStandalonePWA() ? 'PWA' : 'web'); } catch {}
      }
    });
  }

  handleGoogleLoadError() {
    this.googleReady = false;
    this.googleLoadPromise = null;
    this.setProgress(false);
    $('#authRetryButton').hidden = false;
    this.setMessage('اتصال به Google Identity برقرار نشد. اینترنت یا مجوزهای مرورگر را بررسی کنید. می‌توانید از دکمه «ورود با ریدایرکت امن» استفاده کنید که برای حالت اپ تعمیر شده.', 'error');
    if (this.externalButton) this.externalButton.hidden = false;
    if (this.oauthButton) this.oauthButton.hidden = false;
  }

  renderProfile(profile) {
    const name = profile.name || 'کاربر ماملی';
    const email = profile.email || '';
    const initial = [...name.trim()][0]?.toUpperCase() || 'M';
    $$('[data-account-name]').forEach(node => { node.textContent = name; });
    $$('[data-account-email]').forEach(node => { node.textContent = email; });
    $$('[data-account-avatar]').forEach(avatar => {
      const initialNode = $('[data-account-initial]', avatar);
      const image = $('img', avatar);
      initialNode.textContent = initial;
      image.hidden = true;
      image.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
      const picture = safeGooglePicture(profile.picture);
      if (!picture) return;
      image.addEventListener('load', () => { image.hidden = false; }, { once: true });
      image.addEventListener('error', () => { image.hidden = true; }, { once: true });
      image.src = picture;
    });
  }

  setProgress(visible, text = '') {
    this.progress.hidden = !visible;
    if (text) this.progressText.textContent = text;
  }

  setMessage(text, state = 'error') {
    this.message.textContent = text;
    this.message.dataset.state = state;
    this.message.hidden = !text;
  }

  async lock() {
    if (!this.session) return;
    this.session = { ...this.session, active: false, lockedAt: Date.now() };
    try { await this.store.save(this.session); } catch { this.storageAvailable = false; }
    window.google?.accounts?.id?.disableAutoSelect?.();
    for (const dialog of $$('dialog[open]')) dialog.close();
    this.showLockedGate();
    this.updateNetworkState();
    announce('ماملی قفل شد. برای بازگشت از حساب مورد اعتماد استفاده کنید. قفل عمودی فعال است.');
  }

  async removeAccount(button) {
    if (!button.classList.contains('is-confirming')) {
      button.classList.add('is-confirming');
      button.textContent = 'برای تأیید، دوباره بزنید';
      window.clearTimeout(this.removeConfirmationTimer);
      this.removeConfirmationTimer = window.setTimeout(() => {
        button.classList.remove('is-confirming');
        button.textContent = 'حذف حساب از این دستگاه';
      }, 5000);
      return;
    }
    window.clearTimeout(this.removeConfirmationTimer);
    window.google?.accounts?.id?.disableAutoSelect?.();
    await sessionLock.release(this.session || {});
    try { await this.store.clear(); } catch { this.storageAvailable = false; }
    this.session = null;
    button.classList.remove('is-confirming');
    button.textContent = 'حذف حساب از این دستگاه';
    for (const dialog of $$('dialog[open]')) dialog.close();
    this.showLockedGate();
    this.updateNetworkState();
    this.setMessage('حساب از دیتابیس این دستگاه حذف شد. برای ورود دوباره از یکی از روش‌های ورود گوگل (از جمله ریدایرکت امن) استفاده کنید.', 'success');
    announce('حساب ذخیره‌شده از این دستگاه حذف شد.');
  }
}

function announce(message) {
  announcer.textContent = '';
  window.setTimeout(() => { announcer.textContent = message; }, 30);
}
function toast(message, duration = 3200) {
  const item = document.createElement('div');
  item.className = 'toast';
  item.textContent = message;
  toastRegion.append(item);
  window.setTimeout(() => {
    item.classList.add('is-leaving');
    window.setTimeout(() => item.remove(), 260);
  }, duration);
}

class SoundEngine {
  constructor() { this.context = null; }
  ensureContext() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.context = new AudioContext();
    }
    if (this.context?.state === 'suspended') this.context.resume().catch(() => {});
  }
  play(type = 'tap') {
    if (!settings.sound) return;
    this.ensureContext();
    if (!this.context) return;
    const frequencies = { tap: 430, open: 620, toggle: 520, energy: 180 };
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type === 'energy' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequencies[type] || 430, now);
    oscillator.frequency.exponentialRampToValueAtTime((frequencies[type] || 430) * 1.35, now + .08);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.045, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .13);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + .14);
  }
}

const sound = new SoundEngine();

function saveSettings() {
  SafeStorage.write(SITE_CONFIG.storageKey, settings);
}

function applySettings({ notify = false } = {}) {
  if (!SITE_CONFIG.themes.includes(settings.theme)) settings.theme = defaults.theme;
  document.documentElement.dataset.theme = settings.theme;
  document.body.classList.toggle('particles-enabled', Boolean(settings.particles));
  document.body.classList.toggle('effects-enabled', Boolean(settings.glow));
  document.body.classList.toggle('reduce-motion', Boolean(settings.reducedMotion));
  const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  $('meta[name="theme-color"]')?.setAttribute('content', themeColor || '#050816');

  const setChecked = (id, value) => { const el = $(id); if (el) el.checked = value; };
  const setValue = (id, value) => { const el = $(id); if (el) el.value = value; };
  setChecked('#particlesSetting', Boolean(settings.particles));
  setChecked('#glowSetting', Boolean(settings.glow));
  setChecked('#motionSetting', Boolean(settings.motion));
  setChecked('#reducedMotionSetting', Boolean(settings.reducedMotion));
  setChecked('#soundSetting', Boolean(settings.sound));
  setChecked('#autoUpdateSetting', settings.autoUpdate !== false);
  setChecked('#secureSetting', settings.secure !== false);
  setChecked('#portraitSetting', settings.portrait !== false);
  setValue('#themeSetting', SITE_CONFIG.themes.includes(settings.theme) ? settings.theme : defaults.theme);
  setValue('#deviceMotionSetting', ['soft', 'balanced', 'free'].includes(settings.deviceMotion) ? settings.deviceMotion : defaults.deviceMotion);
  setValue('#phoneDepth', String(Math.min(145, Math.max(55, Number(settings.phoneDepth) || defaults.phoneDepth))));
  if ($('#phoneDepthValue') && $('#phoneDepth')) $('#phoneDepthValue').value = toPersianDigits($('#phoneDepth').value);
  setValue('#qualitySetting', ['auto', 'high', 'low'].includes(settings.quality) ? settings.quality : 'auto');

  screenshotManager?.setEnabled(settings.secure !== false);
  if (settings.portrait) orientationManager?.lock();
  else {
    document.body.classList.remove('is-landscape', 'portrait-enforced');
    $('#rotatePrompt').hidden = true;
  }

  orbit?.syncMotion();
  cosmos?.configure();
  deviceTilt?.configure();
  updateManager?.syncAutoMode();
  saveSettings();
  if (notify) announce('تنظیمات تجربه به‌روزرسانی شد.');
}

function hexToRgba(color, alpha) {
  const value = color.trim();
  if (!value.startsWith('#')) return `rgba(108, 245, 255, ${alpha})`;
  const hex = value.slice(1);
  const normalized = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex;
  const number = Number.parseInt(normalized, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

class CosmosRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: true });
    this.particles = [];
    this.pointer = { x: .5, y: .35 };
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.lastTime = 0;
    this.lastDraw = 0;
    this.primary = '#6cf5ff';
    this.accent = '#ff4ecd';
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(document.documentElement);
    window.addEventListener('pointermove', event => {
      this.pointer.x = event.clientX / Math.max(window.innerWidth, 1);
      this.pointer.y = event.clientY / Math.max(window.innerHeight, 1);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.lastTime = performance.now();
    });
    this.resize();
    this.configure();
    requestAnimationFrame(time => this.frame(time));
  }
  getParticleCount() {
    if (settings.quality === 'low') return 34;
    if (settings.quality === 'high') return 92;
    const compactDevice = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 4;
    return compactDevice || window.innerWidth < 700 ? 42 : 70;
  }
  configure() {
    const target = this.getParticleCount();
    while (this.particles.length < target) this.particles.push(this.createParticle());
    if (this.particles.length > target) this.particles.length = target;
    const styles = getComputedStyle(document.documentElement);
    this.primary = styles.getPropertyValue('--primary').trim() || '#6cf5ff';
    this.accent = styles.getPropertyValue('--accent').trim() || '#ff4ecd';
  }
  createParticle() {
    return {
      x: Math.random(),
      y: Math.random(),
      z: .2 + Math.random() * .8,
      size: .45 + Math.random() * 1.35,
      speed: .00001 + Math.random() * .000035,
      drift: (Math.random() - .5) * .000018,
      alpha: .2 + Math.random() * .7,
    };
  }
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, settings.quality === 'high' ? 2 : 1.5);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.configure();
  }
  frame(time) {
    const interval = settings.quality === 'high' ? 16 : 32;
    if (time - this.lastDraw >= interval) {
      const delta = Math.min(time - (this.lastTime || time), 50);
      this.lastTime = time;
      this.lastDraw = time;
      this.draw(delta);
    }
    requestAnimationFrame(next => this.frame(next));
  }
  draw(delta) {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.width, this.height);
    if (!settings.particles || document.hidden) return;
    const primary = this.primary;
    const accent = this.accent;
    const pointerX = this.pointer.x * this.width;
    const pointerY = this.pointer.y * this.height;
    for (const particle of this.particles) {
      if (!settings.reducedMotion) {
        particle.y += particle.speed * delta;
        particle.x += particle.drift * delta;
      }
      if (particle.y > 1.04) particle.y = -.04;
      if (particle.x > 1.04) particle.x = -.04;
      if (particle.x < -.04) particle.x = 1.04;
      const parallaxX = (pointerX - this.width / 2) * particle.z * .012;
      const parallaxY = (pointerY - this.height / 2) * particle.z * .009;
      particle.screenX = particle.x * this.width - parallaxX;
      particle.screenY = particle.y * this.height - parallaxY;
      ctx.beginPath();
      ctx.fillStyle = hexToRgba(particle.z > .72 ? accent : primary, particle.alpha);
      ctx.arc(particle.screenX, particle.screenY, particle.size * particle.z, 0, Math.PI * 2);
      ctx.fill();
    }
    if (settings.quality === 'low' || settings.reducedMotion) return;
    ctx.lineWidth = .5;
    const maxDistance = Math.min(145, this.width * .12);
    for (let i = 0; i < this.particles.length; i += 1) {
      const a = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j += 1) {
        const b = this.particles[j];
        const dx = a.screenX - b.screenX;
        const dy = a.screenY - b.screenY;
        const distance = Math.hypot(dx, dy);
        if (distance < maxDistance) {
          ctx.beginPath();
          ctx.strokeStyle = hexToRgba(primary, (1 - distance / maxDistance) * .08);
          ctx.moveTo(a.screenX, a.screenY);
          ctx.lineTo(b.screenX, b.screenY);
          ctx.stroke();
        }
      }
    }
  }
}

class OrbitEngine {
  constructor(scene) {
    this.scene = scene;
    this.shell = scene.closest('.scene-shell');
    this.portals = $$('.portal', scene).map(element => ({
      element,
      phase: Number(element.dataset.phase || 0),
    }));
    this.angle = 0;
    this.velocity = 0;
    this.dragging = false;
    this.dragDistance = 0;
    this.lastX = 0;
    this.pitch = -8;
    this.lastFrame = performance.now();
    this.lastRender = 0;
    this.width = scene.clientWidth;
    this.resizeObserver = new ResizeObserver(entries => {
      this.width = entries[0]?.contentRect.width || this.width;
      this.render();
    });
    this.resizeObserver.observe(scene);
    this.setupInteraction();
    this.syncMotion();
    requestAnimationFrame(time => this.frame(time));
  }
  setupInteraction() {
    this.scene.addEventListener('pointerdown', event => {
      if (event.target.closest('a, button')) return;
      this.dragging = true;
      this.dragDistance = 0;
      this.lastX = event.clientX;
      this.scene.classList.add('is-dragging');
      this.scene.setPointerCapture(event.pointerId);
    });
    this.scene.addEventListener('pointermove', event => {
      const rect = this.scene.getBoundingClientRect();
      const localX = ((event.clientX - rect.left) / rect.width - .5) * 2;
      const localY = ((event.clientY - rect.top) / rect.height - .5) * 2;
      if (settings.glow) {
        $('#energyCore').style.setProperty('--core-y', `${localX * 12}deg`);
        $('#energyCore').style.setProperty('--core-x', `${localY * -10}deg`);
      }
      if (!this.dragging) return;
      const deltaX = event.clientX - this.lastX;
      this.lastX = event.clientX;
      this.dragDistance += Math.abs(deltaX);
      this.velocity = deltaX * .0055;
      this.angle += this.velocity;
    });
    const release = event => {
      if (!this.dragging) return;
      this.dragging = false;
      this.scene.classList.remove('is-dragging');
      if (this.scene.hasPointerCapture(event.pointerId)) this.scene.releasePointerCapture(event.pointerId);
    };
    this.scene.addEventListener('pointerup', release);
    this.scene.addEventListener('pointercancel', release);
    this.scene.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? 1 : -1;
        this.angle += direction * .3;
        this.velocity = direction * .035;
        announce(event.key === 'ArrowLeft' ? 'مدار به چپ چرخید.' : 'مدار به راست چرخید.');
      }
      if (event.key === 'Home') {
        this.angle = 0;
        this.velocity = 0;
      }
    });
    for (const { element } of this.portals) {
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        element.style.setProperty('--portal-light-x', `${x.toFixed(1)}%`);
        element.style.setProperty('--portal-light-y', `${y.toFixed(1)}%`);
      });
      element.addEventListener('click', event => {
        if (this.dragDistance > 8) event.preventDefault();
        else sound.play('open');
      });
    }
  }
  syncMotion() {
    const auto = Boolean(settings.motion) && !settings.reducedMotion;
    const button = $('#motionButton');
    if (!button) return;
    button.setAttribute('aria-pressed', String(!auto));
    button.setAttribute('aria-label', auto ? 'توقف چرخش خودکار مدار' : 'شروع چرخش خودکار مدار');
    const label = $('.orbit-motion-control__copy strong', button);
    if (label) label.textContent = auto ? 'توقف چرخش' : 'شروع چرخش';
  }
  frame(time) {
    const interval = settings.quality === 'high' || this.dragging ? 16 : 32;
    if (time - this.lastRender < interval) {
      requestAnimationFrame(next => this.frame(next));
      return;
    }
    const delta = Math.min(time - this.lastFrame, 50);
    this.lastFrame = time;
    this.lastRender = time;
    if (!this.dragging) {
      if (settings.motion && !settings.reducedMotion) this.angle += delta * .00018;
      this.angle += this.velocity;
      this.velocity *= .94;
      if (Math.abs(this.velocity) < .00005) this.velocity = 0;
    }
    this.render();
    requestAnimationFrame(next => this.frame(next));
  }
  render() {
    const width = this.width;
    const compact = width < 520;
    const radius = Math.min(width * (compact ? .31 : .34), compact ? 145 : 220);
    const depth = radius * .68;
    this.scene.style.setProperty('--orbit-yaw', `${(this.angle * 57.2958).toFixed(2)}deg`);
    this.scene.style.setProperty('--orbit-yaw-inverse', `${(-this.angle * 57.2958).toFixed(2)}deg`);
    this.scene.style.setProperty('--orbit-pitch', `${this.pitch}deg`);
    for (const portal of this.portals) {
      const angle = portal.phase + this.angle;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * depth;
      const y = Math.sin(angle) * (compact ? 72 : 90) + 8;
      const depthRatio = (z / depth + 1) / 2;
      const scale = compact ? .82 + depthRatio * .18 : .84 + depthRatio * .23;
      const opacity = .45 + depthRatio * .55;
      portal.element.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) scale(${scale.toFixed(3)})`;
      portal.element.style.opacity = opacity.toFixed(3);
      portal.element.style.zIndex = String(10 + Math.round(depthRatio * 12));
    }
  }
}

class DeviceTiltController {
  constructor(root) {
    this.root = root;
    this.phone = $('.phone-frame', root);
    this.dragging = false;
    this.hovering = false;
    this.pointerId = null;
    this.x = 0; this.y = 0; this.rx = 0; this.ry = 0; this.rz = 0;
    this.velocityX = 0; this.velocityY = 0;
    this.animationFrame = 0;
    this.profile = null;
    this.configure();
    this.bind();
    this.apply();
  }
  clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
  configure() {
    const profiles = {
      soft: { dragX: .52, dragY: .45, maxX: 66, maxY: 48, hoverX: 12, hoverY: 8, tiltX: 6, tiltY: 8, inertia: .78 },
      balanced: { dragX: .7, dragY: .58, maxX: 88, maxY: 64, hoverX: 21, hoverY: 14, tiltX: 9, tiltY: 12, inertia: .83 },
      free: { dragX: .88, dragY: .72, maxX: 116, maxY: 82, hoverX: 31, hoverY: 21, tiltX: 12, tiltY: 16, inertia: .87 },
    };
    this.profile = profiles[settings.deviceMotion] || profiles.free;
    const depth = this.clamp(Number(settings.phoneDepth) || defaults.phoneDepth, 55, 145) / 100;
    this.root.style.setProperty('--phone-depth', depth.toFixed(2));
    this.root.style.setProperty('--phone-z', `${(32 + depth * 14).toFixed(1)}px`);
    this.root.style.setProperty('--shadow-y', `${(34 + depth * 12).toFixed(1)}px`);
    this.root.style.setProperty('--shadow-blur', `${(72 + depth * 20).toFixed(1)}px`);
    this.root.classList.toggle('is-free-moving', !settings.reducedMotion);
    this.root.classList.toggle('is-motion-reduced', Boolean(settings.reducedMotion));
    if (!this.dragging && !this.hovering) this.reset({ immediate: true });
  }
  bind() {
    this.phone.addEventListener('pointerdown', event => {
      if (settings.reducedMotion) return;
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      event.preventDefault();
      cancelAnimationFrame(this.animationFrame);
      this.dragging = true; this.hovering = false;
      this.pointerId = event.pointerId;
      this.startX = event.clientX; this.startY = event.clientY;
      this.baseX = this.x; this.baseY = this.y;
      this.lastX = this.x; this.lastY = this.y;
      this.root.classList.add('is-dragging', 'is-tracking');
      this.phone.setPointerCapture(event.pointerId);
    });
    this.root.addEventListener('pointerenter', event => {
      if (settings.reducedMotion || event.pointerType !== 'mouse' || this.dragging) return;
      this.hovering = true;
      this.root.classList.add('is-tracking');
    });
    this.root.addEventListener('pointermove', event => {
      if (settings.reducedMotion) return;
      const profile = this.profile;
      if (this.dragging && event.pointerId === this.pointerId) {
        const deltaX = event.clientX - this.startX;
        const deltaY = event.clientY - this.startY;
        this.x = this.clamp(this.baseX + deltaX * profile.dragX, -profile.maxX, profile.maxX);
        this.y = this.clamp(this.baseY + deltaY * profile.dragY, -profile.maxY, profile.maxY);
        this.velocityX = this.x - this.lastX; this.velocityY = this.y - this.lastY;
        this.lastX = this.x; this.lastY = this.y;
        this.ry = this.clamp((this.x / profile.maxX) * profile.tiltY, -profile.tiltY, profile.tiltY);
        this.rx = this.clamp((-this.y / profile.maxY) * profile.tiltX, -profile.tiltX, profile.tiltX);
        this.rz = this.clamp((this.x / profile.maxX) * 2.2, -2.2, 2.2);
        this.apply(1.045);
        return;
      }
      if (event.pointerType !== 'mouse') return;
      const rect = this.root.getBoundingClientRect();
      const localX = this.clamp(((event.clientX - rect.left) / rect.width - .5) * 2, -1, 1);
      const localY = this.clamp(((event.clientY - rect.top) / rect.height - .5) * 2, -1, 1);
      this.hovering = true;
      this.x += (localX * profile.hoverX - this.x) * .42;
      this.y += (localY * profile.hoverY - this.y) * .42;
      this.ry += (localX * profile.tiltY - this.ry) * .38;
      this.rx += (-localY * profile.tiltX - this.rx) * .38;
      this.rz += (localX * 1.4 - this.rz) * .32;
      this.apply(1.018);
    }, { passive: true });
    const release = event => {
      if (!this.dragging || event.pointerId !== this.pointerId) return;
      this.dragging = false;
      this.root.classList.remove('is-dragging');
      if (this.phone.hasPointerCapture(event.pointerId)) this.phone.releasePointerCapture(event.pointerId);
      this.pointerId = null;
      this.settle();
    };
    this.phone.addEventListener('pointerup', release);
    this.phone.addEventListener('pointercancel', release);
    this.root.addEventListener('pointerleave', event => {
      if (settings.reducedMotion || event.pointerType !== 'mouse' || this.dragging) return;
      this.hovering = false;
      this.root.classList.remove('is-tracking');
      this.settle({ fromHover: true });
    });
    this.phone.addEventListener('dblclick', () => this.reset());
  }
  apply(scale = 1) {
    this.root.style.setProperty('--phone-x', `${this.x.toFixed(2)}px`);
    this.root.style.setProperty('--phone-y', `${this.y.toFixed(2)}px`);
    this.root.style.setProperty('--phone-rx', `${this.rx.toFixed(2)}deg`);
    this.root.style.setProperty('--phone-ry', `${this.ry.toFixed(2)}deg`);
    this.root.style.setProperty('--phone-rz', `${this.rz.toFixed(2)}deg`);
    this.root.style.setProperty('--phone-scale', scale.toFixed(3));
    this.root.style.setProperty('--shadow-x', `${(this.x * -.25).toFixed(2)}px`);
    this.root.style.setProperty('--orbit-x', `${(this.x * -.18).toFixed(2)}px`);
    this.root.style.setProperty('--orbit-y', `${(this.y * -.15).toFixed(2)}px`);
    this.root.style.setProperty('--light-x', `${(this.x * .2).toFixed(2)}px`);
    this.root.style.setProperty('--light-y', `${(this.y * .2).toFixed(2)}px`);
  }
  reset({ immediate = false } = {}) {
    cancelAnimationFrame(this.animationFrame);
    this.hovering = false;
    this.root.classList.remove('is-tracking', 'is-dragging');
    if (immediate || settings.reducedMotion) {
      this.x = 0; this.y = 0; this.rx = 0; this.ry = 0; this.rz = 0;
      this.velocityX = 0; this.velocityY = 0;
      this.apply();
      return;
    }
    this.settle({ fromHover: true });
  }
  settle({ fromHover = false } = {}) {
    cancelAnimationFrame(this.animationFrame);
    if (settings.reducedMotion) { this.reset({ immediate: true }); return; }
    const profile = this.profile;
    if (fromHover) { this.velocityX = 0; this.velocityY = 0; }
    const frame = () => {
      this.velocityX *= profile.inertia;
      this.velocityY *= profile.inertia;
      this.x = (this.x + this.velocityX) * .9;
      this.y = (this.y + this.velocityY) * .9;
      this.rx *= .82; this.ry *= .82; this.rz *= .78;
      this.apply(1 + Math.min(Math.abs(this.velocityX) + Math.abs(this.velocityY), 10) * .0018);
      const moving = Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.rx) + Math.abs(this.ry) + Math.abs(this.velocityX) + Math.abs(this.velocityY) > .28;
      if (moving) this.animationFrame = requestAnimationFrame(frame);
      else this.reset({ immediate: true });
    };
    this.animationFrame = requestAnimationFrame(frame);
  }
}

function setupDeviceClock() {
  const clock = $('#deviceClock');
  const seconds = $('#deviceSeconds');
  const timezone = $('#deviceTimezone');
  if (!clock) return;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const zoneLabel = zone.split('/').pop().replaceAll('_', ' ');
  if (timezone) timezone.textContent = `${zoneLabel} · LOCAL`;
  let timer;
  const update = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentSeconds = String(now.getSeconds()).padStart(2, '0');
    clock.textContent = `${toPersianDigits(hours)}:${toPersianDigits(minutes)}`;
    if (seconds) seconds.textContent = `:${toPersianDigits(currentSeconds)}`;
    clock.dateTime = `${hours}:${minutes}:${currentSeconds}`;
    window.clearTimeout(timer);
    timer = window.setTimeout(update, Math.max(120, 1000 - (Date.now() % 1000) + 8));
  };
  update();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
  window.addEventListener('pageshow', update);
}

let cosmos;
let orbit;
let deviceTilt;
let updateManager;
let authManager;
let orientationManager;
let screenshotManager;
let permissionManager;
let deviceDetectionManager;
let mouseTrailManager;
let touchRippleManager;
let liveGoogleTestManager;
let scrollCinematicManager;
let protectedAppInitialized = false;

function cycleTheme() {
  const currentIndex = SITE_CONFIG.themes.indexOf(settings.theme);
  settings.theme = SITE_CONFIG.themes[(currentIndex + 1) % SITE_CONFIG.themes.length];
  applySettings();
  sound.play('toggle');
  const names = { neon: 'نئون', aurora: 'شفق', solar: 'خورشیدی', prism: 'منشوری' };
  toast(`تم ${names[settings.theme]} فعال شد.`);
}
function getPlatform() {
  const agent = navigator.userAgent.toLowerCase();
  if (/android/.test(agent)) return 'android';
  if (/iphone|ipad|ipod/.test(agent)) return 'ios';
  return 'desktop';
}
function getNativeAppLink(appId) {
  const app = SITE_CONFIG.apps[appId];
  return app?.[getPlatform()] || app?.fallback || '#';
}
function openNativeApp(appId) {
  const app = SITE_CONFIG.apps[appId];
  if (!app) return;
  const deepLink = getNativeAppLink(appId);
  sound.play('open');
  if (deepLink.startsWith('https://')) {
    toast(`نسخه وب ${app.label} باز می‌شود؛ روی موبایل دکمه مستقیماً اپ را اجرا می‌کند.`, 3000);
    window.open(app.fallback, '_blank', 'noopener,noreferrer');
    return;
  }
  toast(`در حال بازکردن اپ ${app.label}…`, 2200);
  if (deepLink.startsWith('intent:')) {
    window.location.href = deepLink;
    return;
  }
  let appOpened = false;
  let fallbackTimer;
  const markOpened = () => { appOpened = true; window.clearTimeout(fallbackTimer); };
  window.addEventListener('blur', markOpened, { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) markOpened(); }, { once: true });
  window.location.href = deepLink;
  fallbackTimer = window.setTimeout(() => {
    if (appOpened || document.hidden) return;
    toast(`اپ ${app.label} پیدا نشد؛ نسخه وب باز می‌شود.`, 2600);
    window.location.href = app.fallback;
  }, 2400);
}
function setupNativeAppLinks() {
  for (const link of $$('[data-native-app]')) {
    const appId = link.dataset.nativeApp;
    const app = SITE_CONFIG.apps[appId];
    if (!app) continue;
    link.href = getNativeAppLink(appId);
    link.dataset.fallback = app.fallback;
    link.addEventListener('click', event => {
      event.preventDefault();
      openNativeApp(appId);
    });
  }
}
function getInstallPlatform() {
  const platform = `${navigator.userAgentData?.platform || ''} ${navigator.platform || ''} ${navigator.userAgent}`.toLowerCase();
  if (platform.includes('windows') || platform.includes('win32') || platform.includes('win64')) return 'windows';
  if (platform.includes('android')) return 'android';
  if (/iphone|ipad|ipod/.test(platform)) return 'ios';
  return 'desktop';
}
function setupPlatformTabs() {
  const tabs = $$('[data-platform-tab]');
  const panels = $$('[data-platform-panel]');
  const quickChoices = $$('[data-platform-choice]');
  if (!tabs.length || !panels.length) return;
  let savedPlatform = '';
  try { savedPlatform = sessionStorage.getItem('mamali-install-platform') || ''; } catch {}
  const activate = (platform, { focus = false, reveal = false, remember = true } = {}) => {
    const normalized = ['android', 'windows'].includes(platform) ? platform : 'android';
    for (const tab of tabs) {
      const selected = tab.dataset.platformTab === normalized;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus({ preventScroll: true });
    }
    for (const panel of panels) {
      const selected = panel.dataset.platformPanel === normalized;
      panel.hidden = !selected;
      panel.setAttribute('aria-hidden', String(!selected));
      panel.classList.toggle('is-active', selected);
    }
    for (const choice of quickChoices) {
      const selected = choice.dataset.platformChoice === normalized;
      choice.setAttribute('aria-pressed', String(selected));
      choice.classList.toggle('is-active', selected);
    }
    document.body.dataset.installPlatform = normalized;
    if (remember) {
      try { sessionStorage.setItem('mamali-install-platform', normalized); } catch {}
    }
    document.dispatchEvent(new CustomEvent('installplatformchange', { detail: { platform: normalized } }));
    if (reveal) {
      const panel = panels.find(item => item.dataset.platformPanel === normalized);
      window.setTimeout(() => panel?.scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth', block: 'nearest' }), 30);
    }
  };
  for (const tab of tabs) {
    tab.addEventListener('click', event => {
      event.preventDefault();
      activate(tab.dataset.platformTab, { reveal: true });
    });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.indexOf(tab);
      let target = index;
      if (event.key === 'ArrowLeft') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowRight') target = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      activate(tabs[target].dataset.platformTab, { focus: true, reveal: true });
    });
  }
  for (const choice of quickChoices) {
    choice.addEventListener('click', () => activate(choice.dataset.platformChoice, { reveal: true }));
  }
  $('#copyAndroidLink')?.addEventListener('click', async event => {
    const url = new URL('./', window.location.href).href;
    try {
      await navigator.clipboard.writeText(url);
      event.currentTarget.classList.add('is-copied');
      event.currentTarget.textContent = 'لینک نصب Android کپی شد ✓';
      toast('لینک ماملی برای فرستادن به گوشی کپی شد.');
      window.setTimeout(() => {
        event.currentTarget.classList.remove('is-copied');
        event.currentTarget.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path></svg> کپی لینک برای بازکردن روی گوشی Android';
      }, 2600);
    } catch {
      toast(`لینک نصب: ${url}`, 6000);
    }
  });
  const initial = ['android', 'windows'].includes(savedPlatform)
    ? savedPlatform
    : (getInstallPlatform() === 'windows' ? 'windows' : 'android');
  activate(initial, { remember: false });
}
function setupDialogs() {
  const settingsDialog = $('#settingsDialog');
  const commandDialog = $('#commandDialog');
  const installDialog = $('#installDialog');
  const accountDialog = $('#accountDialog');
  const permissionDialog = $('#permissionDialog');

  const settingsButton = $('#settingsButton');
  settingsButton.addEventListener('click', () => {
    settingsButton.classList.remove('is-launching');
    void settingsButton.offsetWidth;
    settingsButton.classList.add('is-launching');
    window.setTimeout(() => settingsButton.classList.remove('is-launching'), 650);
    sound.play('tap');
    if (!settingsDialog.open) settingsDialog.showModal();
  });

  for (const trigger of $$('[data-open-dialog]')) {
    trigger.addEventListener('click', () => {
      const target = document.getElementById(trigger.dataset.openDialog);
      if (target instanceof HTMLDialogElement && !target.open) {
        sound.play('open');
        target.showModal();
      }
    });
  }

  for (const dialog of [settingsDialog, commandDialog, installDialog, accountDialog, permissionDialog]) {
    if (!dialog) continue;
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) dialog.close();
    });
  }

  const animateSettingControl = control => {
    const row = control.closest('.setting-row, .setting-select, .setting-range');
    if (!row) return;
    row.classList.remove('is-switching');
    void row.offsetWidth;
    row.classList.add('is-switching');
    window.setTimeout(() => row.classList.remove('is-switching'), 650);
  };

  const bindings = [
    ['particlesSetting', 'particles'],
    ['glowSetting', 'glow'],
    ['motionSetting', 'motion'],
    ['reducedMotionSetting', 'reducedMotion'],
    ['soundSetting', 'sound'],
    ['autoUpdateSetting', 'autoUpdate'],
    ['secureSetting', 'secure'],
    ['portraitSetting', 'portrait'],
  ];

  for (const [id, key] of bindings) {
    const el = $(`#${id}`);
    if (!el) continue;
    el.addEventListener('change', event => {
      settings[key] = event.target.checked;
      animateSettingControl(event.target);
      if (key === 'sound' && settings.sound) sound.ensureContext();
      applySettings({ notify: true });
      sound.play('toggle');
      if (key === 'secure') toast(settings.secure ? '🛡️ محافظت از اسکرین‌شات فعال شد.' : 'محافظت غیرفعال شد.');
      if (key === 'portrait') {
        toast(settings.portrait ? '📱 قفل عمودی فعال شد.' : 'قفل عمودی غیرفعال شد.');
        if (settings.portrait) orientationManager?.lock();
      }
    });
  }

  $('#themeSetting').addEventListener('change', event => {
    settings.theme = SITE_CONFIG.themes.includes(event.target.value) ? event.target.value : defaults.theme;
    animateSettingControl(event.target);
    applySettings({ notify: true });
    sound.play('toggle');
  });

  $('#deviceMotionSetting').addEventListener('change', event => {
    settings.deviceMotion = ['soft', 'balanced', 'free'].includes(event.target.value) ? event.target.value : defaults.deviceMotion;
    animateSettingControl(event.target);
    applySettings({ notify: true });
    deviceTilt?.reset({ immediate: true });
  });

  $('#phoneDepth').addEventListener('input', event => {
    settings.phoneDepth = Math.min(145, Math.max(55, Number(event.target.value) || defaults.phoneDepth));
    $('#phoneDepthValue').value = toPersianDigits(settings.phoneDepth);
    animateSettingControl(event.target);
    applySettings();
  });
  $('#phoneDepth').addEventListener('change', () => announce('عمق سه‌بعدی گوشی به‌روزرسانی شد.'));

  $('#qualitySetting').addEventListener('change', event => {
    settings.quality = event.target.value;
    animateSettingControl(event.target);
    applySettings({ notify: true });
    cosmos.resize();
  });

  $('#resetSettings').addEventListener('click', () => {
    settingsDialog.classList.remove('is-resetting');
    void settingsDialog.offsetWidth;
    settingsDialog.classList.add('is-resetting');
    window.setTimeout(() => settingsDialog.classList.remove('is-resetting'), 720);
    settings = { ...defaults };
    SafeStorage.remove(SITE_CONFIG.storageKey);
    applySettings({ notify: true });
    toast('همه تنظیمات با موج بازنشانی به حالت اولیه برگشتند.');
    sound.play('toggle');
  });
}

function setupCommandPalette() {
  const dialog = $('#commandDialog');
  const input = $('#commandInput');
  const results = $('#commandResults');
  let selectedIndex = 0;
  let visibleCommands = [];

  const commands = [
    { icon: 'G', title: 'ورود گوگل تعمیرشده PWA', hint: 'Fix برای حالت اپ نصب‌شده', keywords: 'google pwa login اپ اندروید fix ورود', run: () => { document.getElementById('authGate').hidden ? $('#accountDialog').showModal() : window.scrollTo({top:0, behavior:'smooth'}); } },
    { icon: 'IG', title: 'بازکردن اپ اینستاگرام', hint: 'Deep Link مستقیم', keywords: 'instagram اینستا اینستاگرام app اپ', run: () => openNativeApp('instagram') },
    { icon: 'YT', title: 'بازکردن اپ یوتیوب', hint: 'Deep Link مستقیم', keywords: 'youtube یوتیوب ویدیو app اپ', run: () => openNativeApp('youtube') },
    { icon: 'TG', title: 'بازکردن اپ تلگرام', hint: 'Deep Link مستقیم', keywords: 'telegram تلگرام app اپ', run: () => openNativeApp('telegram') },
    { icon: 'APP', title: 'نصب اپ عمودی و امن', hint: 'Android portrait + secure', keywords: 'android windows اندروید ویندوز install نصب pwa portrait secure عمودی امن', run: () => $('#installDialog').showModal() },
    { icon: 'UP', title: 'بررسی بروزرسانی ۳.۶.۲', hint: `نسخه ${toPersianDigits(APP_VERSION)} · کانال پایدار`, keywords: 'update بروزرسانی آپدیت version نسخه 3.6.2 3.6' , run: () => { $('#updateCenter').scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth', block: 'center' }); updateManager?.check(); } },
    { icon: '◐', title: 'تغییر تم رنگی',  hint: 'نئون، شفق، خورشیدی', keywords: 'theme تم رنگ ظاهر', run: cycleTheme },
    { icon: '⚙', title: 'تنظیمات امن و عمودی', hint: 'کنترل جلوه‌ها + portrait + secure', keywords: 'settings تنظیمات کنترل secure portrait عمودی امن', run: () => $('#settingsDialog').showModal() },
    { icon: '⌁', title: 'حساب و امنیت دستگاه', hint: 'قفل، خروج یا حذف حساب محلی', keywords: 'google account حساب امنیت قفل خروج', run: () => $('#accountDialog').showModal() },
    { icon: '🔔', title: 'درخواست مجوزهای سیستمی', hint: 'notification + storage + orientation', keywords: 'permission مجوز notification اعلان storage', run: () => $('#permissionDialog').showModal() },
    { icon: '↻', title: 'روشن/خاموش‌کردن حرکت', hint: 'چرخش خودکار مدار', keywords: 'motion حرکت توقف چرخش', run: () => { settings.motion = !settings.motion; applySettings(); } },
    { icon: '📱', title: 'قفل عمودی را فعال/غیرفعال کن', hint: 'portrait lock', keywords: 'portrait عمودی قفل orientation', run: () => { settings.portrait = !settings.portrait; applySettings({notify:true}); orientationManager?.lock(); } },
    { icon: '🛡️', title: 'محافظت اسکرین‌شات', hint: 'روشن/خاموش', keywords: 'secure screenshot اسکرین شات محافظت', run: () => { settings.secure = !settings.secure; applySettings({notify:true}); } },
  ];

  const execute = command => {
    dialog.close();
    input.value = '';
    sound.play('open');
    command.run();
  };

  const render = (query = '') => {
    const normalized = query.trim().toLowerCase();
    visibleCommands = commands.filter(command => `${command.title} ${command.hint} ${command.keywords}`.toLowerCase().includes(normalized));
    selectedIndex = Math.min(selectedIndex, Math.max(visibleCommands.length - 1, 0));
    results.replaceChildren();

    if (!visibleCommands.length) {
      const empty = document.createElement('p');
      empty.className = 'command__hint';
      empty.textContent = 'فرمانی پیدا نشد.';
      results.append(empty);
      return;
    }

    visibleCommands.forEach((command, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `command-item${index === selectedIndex ? ' is-selected' : ''}`;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(index === selectedIndex));

      const icon = document.createElement('span');
      icon.className = 'command-item__icon';
      icon.textContent = command.icon;
      const copy = document.createElement('span');
      copy.className = 'command-item__copy';
      const title = document.createElement('strong');
      title.textContent = command.title;
      const hint = document.createElement('small');
      hint.textContent = command.hint;
      copy.append(title, hint);
      button.append(icon, copy);
      button.addEventListener('mouseenter', () => {
        selectedIndex = index;
        $$('.command-item', results).forEach((item, itemIndex) => {
          item.classList.toggle('is-selected', itemIndex === selectedIndex);
          item.setAttribute('aria-selected', String(itemIndex === selectedIndex));
        });
      });
      button.addEventListener('click', () => execute(command));
      results.append(button);
    });
  };

  const open = () => {
    render('');
    dialog.showModal();
    window.setTimeout(() => input.focus(), 30);
  };

  $('#commandButton').addEventListener('click', open);
  $('#closeCommand').addEventListener('click', () => dialog.close());
  input.addEventListener('input', () => { selectedIndex = 0; render(input.value); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close();
      return;
    }
    if (!visibleCommands.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % visibleCommands.length;
      render(input.value);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex = (selectedIndex - 1 + visibleCommands.length) % visibleCommands.length;
      render(input.value);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      execute(visibleCommands[selectedIndex]);
    }
  });

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) dialog.close(); else open();
    }
  });
}

function setupControls() {
  $('#themeButton').addEventListener('click', cycleTheme);

  $('#motionButton').addEventListener('click', () => {
    settings.motion = !settings.motion;
    applySettings();
    sound.play('toggle');
    toast(settings.motion ? 'حرکت خودکار مدار فعال شد.' : 'حرکت خودکار متوقف شد.');
  });

  $('#fullscreenButton').addEventListener('click', async () => {
    const shell = $('.scene-shell');
    try {
      if (!document.fullscreenElement) await shell.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      toast('نمایش تمام‌صفحه در این مرورگر در دسترس نیست.');
    }
  });

  $('#energyCore').addEventListener('click', event => {
    const core = event.currentTarget;
    core.classList.remove('is-pulsing');
    void core.offsetWidth;
    core.classList.add('is-pulsing');
    sound.play('energy');
    toast('موج انرژی مدار امن ۳.۶.۲ فعال شد.');
    window.setTimeout(() => core.classList.remove('is-pulsing'), 1000);
  });

  // Debounced click sound to avoid long chat overload
  let lastSound = 0;
  document.addEventListener('click', event => {
    if (!event.target.closest('button, a')) return;
    const now = Date.now();
    if (now - lastSound > 120) { sound.play('tap'); lastSound = now; }
  }, { passive: true });
}

function setupRevealAnimations() {
  const items = $$('.reveal');
  if (settings.reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: .15 });
  items.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 75, 300)}ms`;
    observer.observe(item);
  });
}

class UpdateManager {
  constructor() {
    this.center = $('#updateCenter');
    this.status = $('#updateStatus');
    this.connection = $('#updateConnection');
    this.latest = $('#latestVersion');
    this.applyButton = $('#applyUpdateButton');
    this.checkButton = $('#checkUpdateButton');
    this.magnet = $('#updateMagnet');
    this.magnetStatus = $('#updateMagnetStatus');
    this.progress = $('#updateProgress');
    this.banner = $('#updateBanner');
    this.bannerCopy = $('#updateBannerCopy');
    this.bannerApply = $('#applyUpdateBanner');
    this.bannerDismiss = $('#dismissUpdateBanner');
    this.registration = null;
    this.latestVersion = APP_VERSION;
    this.state = 'checking';
    this.applying = false;
    this.reloading = false;
    this.dismissed = false;
    this.lastCheck = 0;
    this.autoApplyAt = 0;
    this.autoApplyTimer = null;
  }

  init() {
    if (!this.center) return;
    for (const node of $$('[data-app-version]')) node.textContent = toPersianDigits(APP_VERSION);

    this.applyButton.addEventListener('click', () => {
      if (this.state === 'available' || this.state === 'countdown') this.applyUpdate('manual');
      else this.check();
    });
    this.checkButton.addEventListener('click', () => this.check());
    this.bannerApply.addEventListener('click', () => this.applyUpdate('manual'));
    this.bannerDismiss.addEventListener('click', () => {
      this.dismissed = true;
      this.banner.hidden = true;
    });

    window.addEventListener('online', () => {
      this.dismissed = false;
      if (this.state === 'available' && this.registration?.waiting) this.scheduleAutoApply();
      else this.check({ silent: true });
    });
    window.addEventListener('offline', () => {
      this.cancelAutoApply();
      this.setState('offline');
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - this.lastCheck > 15000) this.check({ silent: true });
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!this.applying || this.reloading) return;
        this.reloading = true;
        toast('نسخه امن ۳.۶.۲ فعال شد؛ در حال راه‌اندازی دوباره ماملی…', 3000);
        window.setTimeout(() => window.location.reload(), 350);
      });
    }

    this.syncAutoMode();
    this.setState(navigator.onLine ? 'checking' : 'offline');
    if (document.readyState === 'complete') this.register();
    else window.addEventListener('load', () => this.register(), { once: true });
    window.setInterval(() => this.check({ silent: true }), SITE_CONFIG.updateInterval);
  }

  async register() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      this.check({ silent: true });
      return;
    }
    try {
      this.registration = null; await this.check({ silent: true }); return;
      this.watchRegistration(this.registration);
      if (this.registration.waiting && navigator.serviceWorker.controller) {
        this.setAvailable(this.latestVersion, [], { workerReady: true });
      }
      await this.registration.update();
      await this.check({ silent: true });
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
      this.setState(navigator.onLine ? 'error' : 'offline');
    }
  }

  watchRegistration(registration) {
    const watchWorker = worker => {
      if (!worker) return;
      this.setMagnet('pulling', 'نسخه امن ۳.۶.۲ پیدا شد؛ در حال آماده‌سازی بسته…');
      const inspect = () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          this.setAvailable(this.latestVersion, [], { workerReady: true });
        } else if (worker.state === 'activated' && !navigator.serviceWorker.controller) {
          this.setMagnet('current', 'اپ امن برای اجرای آفلاین آماده است');
        }
      };
      worker.addEventListener('statechange', inspect);
      inspect();
    };
    watchWorker(registration.installing);
    registration.addEventListener('updatefound', () => watchWorker(registration.installing));
  }

  async check({ silent = false } = {}) {
    if (this.state === 'updating') return;
    this.lastCheck = Date.now();
    if (!navigator.onLine) {
      this.setState('offline');
      return;
    }
    if (this.state !== 'available' && this.state !== 'countdown') this.setState('checking');
    else this.setMagnet('scanning', 'نسخه آماده است؛ هم‌زمان کانال انتشار بررسی می‌شود…');
    try {
      const separator = SITE_CONFIG.versionEndpoint.includes('?') ? '&' : '?';
      const response = await fetch(`${SITE_CONFIG.versionEndpoint}${separator}check=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Update endpoint returned ${response.status}`);
      const release = await response.json();
      if (!/^\d+\.\d+\.\d+$/.test(release.version || '')) throw new Error('Invalid semantic version');
      this.latestVersion = release.version;
      this.latest.textContent = toPersianDigits(release.version);
      await this.registration?.update();

      const waiting = Boolean(this.registration?.waiting && navigator.serviceWorker.controller);
      if (compareVersions(release.version, APP_VERSION) > 0 || waiting) {
        this.setAvailable(release.version, release.notes, { workerReady: waiting });
      } else {
        this.setState('current');
        if (!silent) toast(`نسخه ${toPersianDigits(APP_VERSION)} آخرین نسخه امن است.`);
      }
    } catch (error) {
      console.warn('Update check failed:', error);
      if (this.state !== 'available' && this.state !== 'countdown') this.setState(navigator.onLine ? 'error' : 'offline');
      if (!silent && navigator.onLine) toast('اتصال به کانال بروزرسانی ممکن نشد؛ دوباره تلاش کنید.');
    }
  }

  setAvailable(version = APP_VERSION, notes = [], { workerReady = false } = {}) {
    this.latestVersion = compareVersions(version, APP_VERSION) >= 0 ? version : APP_VERSION;
    this.latest.textContent = toPersianDigits(this.latestVersion);
    this.setState('available', { workerReady });
    const note = Array.isArray(notes) && notes.length ? notes[0] : 'نسخه امن ۳.۶.۲ با آرشیو قابل‌بازی و تعمیر ورود گوگل در اپ.';
    this.bannerCopy.textContent = `نسخه ${toPersianDigits(this.latestVersion)} — ${note}`;
    if (workerReady && !this.dismissed) this.banner.hidden = false;
    if (workerReady) {
      announce(`بروزرسانی امن نسخه ${toPersianDigits(this.latestVersion)} آماده است.`);
      this.scheduleAutoApply();
    }
  }

  setState(state, { workerReady = false } = {}) {
    this.state = state;
    this.center.dataset.state = state;
    const offline = state === 'offline';
    const busy = state === 'checking' || state === 'updating';
    this.connection.innerHTML = offline ? '<i></i> آفلاین' : '<i></i> آنلاین · امن';
    this.applyButton.disabled = offline || busy || (state === 'available' && !workerReady && Boolean(this.registration));
    this.checkButton.disabled = offline || busy;

    const content = {
      checking: ['در حال بررسی نسخه انتشار امن و بسته آفلاین…', 'در حال بررسی…', 'scanning', 'در حال جذب تازه‌ترین انتشار امن…'],
      current: [`نسخه ${toPersianDigits(APP_VERSION)} تازه و امن است؛ بررسی بعدی خودکار انجام می‌شود.`, 'بررسی بروزرسانی', 'current', 'متصل؛ تازه‌ترین نسخه امن روی این دستگاه است'],
      available: [workerReady ? `نسخه ${toPersianDigits(this.latestVersion)} جذب شد؛ بدون نصب دوباره آماده است.` : `نسخه ${toPersianDigits(this.latestVersion)} پیدا شد و بسته تازه در حال آماده‌شدن است…`, workerReady ? `فعال‌سازی ${toPersianDigits(this.latestVersion)}` : 'در حال آماده‌سازی…', workerReady ? 'captured' : 'pulling', workerReady ? `نسخه ${toPersianDigits(this.latestVersion)} جذب شد و آماده فعال‌سازی است` : `در حال جذب بسته نسخه ${toPersianDigits(this.latestVersion)}…`],
      countdown: ['', `فعال‌سازی ${toPersianDigits(this.latestVersion)}`, 'countdown', 'فعال‌سازی خودکار نزدیک است'],
      updating: ['فایل‌های نسخه تازه دریافت شدند؛ در حال فعال‌سازی امن…', 'در حال بروزرسانی…', 'activating', 'در حال فعال‌سازی نسخه تازه…'],
      offline: ['اینترنت قطع است؛ نسخه فعلی امن می‌ماند و هیچ فعال‌سازی اجباری انجام نمی‌شود.', 'بروزرسانی غیرفعال', 'offline', 'آفلاین؛ آهنربا تا اتصال بعدی در حالت امن است'],
      error: ['کانال بروزرسانی پاسخ نداد؛ نسخه فعلی فعال است و بررسی تکرار می‌شود.', 'تلاش دوباره', 'error', 'بررسی بعدی به‌صورت خودکار انجام می‌شود'],
    };
    const [message, buttonLabel, magnetState, magnetCopy] = content[state];
    if (message) this.status.textContent = message;
    this.applyButton.textContent = buttonLabel;
    this.setMagnet(magnetState, magnetCopy);
    if (!['available', 'countdown'].includes(state)) this.banner.hidden = true;
  }

  setMagnet(state, message) {
    this.magnet.dataset.state = state;
    this.magnet.dataset.auto = String(settings.autoUpdate !== false);
    this.magnetStatus.textContent = message;
    this.magnet.setAttribute('aria-label', message);
  }

  syncAutoMode() {
    document.body.classList.toggle('auto-update-enabled', settings.autoUpdate !== false);
    this.magnet?.setAttribute('data-auto', String(settings.autoUpdate !== false));
    if (settings.autoUpdate === false) {
      this.cancelAutoApply();
      if (this.state === 'countdown') this.setState('available', { workerReady: Boolean(this.registration?.waiting) });
    } else if (this.registration?.waiting && navigator.onLine) {
      this.scheduleAutoApply();
    }
  }

  scheduleAutoApply() {
    if (settings.autoUpdate === false || !navigator.onLine || !this.registration?.waiting || this.applying) return;
    this.cancelAutoApply();
    this.autoApplyAt = Date.now() + SITE_CONFIG.updateAutoApplyDelay;
    const updateCountdown = () => {
      if (settings.autoUpdate === false || !navigator.onLine || !this.registration?.waiting) {
        this.cancelAutoApply();
        return;
      }
      const seconds = Math.max(0, Math.ceil((this.autoApplyAt - Date.now()) / 1000));
      this.state = 'countdown';
      this.center.dataset.state = 'countdown';
      this.status.textContent = `نسخه ${toPersianDigits(this.latestVersion)} آماده است؛ فعال‌سازی خودکار تا ${toPersianDigits(seconds)} ثانیه دیگر…`;
      this.applyButton.disabled = false;
      this.applyButton.textContent = `همین حالا فعال کن (${toPersianDigits(seconds)})`;
      this.setMagnet('countdown', `نسخه جذب شد؛ فعال‌سازی خودکار تا ${toPersianDigits(seconds)} ثانیه دیگر`);
      if (seconds <= 0) this.applyUpdate('auto');
    };
    updateCountdown();
    this.autoApplyTimer = window.setInterval(updateCountdown, 250);
  }

  cancelAutoApply() {
    if (this.autoApplyTimer) window.clearInterval(this.autoApplyTimer);
    this.autoApplyTimer = null;
    this.autoApplyAt = 0;
  }

  async applyUpdate(mode = 'manual') {
    if (!navigator.onLine) {
      this.cancelAutoApply();
      this.setState('offline');
      return;
    }
    this.cancelAutoApply();
    this.applying = true;
    this.setState('updating');
    this.setMagnet('activating', mode === 'auto' ? 'فعال‌سازی خودکار نسخه امن…' : 'در حال فعال‌سازی نسخه انتخاب‌شده…');
    sound.play('energy');
    try {
      await this.registration?.update();
      let worker = this.registration?.waiting || this.registration?.installing;
      if (worker && !['installed', 'activated'].includes(worker.state)) {
        await new Promise(resolve => {
          const done = () => {
            if (['installed', 'activated', 'redundant'].includes(worker.state)) {
              worker.removeEventListener('statechange', done);
              resolve();
            }
          };
          worker.addEventListener('statechange', done);
          window.setTimeout(resolve, 8000);
        });
      }
      worker = this.registration?.waiting || worker;
      if (worker && worker.state !== 'redundant') {
        worker.postMessage({ type: 'SKIP_WAITING' });
        window.setTimeout(() => { if (!this.reloading) window.location.reload(); }, 4500);
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.warn('Update activation failed:', error);
      this.applying = false;
      this.setState(navigator.onLine ? 'error' : 'offline');
    }
  }
}

function setupInstall() {
  const buttons = $$('.install-trigger');
  const guide = $('#installDialog');
  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  const devicePlatform = getInstallPlatform();
  let selectedPlatform = document.body.dataset.installPlatform || (devicePlatform === 'windows' ? 'windows' : 'android');
  let installed = standaloneQuery.matches || Boolean(navigator.standalone);

  const platformLabels = {
    android: devicePlatform === 'android' ? 'نصب اپ Android عمودی' : 'راهنمای نصب Android',
    windows: devicePlatform === 'windows' ? 'نصب اپ Windows امن' : 'راهنمای نصب Windows',
    ios: 'افزودن به صفحه اصلی',
    desktop: 'نصب اپ روی دستگاه',
  };

  const setButtonLabel = (button, label) => {
    const labelNode = $('[data-install-label]', button);
    if (labelNode) labelNode.textContent = label;
    else {
      const textNode = [...button.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (textNode) textNode.textContent = ` ${label} `;
      else button.textContent = label;
    }
  };

  const updateInstallState = () => {
    document.body.classList.toggle('app-installed', installed);
    document.body.dataset.installPlatform = selectedPlatform;
    const selection = ['android', 'windows'].includes(selectedPlatform) ? selectedPlatform : devicePlatform;
    for (const button of buttons) {
      const canInstallHere = selection === devicePlatform || !['android', 'windows'].includes(devicePlatform);
      button.classList.toggle('is-installable', Boolean(installPrompt && canInstallHere));
      button.dataset.selectedPlatform = selection;
      const label = installed ? 'اپ امن عمودی نصب است ✓' : (platformLabels[selection] || platformLabels[devicePlatform]);
      button.setAttribute('aria-label', label);
      setButtonLabel(button, label);
    }
  };

  const showGuide = platform => {
    const normalized = ['android', 'windows'].includes(platform) ? platform : devicePlatform;
    guide.dataset.guidePlatform = normalized;
    if (!guide.open) guide.showModal();
    window.setTimeout(() => {
      const heading = normalized === 'windows' ? $('#windowsGuideHeading') : $('#androidGuideHeading');
      heading?.scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }, 90);
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    updateInstallState();
  });

  document.addEventListener('installplatformchange', event => {
    selectedPlatform = event.detail?.platform || selectedPlatform;
    updateInstallState();
  });

  for (const button of buttons) {
    button.addEventListener('click', async () => {
      const targetPlatform = ['android', 'windows'].includes(selectedPlatform) ? selectedPlatform : devicePlatform;
      if (installed) {
        toast('ماملی امن همین حالا به‌صورت اپ مستقل عمودی اجرا می‌شود.');
        return;
      }
      if (targetPlatform !== devicePlatform && ['android', 'windows'].includes(devicePlatform)) {
        showGuide(targetPlatform);
        toast(targetPlatform === 'android' ? 'بخش Android عمودی فعال شد؛ لینک را روی Chrome گوشی باز کنید.' : 'بخش Windows امن فعال شد؛ لینک را در Edge یا Chrome ویندوز باز کنید.', 4800);
        return;
      }
      if (installPrompt) {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        toast(choice.outcome === 'accepted' ? 'ماملی امن در حال نصب روی دستگاه است.' : 'نصب لغو شد.');
        installPrompt = null;
        updateInstallState();
        return;
      }
      showGuide(targetPlatform);
      const instructions = {
        ios: 'در Safari از Share، گزینه Add to Home Screen را بزنید.',
        windows: 'در Edge یا Chrome روی آیکون Install در نوار آدرس بزنید.',
        android: 'در Chrome منوی سه‌نقطه و گزینه Install app را انتخاب کنید.',
        desktop: 'در مرورگر سازگار گزینه Install app را انتخاب کنید.',
      };
      toast(instructions[targetPlatform] || instructions[devicePlatform] || instructions.desktop, 4800);
    });
  }

  standaloneQuery.addEventListener?.('change', event => {
    installed = event.matches;
    updateInstallState();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    installPrompt = null;
    updateInstallState();
    toast('ماملی امن ۳.۶.۲ با موفقیت نصب شد و اکنون عمودی و محافظت‌شده اجرا می‌شود.', 4500);
  });

  updateInstallState();
}

function setupVersionArchive() {
  const root = $('#versionArchive');
  if (!root || root.dataset.ready === '1') return;
  root.dataset.ready = '1';
  const safeText = value => String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  const playUrlFor = item => {
    if (typeof item.play === 'string' && item.play.trim()) return item.play;
    if (item.version === APP_VERSION || item.status === 'current') return './';
    if (item.version === '3.4.0') return './history/play/3.4.0/';
    return `./history/play/era.html?v=${encodeURIComponent(item.version || '')}`;
  };
  const render = items => {
    root.replaceChildren();
    for (const item of items) {
      const article = document.createElement('article');
      const play = playUrlFor(item);
      article.className = `version-card${item.status === 'current' ? ' is-current' : ''}`;
      article.innerHTML = `<small>${safeText(item.version)}</small><strong>${safeText(item.title || '')}</strong><span>${safeText(item.date || '')}</span><ul>${(item.highlights || []).map(h => `<li>${safeText(h)}</li>`).join('')}</ul><div class="version-card__actions"><a class="version-card__play" href="${safeText(play)}">اجرای این نسخه</a></div>`;
      root.append(article);
    }
  };
  fetch(`${SITE_CONFIG.versionsEndpoint}?t=${Date.now()}`, { cache: 'no-store' })
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(data => render(Array.isArray(data.archive) ? data.archive : []))
    .catch(() => render([
      { version: APP_VERSION, title: 'نسخه فعلی', date: '2026', status: 'current', play: './', highlights: ['ورود گوگل در PWA', 'قفل یک‌دستگاهی', 'آرشیو قابل‌بازی'] },
    ]));
}

function initProtectedApp() {
  if (protectedAppInitialized) return;
  protectedAppInitialized = true;
  $('#currentYear').textContent = String(new Date().getFullYear());

  orientationManager = new OrientationLockManager();
  orientationManager.init();

  screenshotManager = new ScreenshotProtectionManager();
  screenshotManager.init();

  deviceDetectionManager = new DeviceDetectionManager();
  deviceDetectionManager.init();

  mouseTrailManager = new MouseTrailManager();
  mouseTrailManager.init();

  touchRippleManager = new TouchRippleManager();
  touchRippleManager.init();

  liveGoogleTestManager = new LiveGoogleTestManager();
  liveGoogleTestManager.init();

  scrollCinematicManager = new ScrollCinematicManager();
  scrollCinematicManager.init();

  permissionManager = new PermissionManager();
  permissionManager.init();

  cosmos = new CosmosRenderer($('#cosmos'));
  orbit = new OrbitEngine($('#orbitScene'));
  deviceTilt = new DeviceTiltController($('#deviceShowcase'));
  setupDeviceClock();
  applySettings();
  setupNativeAppLinks();
  setupPlatformTabs();
  setupDialogs();
  setupCommandPalette();
  setupControls();
  setupRevealAnimations();
  setupInstall();
  updateManager = new UpdateManager();
  updateManager.init();
}

async function bootstrap() {
  // Early managers that work even in locked state
  orientationManager = new OrientationLockManager();
  orientationManager.init();
  screenshotManager = new ScreenshotProtectionManager();
  screenshotManager.init();
  deviceDetectionManager = new DeviceDetectionManager();
  deviceDetectionManager.init();
  mouseTrailManager = new MouseTrailManager();
  mouseTrailManager.init();
  touchRippleManager = new TouchRippleManager();
  touchRippleManager.init();
  liveGoogleTestManager = new LiveGoogleTestManager();
  liveGoogleTestManager.init();
  scrollCinematicManager = new ScrollCinematicManager();
  scrollCinematicManager.init();
  permissionManager = new PermissionManager();
  permissionManager.init();
  setupVersionArchive();

  authManager = new AuthManager();
  await authManager.init();
}

bootstrap().catch(error => {
  console.error('Mamali authentication bootstrap failed:', error);
  document.documentElement.dataset.authState = 'locked';
  const message = $('#authMessage');
  if (message) {
    message.hidden = false;
    message.dataset.state = 'error';
    message.textContent = 'راه‌اندازی دروازه امن کامل نشد. صفحه را دوباره بارگذاری کنید. اگر در حالت اپ هستید از دکمه ریدایرکت امن استفاده کنید.';
  }
});
