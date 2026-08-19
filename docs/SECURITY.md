# Security - Screenshot & Permissions Real

## Screenshot Lock REAL
- Android APK: MainActivity.java FLAG_SECURE
- Web: cannot truly block OS screenshot. We do minimal: no toast annoying, only native bridge try.
- iOS: no FLAG_SECURE, only blur on visibilitychange.

## Permissions Systematic Real
- Notification: Notification.requestPermission()
- Persistent storage: navigator.storage.persist()
- Orientation: screen.orientation.lock()
- For Android APK: POST_NOTIFICATIONS via ActivityCompat.requestPermissions in onCreate()

## Auth Security
- JWT verified with crypto.subtle.verify using Google JWKs
- Checks: alg RS256, kid, aud, iss, exp, iat, nbf, nonce, azp, email_verified
- No ID token stored, only profile.

## Vercel & GitHub Tokens
User gave tokens but says don't worry. For next AI, don't put tokens in code.
