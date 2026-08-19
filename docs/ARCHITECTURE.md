# Mamali Orbit Architecture 3.8.0 - For Next AI

This file explains zero to hundred for next AI.

## Core Idea
Single-page PWA with auth gate. No backend. All in browser.

## Managers in app.js (2400+ lines)
- OrientationLockManager: Android portrait, Windows landscape, iOS portrait
- ScreenshotProtectionManager: FLAG_SECURE bridge for APK, minimal for web
- DeviceDetectionManager: detects Android/Windows/iOS, badge beautiful in login only
- MouseTrailManager: Windows mouse light orb following cursor
- TouchRippleManager: Android/iOS finger ripple different from mouse
- PermissionManager: systematic real permissions (notification + storage)
- LiveGoogleTestManager: real-time ping accounts.google.com, shows connection status
- ScrollCinematicManager: parallax, scroll progress, cinematic animations
- AuthManager: Google GIS + OAuth redirect + external browser fallback, IndexedDB trusted device
- CosmosRenderer, OrbitEngine, DeviceTiltController, UpdateManager

## Files
index.html: authGate + appShell, deviceBadge, rotatePrompt, mouse-trail div
styles.css: original 1911 + 3.3.1 fixes + 3.4.0 new (mouse trail, ripple, device badge, windows compact, live test) + 3.8.0 polish
app.js: all managers
manifest: orientation any (so JS can decide per device)
sw.js: online-first, cache app-shell v3.8.0

## Responsive Smart
- Mobile (Android/iOS): 1 column, phone visual 220px
- Tablet: 2 columns
- Desktop Windows: 3 columns, compact gap, hover effects
- Wide >1600px: reduced padding to avoid empty ugly space

## Google Client Live Test
Tests:
- fetch https://accounts.google.com/gsi/client?hl=fa (should 200)
- fetch https://www.googleapis.com/oauth2/v3/certs (JWKs)
- Client ID format check
- Authorized origin check (location.origin === https://mamali-orbit.vercel.app)

Shows in auth gate: dot green/red with latency.

## Deployment
Vercel is main origin, GitHub backup.
vercel.json redirects / -> /Mamali/
Push to main -> Vercel auto deploy.

## Security
No token stored. Only sub/email/name/picture in IndexedDB.
FLAG_SECURE for APK screenshot block.

For next AI: read this file + PROJECT_GUIDE_FOR_NEXT_AI.md + code.

## Version Archive (slim since 3.8.0)
Since 3.8.0 the archive keeps only two real snapshots:
- **3.0.0** — the very first release at `history/play/3.0.0/` (own `index.html` + `app.js` + `styles.css`, separate IndexedDB `mamali-archive-identity-300`, no SW registration so the live PWA stays in control, 3D back-to-new button that returns to `/Mamali/`).
- **3.8.0** — the live app at `/Mamali/`.
Intermediate versions 3.1.0–3.6.2 were removed. To restore one, drop its real folder into `history/play/` and add an entry in `history/versions.json`.
