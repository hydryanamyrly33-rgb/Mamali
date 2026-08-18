const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const SITE_CONFIG = Object.freeze({
  telegram: {
    deepLink: 'tg://resolve?domain=Mr_CaceRo',
    fallback: 'https://t.me/Mr_CaceRo',
  },
  storageKey: 'mamali-orbit-settings-v2',
  themes: ['neon', 'aurora', 'solar'],
});

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
    const delta = Math.min(time - (this.lastTime || time), 50);
    this.lastTime = time;
    this.draw(delta);
    requestAnimationFrame(next => this.frame(next));
  }

  draw(delta) {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.width, this.height);
    if (!settings.particles || document.hidden) return;

    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue('--primary').trim();
    const accent = styles.getPropertyValue('--accent').trim();
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
    const delta = Math.min(time - this.lastFrame, 50);
    this.lastFrame = time;

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
    const width = this.scene.clientWidth;
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

let cosmos;
let orbit;

function cycleTheme() {
  const currentIndex = SITE_CONFIG.themes.indexOf(settings.theme);
  settings.theme = SITE_CONFIG.themes[(currentIndex + 1) % SITE_CONFIG.themes.length];
  applySettings();
  sound.play('toggle');
  const names = { neon: 'نئون', aurora: 'شفق', solar: 'خورشیدی' };
  toast(`تم ${names[settings.theme]} فعال شد.`);
}

function openTelegram() {
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

  toast('در حال اجرای اپلیکیشن تلگرام…', 2200);
  sound.play('open');
  window.location.href = SITE_CONFIG.telegram.deepLink;

  fallbackTimer = window.setTimeout(() => {
    if (appOpened || document.hidden) return;
    toast('اپ تلگرام پیدا نشد؛ نسخه وب به‌عنوان مسیر پشتیبان باز می‌شود.', 2600);
    window.location.href = SITE_CONFIG.telegram.fallback;
  }, 2600);
}

function setupTelegramLink() {
  const link = $('#telegramPortal');
  link.href = SITE_CONFIG.telegram.deepLink;
  link.dataset.fallback = SITE_CONFIG.telegram.fallback;
  link.addEventListener('click', event => {
    event.preventDefault();
    openTelegram();
  });
}

function setupDialogs() {
  const settingsDialog = $('#settingsDialog');
  const commandDialog = $('#commandDialog');

  $('#settingsButton').addEventListener('click', () => {
    sound.play('tap');
    settingsDialog.showModal();
  });

  for (const dialog of [settingsDialog, commandDialog]) {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) dialog.close();
    });
  }

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
      if (key === 'sound' && settings.sound) sound.ensureContext();
      applySettings({ notify: true });
      sound.play('toggle');
    });
  }

  $('#qualitySetting').addEventListener('change', event => {
    settings.quality = event.target.value;
    applySettings({ notify: true });
    cosmos.resize();
  });

  $('#resetSettings').addEventListener('click', () => {
    settings = { ...defaults };
    SafeStorage.remove(SITE_CONFIG.storageKey);
    applySettings({ notify: true });
    toast('همه تنظیمات به حالت اولیه برگشتند.');
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
    { icon: 'IG', title: 'بازکردن اینستاگرام', hint: 'شبکه تصویری', keywords: 'instagram اینستا اینستاگرام', run: () => window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer') },
    { icon: 'YT', title: 'بازکردن یوتیوب', hint: 'ویدیو و محتوا', keywords: 'youtube یوتیوب ویدیو', run: () => window.open('https://www.youtube.com/', '_blank', 'noopener,noreferrer') },
    { icon: 'TG', title: 'اجرای اپ تلگرام', hint: 'Deep Link مستقیم', keywords: 'telegram تلگرام app اپ', run: openTelegram },
    { icon: '◐', title: 'تغییر تم رنگی', hint: 'نئون، شفق، خورشیدی', keywords: 'theme تم رنگ ظاهر', run: cycleTheme },
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

function setupInstall() {
  const button = $('#installButton');
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    button.classList.add('is-installable');
  });

  button.addEventListener('click', async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      toast(choice.outcome === 'accepted' ? 'ماملی در حال نصب است.' : 'نصب لغو شد.');
      installPrompt = null;
      return;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast(isIOS ? 'از منوی Share گزینه Add to Home Screen را انتخاب کنید.' : 'از منوی مرورگر گزینه Install app یا افزودن به صفحه اصلی را بزنید.', 5200);
  });

  window.addEventListener('appinstalled', () => toast('ماملی با موفقیت روی دستگاه نصب شد.'));
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      // The site remains fully functional without offline support.
    });
  });
}

function init() {
  $('#currentYear').textContent = String(new Date().getFullYear());
  cosmos = new CosmosRenderer($('#cosmos'));
  orbit = new OrbitEngine($('#orbitScene'));
  applySettings();
  setupTelegramLink();
  setupDialogs();
  setupCommandPalette();
  setupControls();
  setupRevealAnimations();
  setupInstall();
  registerServiceWorker();
}

init();
