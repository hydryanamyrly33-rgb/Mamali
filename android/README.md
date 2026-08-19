# Android - Mamali Orbit 3.4.0

## Orientation
- Android: `screenOrientation="portrait"` in Manifest + JS lock `portrait-primary`
- Windows: `landscape` via JS (if wrapped in Windows app)
- iOS: portrait like Android

## Screenshot Lock REAL
In `MainActivity.java`:
```java
getWindow().setFlags(FLAG_SECURE, FLAG_SECURE);
```
This actually blocks screenshot and screen recording. For web version, we can't block OS screenshot, only try native bridge.

## Systematic Permissions
- POST_NOTIFICATIONS (Android 13+)
- INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK, VIBRATE

Requested in `onCreate()` systematically.

## Build
Use PWABuilder or Bubblewrap:
```
npx @bubblewrap/cli init --manifest https://mamali-orbit.vercel.app/Mamali/manifest.webmanifest
npx @bubblewrap/cli build
```

Main URL is Vercel: https://mamali-orbit.vercel.app/Mamali/
