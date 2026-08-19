# Mamali Orbit Architecture 3.4.0 - For Next AI

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
styles.css: original 1911 + 3.3.1 fixes + 3.4.0 new (mouse trail, ripple, device badge, windows compact, live test)
app.js: all managers
manifest: orientation any (so JS can decide per device)
sw.js: online-first, cache app-shell v3.4.0

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
