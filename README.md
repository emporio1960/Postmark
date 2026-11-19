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
| 64 templates, 22 occasions (incl. Australian ones), 10 styles | `src/data/templates.ts`, `occasions.ts` |
| Message writer (provider interface, ready for an AI backend) | `src/data/messages.ts` |
| Local persistence and app store | `src/lib/storage.ts`, `store.tsx` |
| Premium seam (no payments implemented) | `src/lib/entitlements.ts` |
| Shareable card links (card travels inside the link) | `src/lib/share.ts`, `src/pages/Shared.tsx` |
| Video export, envelope designer | `src/render/video.ts`, `src/render/envelope.ts` |
| Backup / restore, calendar (.ics) export | `src/lib/backup.ts`, `src/lib/ics.ts` |
| iCloud sync via CloudKit JS (setup in `CLOUDKIT.md`) | `src/lib/cloud.ts`, `src/lib/sync.tsx`, `src/config.ts` |
| Example AI message backend (keeps the key server-side) | `server/ai-worker.example.js` |
| Editor (stage, undo/redo, panels) | `src/editor/` |
| Screens | `src/pages/` |

## Notes

- **Card units:** 200 units = 1 inch. Portrait 5 × 7 in, landscape 7 × 5 in, square 5 × 5 in. "High" export quality is 300 dpi.
- **Fonts** are bundled through `@fontsource` — no external font service.
- **AI messages:** deploy `server/ai-worker.example.js` (or any endpoint with the same contract) and paste its URL into Settings → AI message writer. The API key stays on that server; the built-in writer is used whenever the endpoint is missing or fails.
- **Card links** only work for cards small enough to fit in a URL, which in practice means cards without photographs. Cards with photos share as images.
- **Video export** uses the browser's MediaRecorder, so the file is MP4 or WebM depending on the browser.
- **Notifications** only fire while the app is open; background reminders would need a server and push subscription.
- **Text the message** (phones only) opens the messaging app with the card's words prefilled; to send the card image by SMS/MMS use Share.
- **Share / print / PDF download** depend on the browser. Inside an embedded preview frame they are hidden or replaced with a save-image fallback.

## Love, From card viewer

`public/c/index.html` is the page recipients see when the Love, From iOS app sends a card link.
It reads the published card from the app's public iCloud database and shows the opening
animation, both sides of the card, the effect and the voice note. `public/404.html` forwards
`…/c/<id>` and `…/r/<id>` links to it.

- In Love, From → Settings → Card viewer, enter `https://emporio1960.github.io/Postmark`.
- Paste a CloudKit **API token** for `iCloud.Vibe-Central.Love--From` into `CONFIG.apiToken`
  at the top of the script in `public/c/index.html` (CloudKit Console → Tokens & Keys).
  The token is read-only and safe to publish.
- Try it without a real card: `…/Postmark/c/?demo=1` (add `&opening=scratch_reveal`,
  `confetti_pop` or `classic`, and `&effect=fireworks`, `sparkles` or `moving_flowers`).
