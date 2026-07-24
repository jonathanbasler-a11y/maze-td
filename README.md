# Maze TD

Phaser 3 maze tower defense. Play in the browser — including Safari on iOS.

## Play now

**https://jonathanbasler-a11y.github.io/maze-td/**

On iPhone/iPad: open that link in Safari → Share → **Add to Home Screen** for fullscreen.

Tap the board to place · **Sell** then tap a tower · **Research** for upgrades · tap roster lines in the sidebar to pick towers.

**Feedback** (bottom bar) opens GitHub Issues so you can track bugs/improvements from iOS and pick them up later — see [docs/TRACKING.md](docs/TRACKING.md).

## Repo

https://github.com/jonathanbasler-a11y/maze-td

**Issues backlog:** https://github.com/jonathanbasler-a11y/maze-td/issues

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
