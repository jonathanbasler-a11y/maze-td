# Maze TD

Phaser 3 maze tower defense. Play in the browser — including Safari on iOS.

## Play on iOS

1. Open the GitHub Pages URL in Safari
2. Optional: Share → **Add to Home Screen** for fullscreen
3. Tap board to place · **Sell** then tap a tower · **Research** for upgrades · sidebar to pick towers

## Run locally

```bash
npm install
npm run dev
```

## Controls

| Input | Action |
|-------|--------|
| Tap / Left click | Place selected tower |
| Sell button then tap / Right click | Sell (55% refund; locked mid-wave) |
| Sidebar roster / `1`–`9` | Select unlocked tower |
| Research / `Tab` | Research tree (spend RP) |
| Next / `N` `P` | Next / previous level |
| Restart / `R` | Restart level |
| Pause / Space | Pause |

## Content

- **14 levels** with maze layouts
- **12 towers** (6 base + research unlocks)
- **10 enemies**
- **Research tree** — RP persists in browser `localStorage`

## QA

```bash
npm test
```
