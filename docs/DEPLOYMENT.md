# Deployment - Vercel Main

Main URL: https://mamali-orbit.vercel.app/Mamali/
GitHub backup: https://hydryanamyrly33-rgb.github.io/Mamali/ (not main)

## Vercel Project
- Project: mamali-orbit
- ID: prj_WnFY6aZtA916BJuv1QMl8LmH5azF
- Connected to GitHub hydryanamyrly33-rgb/Mamali main branch
- Every push to main creates production deployment

## vercel.json
```
redirects: / -> /Mamali/
rewrites: /Mamali/ -> /index.html, /Mamali/:path* -> /:path*
```

## Version bump
node scripts/release.mjs patch/minor/major
Updates: version.json, sw.js CACHE_NAME, index.html ?v=, app.js APP_VERSION

## Smoke test
node tests/smoke.mjs - should pass

## Google OAuth
Client ID: 737314975140-nhilm65a3mr9bsemufr4e83cmhisq77e.apps.googleusercontent.com
Authorized JS origins:
- https://mamali-orbit.vercel.app
- https://hydryanamyrly33-rgb.github.io
Authorized redirect URIs:
- https://mamali-orbit.vercel.app/Mamali/
