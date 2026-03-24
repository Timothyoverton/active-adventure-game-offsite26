# Reactive Adventure 🏃‍♂️📊

**A browser-based office platformer for the whole team.**

🎮 **[Play the game here](https://timothyoverton.github.io/active-adventure-game-offsite26/)**

---

## About

*Reactive Adventure* is a side-scrolling platformer built as a team activity by **Reactive — 25 Years of Business Agility**, inspired by the classic NES game **Adventure Island**.

### The Adventure Island Connection

Adventure Island (1986) is a beloved NES platformer where you play as Master Higgins — a little dude in a grass skirt racing through tropical levels. The core loop is deceptively simple and brutally addictive:

- You **auto-run** to the right — no stopping
- A **vitality meter** constantly drains, so you must keep moving and collecting
- **Jump** over obstacles, **throw axes** at enemies, and grab fruit to stay alive
- Enemies have simple patrol patterns but the relentless timer keeps the pressure on

We took that same formula and transplanted it into an **office environment** — swapping tropical islands for open-plan offices, stone axes for staplers, and tropical fruit for coffee.

---

## The Game

You play as one of four accountant archetypes, sprinting through the office trying to maintain your **Compliance Meter** before it drains to zero. Collect office supplies to top it up, throw staplers at obstacles, and use your special ability to survive.

### Choose Your Accountant

| Character | Ability | Playstyle |
|-----------|---------|-----------|
| 📊 **The Preparer** | Rapid Fire — staplers 3× faster for 5s | Aggressive, high DPS |
| 🔍 **The Reviewer** | Double Jump + Super Jump ability | Mobility, platform master |
| 💼 **The Manager** | Multi-Stapler — fires 3 at once | Big power bursts |
| 🏆 **The Partner** | Compliance Shield — 4s invincibility | Tank, survives anything |

### Enemies

- **💻 Laptop** — left carelessly on the floor. A classic trip hazard.
- **🗄️ Filing Cabinet** — immovable. Don't ask IT to move it.
- **😤 Stressed Colleague** — charging toward you, papers flying everywhere.
- **🖨️ Printer Jam** — stationary but shoots paper at you. Infuriating.
- **📋 Audit Alert** — flies in a sine wave. Two hits to kill. The final boss of admin.

### Collectibles

| Item | Compliance Restore |
|------|--------------------|
| ☕ Coffee | +10% |
| 📄 Financial Document | +15% |
| 🧮 Calculator | +20% |
| ⚡ Energy Drink | +25% |
| 📘 Compliance Manual | +50% |

---

## Controls

| Key | Action |
|-----|--------|
| `Space` / `W` / `↑` | Jump |
| `Z` | Throw stapler |
| `X` | Activate special ability |

---

## Tech Stack

- **Angular 20** (standalone components, signals)
- **HTML5 Canvas** for all game rendering — no external game libraries
- Pure **TypeScript** game engine
- Deployed via **GitHub Pages**

---

## Development

```bash
npm install
npm start          # dev server → http://localhost:4200
npm run build      # production build
npm run deploy     # build + push to GitHub Pages
```

---

*Built as a team activity by Reactive. Based on the spirit of Hudson Soft's Adventure Island (1986).*
