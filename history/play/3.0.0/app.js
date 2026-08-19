const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const APP_VERSION = '3.0.0';

const SITE_CONFIG = Object.freeze({
  version: APP_VERSION,
  versionEndpoint: './version.json',
  updateInterval: 5 * 60 * 1000,
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
  storageKey: 'mamali-orbit-settings-v2',
  themes: ['neon', 'aurora', 'solar'],
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

class SafeStorage {
  static read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? { ...fallback, ...JSON.parse(value) } : fallback;
    } catch {
      return fallback;
    }
  }

  static write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  static remove(key) {
    try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
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
  quality: 'auto',
});

let settings = SafeStorage.read(SITE_CONFIG.storageKey, { ...defaults });
let installPrompt = null;

const announcer = $('#systemAnnouncer');
const toastRegion = $('#toastRegion');

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

  $('#particlesSetting').checked = Boolean(settings.particles);
  $('#glowSetting').checked = Boolean(settings.glow);
  $('#motionSetting').checked = Boolean(settings.motion);
  $('#reducedMotionSetting').checked = Boolean(settings.reducedMotion);
  $('#soundSetting').checked = Boolean(settings.sound);
  $('#qualitySetting').value = ['auto', 'high', 'low'].includes(settings.quality) ? settings.quality : 'auto';

  orbit?.syncMotion();
  cosmos?.configure();
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
    button.setAttribute('aria-label', auto ? 'توقف حرکت خودکار' : 'شروع حرکت خودکار');
    $('span', button).textContent = auto ? 'توقف' : 'حرکت';
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
    this.pointerId = null;
    this.x = 0;
    this.y = 0;
    this.rx = 4;
    this.ry = -10;
    this.rz = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.animationFrame = 0;
    this.bind();
    this.apply();
  }

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  bind() {
    this.phone.addEventListener('pointerdown', event => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      event.preventDefault();
      cancelAnimationFrame(this.animationFrame);
      this.dragging = true;
      this.pointerId = event.pointerId;
      this.startX = event.clientX;
      this.startY = event.clientY;
      this.baseX = this.x;
      this.baseY = this.y;
      this.lastX = this.x;
      this.lastY = this.y;
      this.root.classList.add('is-dragging');
      this.phone.setPointerCapture(event.pointerId);
    });

    this.root.addEventListener('pointermove', event => {
      if (this.dragging && event.pointerId === this.pointerId) {
        const deltaX = event.clientX - this.startX;
        const deltaY = event.clientY - this.startY;
        this.x = this.clamp(this.baseX + deltaX * .62, -62, 62);
        this.y = this.clamp(this.baseY + deltaY * .52, -48, 48);
        this.velocityX = this.x - this.lastX;
        this.velocityY = this.y - this.lastY;
        this.lastX = this.x;
        this.lastY = this.y;
        this.ry = this.clamp(-10 + deltaX * .12, -24, 22);
        this.rx = this.clamp(4 - deltaY * .1, -17, 20);
        this.rz = this.clamp(deltaX * .018, -4, 4);
        this.apply(1.035);
        return;
      }

      if (event.pointerType !== 'mouse') return;
      const rect = this.root.getBoundingClientRect();
      const localX = ((event.clientX - rect.left) / rect.width - .5) * 2;
      const localY = ((event.clientY - rect.top) / rect.height - .5) * 2;
      this.x = localX * 7;
      this.y = localY * 5;
      this.ry = -8 + localX * 12;
      this.rx = 3 - localY * 9;
      this.rz = localX * 1.4;
      this.apply(1.012);
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
    this.root.addEventListener('pointerleave', () => {
      if (!this.dragging) this.reset();
    });
  }

  apply(scale = 1) {
    this.root.style.setProperty('--phone-x', `${this.x.toFixed(2)}px`);
    this.root.style.setProperty('--phone-y', `${this.y.toFixed(2)}px`);
    this.root.style.setProperty('--phone-rx', `${this.rx.toFixed(2)}deg`);
    this.root.style.setProperty('--phone-ry', `${this.ry.toFixed(2)}deg`);
    this.root.style.setProperty('--phone-rz', `${this.rz.toFixed(2)}deg`);
    this.root.style.setProperty('--phone-scale', scale.toFixed(3));
    this.root.style.setProperty('--shadow-x', `${(this.x * -.32).toFixed(2)}px`);
    this.root.style.setProperty('--orbit-x', `${(this.x * -.15).toFixed(2)}px`);
    this.root.style.setProperty('--orbit-y', `${(this.y * -.12).toFixed(2)}px`);
    this.root.style.setProperty('--light-x', `${(this.x * .18).toFixed(2)}px`);
    this.root.style.setProperty('--light-y', `${(this.y * .18).toFixed(2)}px`);
  }

  reset() {
    cancelAnimationFrame(this.animationFrame);
    this.x = 0;
    this.y = 0;
    this.rx = 4;
    this.ry = -10;
    this.rz = 0;
    this.apply();
  }

  settle() {
    if (settings.reducedMotion) {
      this.reset();
      return;
    }

    const frame = () => {
      this.velocityX *= .84;
      this.velocityY *= .84;
      this.x += this.velocityX;
      this.y += this.velocityY;
      this.x *= .9;
      this.y *= .9;
      this.rx += (4 - this.rx) * .12;
      this.ry += (-10 - this.ry) * .12;
      this.rz *= .82;
      this.apply(1 + Math.min(Math.abs(this.velocityX) + Math.abs(this.velocityY), 8) * .002);
      const moving = Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.velocityX) + Math.abs(this.velocityY) > .35;
      if (moving) this.animationFrame = requestAnimationFrame(frame);
      else this.reset();
    };
    this.animationFrame = requestAnimationFrame(frame);
  }
}

function setupDeviceClock() {
  const clock = $('#deviceClock');
  if (!clock) return;
  const formatter = new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const update = () => {
    const now = new Date();
    clock.textContent = formatter.format(now);
    clock.dateTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };
  update();
  window.setInterval(update, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
}

let cosmos;
let orbit;
let deviceTilt;
let updateManager;

function cycleTheme() {
  const currentIndex = SITE_CONFIG.themes.indexOf(settings.theme);
  settings.theme = SITE_CONFIG.themes[(currentIndex + 1) % SITE_CONFIG.themes.length];
  applySettings();
  sound.play('toggle');
  const names = { neon: 'نئون', aurora: 'شفق', solar: 'خورشیدی' };
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

  // Android intent: URLs include their own browser fallback and must run directly
  // inside the user's click gesture. Chrome handles the app handoff itself.
  if (deepLink.startsWith('intent:')) {
    window.location.href = deepLink;
    return;
  }

  let appOpened = false;
  let fallbackTimer;
  const markOpened = () => {
    appOpened = true;
    window.clearTimeout(fallbackTimer);
  };

  window.addEventListener('blur', markOpened, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) markOpened();
  }, { once: true });

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
  if (!tabs.length) return;

  const activate = (platform, { focus = false } = {}) => {
    for (const tab of tabs) {
      const selected = tab.dataset.platformTab === platform;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    }
    for (const panel of panels) panel.hidden = panel.dataset.platformPanel !== platform;
    document.body.dataset.installPlatform = platform;
    document.dispatchEvent(new CustomEvent('installplatformchange', { detail: { platform } }));
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => activate(tab.dataset.platformTab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.indexOf(tab);
      const direction = event.key === 'ArrowLeft' ? 1 : -1;
      activate(tabs[(index + direction + tabs.length) % tabs.length].dataset.platformTab, { focus: true });
    });
  }

  activate(getInstallPlatform() === 'windows' ? 'windows' : 'android');
}

function setupDialogs() {
  const settingsDialog = $('#settingsDialog');
  const commandDialog = $('#commandDialog');
  const installDialog = $('#installDialog');

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

  for (const dialog of [settingsDialog, commandDialog, installDialog]) {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) dialog.close();
    });
  }

  const animateSettingControl = control => {
    const row = control.closest('.setting-row, .setting-select');
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
  ];

  for (const [id, key] of bindings) {
    $(`#${id}`).addEventListener('change', event => {
      settings[key] = event.target.checked;
      animateSettingControl(event.target);
      if (key === 'sound' && settings.sound) sound.ensureContext();
      applySettings({ notify: true });
      sound.play('toggle');
    });
  }

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
    { icon: 'IG', title: 'بازکردن اپ اینستاگرام', hint: 'Deep Link مستقیم', keywords: 'instagram اینستا اینستاگرام app اپ', run: () => openNativeApp('instagram') },
    { icon: 'YT', title: 'بازکردن اپ یوتیوب', hint: 'Deep Link مستقیم', keywords: 'youtube یوتیوب ویدیو app اپ', run: () => openNativeApp('youtube') },
    { icon: 'TG', title: 'بازکردن اپ تلگرام', hint: 'Deep Link مستقیم', keywords: 'telegram تلگرام app اپ', run: () => openNativeApp('telegram') },
    { icon: 'APP', title: 'راهنمای نصب Android و Windows', hint: 'موبایل، دسکتاپ و PWA', keywords: 'android windows اندروید ویندوز install نصب pwa app', run: () => $('#installDialog').showModal() },
    { icon: 'UP', title: 'بررسی بروزرسانی برنامه', hint: `نسخه ${toPersianDigits(APP_VERSION)} · کانال پایدار`, keywords: 'update بروزرسانی آپدیت version نسخه', run: () => { $('#updateCenter').scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth', block: 'center' }); updateManager?.check(); } },
    { icon: '◐', title: 'تغییر تم رنگی',  hint: 'نئون، شفق، خورشیدی', keywords: 'theme تم رنگ ظاهر', run: cycleTheme },
    { icon: '⚙', title: 'بازکردن تنظیمات', hint: 'کنترل جلوه‌ها', keywords: 'settings تنظیمات کنترل', run: () => $('#settingsDialog').showModal() },
    { icon: '↻', title: 'روشن/خاموش‌کردن حرکت', hint: 'چرخش خودکار مدار', keywords: 'motion حرکت توقف چرخش', run: () => { settings.motion = !settings.motion; applySettings(); } },
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
    toast('موج انرژی مدار فعال شد.');
    window.setTimeout(() => core.classList.remove('is-pulsing'), 1000);
  });

  document.addEventListener('click', event => {
    if (event.target.closest('button, a')) sound.play('tap');
  });
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
  }

  init() {
    if (!this.center) return;
    for (const node of $$('[data-app-version]')) node.textContent = toPersianDigits(APP_VERSION);

    this.applyButton.addEventListener('click', () => {
      if (this.state === 'available') this.applyUpdate();
      else this.check();
    });
    this.checkButton.addEventListener('click', () => this.check());
    this.bannerApply.addEventListener('click', () => this.applyUpdate());
    this.bannerDismiss.addEventListener('click', () => {
      this.dismissed = true;
      this.banner.hidden = true;
    });

    window.addEventListener('online', () => {
      this.dismissed = false;
      this.check({ silent: true });
    });
    window.addEventListener('offline', () => this.setState('offline'));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - this.lastCheck > 60000) this.check({ silent: true });
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!this.applying || this.reloading) return;
        this.reloading = true;
        toast('نسخه جدید فعال شد؛ در حال راه‌اندازی دوباره ماملی…', 3000);
        window.setTimeout(() => window.location.reload(), 450);
      });
    }

    this.setState(navigator.onLine ? 'checking' : 'offline');
    window.addEventListener('load', () => this.register());
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
        this.setAvailable(this.latestVersion);
      }
      await this.check({ silent: true });
    } catch {
      this.setState(navigator.onLine ? 'error' : 'offline');
    }
  }

  watchRegistration(registration) {
    const watchWorker = worker => {
      if (!worker) return;
      const inspect = () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          this.setAvailable(this.latestVersion);
        }
      };
      worker.addEventListener('statechange', inspect);
      inspect();
    };
    watchWorker(registration.installing);
    registration.addEventListener('updatefound', () => watchWorker(registration.installing));
  }

  async check({ silent = false } = {}) {
    this.lastCheck = Date.now();
    if (!navigator.onLine) {
      this.setState('offline');
      return;
    }

    this.setState('checking');
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
        this.setAvailable(release.version, release.notes);
      } else {
        this.setState('current');
        if (!silent) toast(`نسخه ${toPersianDigits(APP_VERSION)} آخرین نسخه پایدار است.`);
      }
    } catch {
      this.setState(navigator.onLine ? 'error' : 'offline');
      if (!silent && navigator.onLine) toast('اتصال به کانال بروزرسانی ممکن نشد؛ دوباره تلاش کنید.');
    }
  }

  setAvailable(version = APP_VERSION, notes = []) {
    this.latestVersion = compareVersions(version, APP_VERSION) >= 0 ? version : APP_VERSION;
    this.latest.textContent = toPersianDigits(this.latestVersion);
    this.setState('available');
    const note = Array.isArray(notes) && notes.length ? notes[0] : 'نسخه جدید آماده فعال‌سازی است.';
    this.bannerCopy.textContent = `نسخه ${toPersianDigits(this.latestVersion)} — ${note}`;
    if (!this.dismissed) this.banner.hidden = false;
    announce(`بروزرسانی نسخه ${toPersianDigits(this.latestVersion)} موجود است.`);
  }

  setState(state) {
    this.state = state;
    this.center.dataset.state = state;
    const offline = state === 'offline';
    const busy = state === 'checking' || state === 'updating';
    this.connection.innerHTML = offline ? '<i></i> آفلاین' : '<i></i> آنلاین';
    this.applyButton.disabled = offline || busy;
    this.checkButton.disabled = offline || busy;

    const content = {
      checking: ['در حال بررسی نسخه جدید و اتصال به کانال پایدار…', 'در حال بررسی…'],
      current: [`نسخه ${toPersianDigits(APP_VERSION)} به‌روز است؛ بررسی بعدی به‌صورت خودکار انجام می‌شود.`, 'بررسی بروزرسانی'],
      available: [`نسخه ${toPersianDigits(this.latestVersion)} آماده است؛ بدون حذف برنامه آن را فعال کنید.`, `بروزرسانی به ${toPersianDigits(this.latestVersion)}`],
      updating: ['فایل‌های نسخه جدید دریافت شدند؛ در حال فعال‌سازی…', 'در حال بروزرسانی…'],
      offline: ['اینترنت قطع است؛ بروزرسانی تا اتصال دوباره غیرفعال می‌ماند.', 'بروزرسانی غیرفعال'],
      error: ['کانال بروزرسانی پاسخ نداد؛ اتصال را بررسی و دوباره تلاش کنید.', 'تلاش دوباره'],
    };
    const [message, buttonLabel] = content[state];
    this.status.textContent = message;
    this.applyButton.textContent = buttonLabel;
    if (state !== 'available') this.banner.hidden = true;
  }

  async applyUpdate() {
    if (!navigator.onLine) {
      this.setState('offline');
      return;
    }
    this.applying = true;
    this.setState('updating');
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
        window.setTimeout(() => {
          if (!this.reloading) window.location.reload();
        }, 4500);
      } else {
        window.location.reload();
      }
    } catch {
      this.applying = false;
      this.setState(navigator.onLine ? 'error' : 'offline');
    }
  }
}

function setupInstall() {
  const buttons = $$('.install-trigger');
  const guide = $('#installDialog');
  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  let installed = standaloneQuery.matches || Boolean(navigator.standalone);

  const platform = getInstallPlatform();
  const platformLabels = {
    android: 'نصب اپ اندروید',
    windows: 'نصب اپ ویندوز',
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
    for (const button of buttons) {
      button.classList.toggle('is-installable', Boolean(installPrompt));
      button.setAttribute('aria-label', installed ? 'اپ ماملی نصب شده است' : platformLabels[platform]);
      setButtonLabel(button, installed ? 'اپ نصب شده' : platformLabels[platform]);
    }
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    updateInstallState();
  });

  for (const button of buttons) {
    button.addEventListener('click', async () => {
      if (installed) {
        toast('نسخه اپ ماملی همین حالا روی دستگاه شما اجرا شده است.');
        return;
      }

      if (installPrompt) {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        toast(choice.outcome === 'accepted' ? 'ماملی در حال نصب روی دستگاه است.' : 'نصب لغو شد.');
        installPrompt = null;
        updateInstallState();
        return;
      }

      if (!guide.open) guide.showModal();
      const instructions = {
        ios: 'در Safari از Share، گزینه Add to Home Screen را بزنید.',
        windows: 'در Edge یا Chrome روی آیکون Install در نوار آدرس بزنید.',
        android: 'در Chrome منوی سه‌نقطه و گزینه Install app را انتخاب کنید.',
        desktop: 'در مرورگر سازگار گزینه Install app را انتخاب کنید.',
      };
      toast(instructions[platform], 4800);
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
    toast('ماملی با موفقیت نصب شد و اکنون مثل یک اپ مستقل اجرا می‌شود.', 4500);
  });

  updateInstallState();
}

function init() {
  $('#currentYear').textContent = String(new Date().getFullYear());
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

init();
