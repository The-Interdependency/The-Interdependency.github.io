# Browser support

## Minimum display floor

The public website must display on an Android SDK 22 / API 22-era browser.

"Display" means the core public reading surface remains readable and navigable:
- primary navigation is present without JavaScript;
- substantive text is present in static HTML;
- a narrow 320 CSS-pixel viewport retains the reading surface;
- unsupported modern JavaScript is enhancement-only and may be ignored;
- unsupported modern CSS may reduce styling, but must not hide or gate content.

The first block of `src/assets/css/site.css` is the compatibility floor. Keep it free of CSS custom properties, Grid, `clamp()`/`min()`/`max()`, `aspect-ratio`, `inset`, and other modern-only layout requirements. Modern CSS follows as progressive enhancement.

First-party modern enhancement scripts loaded by the shared layouts are modules so an API 22-era engine can ignore them rather than being asked to parse newer JavaScript syntax.

## Verification

`tests/sdk22-contract.test.mjs` protects the source-level compatibility contract.
`tests/sdk22.spec.mjs` exercises representative generated routes at 320×568 with JavaScript disabled and an Android 5.1-era user agent.

These checks protect graceful degradation; current Playwright Chromium does not emulate the historical Android WebView engine.

## hmmm

A physical or emulator-backed API 22 WebView run remains the authoritative engine-level witness. Until that exists in CI, release evidence should distinguish the enforced structural display floor from a native API 22 rendering witness.
