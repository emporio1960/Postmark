# Greeting Card Studio

A premium digital greeting-card studio built with React, TypeScript, Vite, Tailwind CSS and Lucide icons.
Everything runs in the browser: cards, photos, favourites, occasions and settings are stored locally (IndexedDB) and nothing is sent to a server.

## Run it

```bash
npm install
npm run dev            # development server
npm run build          # type-check + production build in dist/
npm run build:single   # one self-contained dist-single/index.html
npm run preview        # serve the production build
```

## Install as an app (PWA)

The production build is an installable, offline-capable progressive web app. Open the hosted site, then:

- **iPhone / iPad (Safari):** Share → Add to Home Screen.
- **Android / desktop Chrome or Edge:** use the Install option in the address bar or menu.

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## What's inside

| Area | Where |
| --- | --- |
| Domain model (cards, faces, elements) | `src/types.ts` |
| Canvas renderer shared by thumbnails, editor, preview and export | `src/render/renderer.ts` |
| Procedural artwork, vector stickers, photo filters | `src/render/art.ts`, `stickers.ts`, `images.ts` |
| PNG / PDF / share / print | `src/render/export.ts` |
| 46 templates, 18 occasions, 10 styles | `src/data/templates.ts`, `occasions.ts` |
| Message writer (provider interface, ready for an AI backend) | `src/data/messages.ts` |
| Local persistence and app store | `src/lib/storage.ts`, `store.tsx` |
| Premium seam (no payments implemented) | `src/lib/entitlements.ts` |
| Editor (stage, undo/redo, panels) | `src/editor/` |
| Screens | `src/pages/` |

## Notes

- **Card units:** 200 units = 1 inch. Portrait 5 × 7 in, landscape 7 × 5 in, square 5 × 5 in. "High" export quality is 300 dpi.
- **Fonts** are bundled through `@fontsource` — no external font service.
- **AI messages:** implement `MessageProvider` with a class that calls your own backend and add it to `providers`. Never place an API key in frontend code.
- **Notifications** only fire while the app is open; background reminders would need a server and push subscription.
- **Text the message** (phones only) opens the messaging app with the card's words prefilled; to send the card image by SMS/MMS use Share.
- **Share / print / PDF download** depend on the browser. Inside an embedded preview frame they are hidden or replaced with a save-image fallback.
