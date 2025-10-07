## Scoundrel (React + Vite PWA)

A polished, accessible, mobile-first web version of the solo card game Scoundrel — now built with React + Vite and shipped as an installable Progressive Web App that works offline.

Original vanilla HTML/CSS/JS edition for reference: [JacintoDesign/scoundrel-game](https://github.com/JacintoDesign/scoundrel-game).

### Play

- Development: `npm install` then `npm run dev` and open the printed local URL
- Production build: `npm run build`
- Preview production build locally: `npm run preview`

The app auto-saves after each action and resumes automatically when you return.

### Features

- Full rules implementation with clear UI feedback and logs
- 3D card flip animation with proper backs (honors `prefers-reduced-motion`)
- Killer card shown on Game Over (mini card preview) with centered score line
- Mobile-friendly layout:
  - HUD health meter on its own row; four panels on one row
  - Action buttons (Face Selected, Avoid Room) sized to card columns
  - Compact header with a menu toggle
- Accessible: keyboard support, focus styles, ARIA live log
- Persistent saves via LocalStorage
- React + Vite architecture for fast iteration and modern tooling
- Installable PWA with offline support:
  - Service Worker generated via `vite-plugin-pwa` with Workbox
  - Offline-first caching for shell and assets after first load
  - Auto-update behavior for new releases
  - Manifest with icons (including maskable) and `display: standalone`

### Offline/PWA

This project uses `vite-plugin-pwa` to generate a Service Worker and web app manifest.

- First load caches the app shell and static assets; subsequent loads work fully offline
- Auto-updates: the Service Worker checks for updates and refreshes caches
- Icons and theme are defined in the manifest for install banners on supported devices

How to test offline locally:

1. Run `npm run build` then `npm run preview`
2. Open the app in your browser and interact with it (to warm caches)
3. Toggle your browser to Offline and refresh — the game should still load and play

If you need to reset the app, clear site data (storage + caches) in your browser.

### Rules Summary

- Health: start at 20 (max 20). Clear the dungeon to win; if health ≤ 0, you lose.
- Deck setup (44 cards total):
  - Monsters: all clubs/spades (♣/♠): 2–10, J=11, Q=12, K=13, A=14 (26)
  - Weapons: diamonds (♦) 2–10 (9)
  - Potions: hearts (♥) 2–10 (9)
  - Removed: red face cards (J/Q/K ♥♦) and red Aces (A♥, A♦)
- Room: draw up to 4 cards visible.
  - Avoid Room: put all 4 on bottom (cannot avoid twice in a row)
  - Face: choose 3 to resolve in any order; the 4th carries to next room
- Resolving:
  - Weapon (♦): equip; discard old weapon and its stacked monsters; resets last‑defeated gate
  - Potion (♥): heal by its value (cap 20). Only one potion per room heals; extras are discarded
  - Monster (♣/♠):
    - Bare-handed: take full value as damage
    - With weapon: damage = max(0, monster − weapon). If 0, monster is defeated and stacked
    - Non‑increasing gate: you can only use the weapon on values ≤ the last defeated monster (or any value until your first defeat with that weapon)
- End & Score:
  - Win: score = remaining health
  - Lose: score = negative sum of remaining monster values in deck/room/carry; Game Over modal shows the killer card

### React/Vite Project Structure

- `index.html` — Root HTML; Vite injects scripts and registers the Service Worker
- `src/main.tsx` — React bootstrap
- `src/App.tsx` — App shell
- `src/components/Game.tsx` — Game UI composed in React
- `src/game/` — Adapted assets and logic from the original vanilla project
  - `css/styles.css` — Theme, layout, responsive/mobile tweaks, animations
  - `js/` — Core rules and state mechanics
  - `assets/` — Card art and images
- `public/` — Static assets (icons, deck/heart/club/spade/diamond images)
- `vite.config.ts` — Vite config with PWA plugin and Workbox runtime caching
- `eslint.config.js` — ESLint configuration

### Accessibility

- Keyboard: tab to cards, Enter/Space to select; buttons are reachable and labeled
- Visible focus styles; live region for log updates
- Respects `prefers-reduced-motion` (reduces flip animations)

### Development

- No server required beyond Vite dev/preview; the game state persists in LocalStorage
- Edit files and the UI hot-reloads via Vite

### License and Credits

This project recreates rules described openly and contains only original code and assets. No external UI libraries required.

Ported to React + Vite PWA from the original vanilla edition: [JacintoDesign/scoundrel-game](https://github.com/JacintoDesign/scoundrel-game).
