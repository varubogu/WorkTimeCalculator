# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.
Always response japanese
When modifying code, update the related documentation as needed.

## Commands

```bash
bun run dev      # Start server with auto-reload (development)
bun run build    # Build production version (type check + minify)
```

The server runs on port 3000 by default; override with `PORT=<n>`.

## Architecture

This is a **client-side-only** single-page app built with Vite + React + TypeScript.
The Bun server (`server.ts`) is a thin static file server for production builds — all application logic lives in the browser.

```
index.html             # Vite entry HTML
src/
  main.tsx             # React entry point
  App.tsx              # Root component and application state
  index.css            # All styles via CSS custom properties
  components/          # UI components
server.ts              # Bun HTTP server — serves dist/ after build
public/                # Optional Vite static assets copied as-is
```

`public/` follows the Vite default behavior: files placed there are copied to the build output root and are referenced by absolute paths such as `/favicon.svg`. Do not put application source code in `public/`.

### State and persistence

All state is in `localStorage` (never sent to the server):
- Entry keys: `wtc_YYYY-MM-DD` → `Entry`
- Settings key: `wtc_settings` → `Settings`

`App.tsx` holds UI state in memory; persisted work entries and settings are read through `src/storage.ts`.

### Time math rules

- All times stored as `"HH:MM"` strings; converted to minutes-since-midnight for math.
- Net minutes = `(end − start) − breakMin`; midnight-crossing is not supported.
- Hours cell colour: **green** ≥ target day, **amber** < target day, **red** ≥ 600 min (10 h).
- Monthly and yearly progress are calculated from stored daily entries and configured targets.

### Adding a new setting

1. Add the field to `Settings` in `src/types.ts`.
2. Extend `defaultSettings()` and `mergeSettings()` in `src/storage.ts`.
3. Add the UI row in `src/components/SettingsModal.tsx`.
4. Add labels to both languages in `src/i18n.ts`.
5. Use the value through `settings` in `src/App.tsx` or a component prop.
