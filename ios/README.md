# iOS - Mamali Orbit 3.4.0

iOS same as Android: portrait lock, PWA installable.

## PWA Install on iOS
- Open in Safari: https://mamali-orbit.vercel.app/Mamali/
- Share -> Add to Home Screen

## Orientation
- iOS Safari doesn't support screen.orientation.lock() fully, so we show rotate prompt if landscape
- Manifest orientation any + JS check

## Screenshot
- iOS doesn't allow FLAG_SECURE like Android. We use blur on visibilitychange and CSS user-select none minimal.
- For real block, need native Swift wrapper with `UIApplication.shared.isScreenCaptureDisabled`? Actually need `UIScreen.main.isCaptured` detection.

## Permissions
- Notification via Web Push (Safari 16.4+)
- Persistent storage via `navigator.storage.persist()`
