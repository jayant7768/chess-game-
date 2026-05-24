# Chess Game Project

A simple, stylish web‑based chess game built with vanilla HTML, CSS and JavaScript. 

## Features
- Responsive 8×8 board with modern glass‑morphism styling
- Full chess rules (castling, en‑passant, promotion, check/check‑mate detection)
- Drag‑and‑drop or click‑to‑move interface
- Basic AI opponent (Minimax with Alpha‑Beta pruning, 3 difficulty levels)
- Move history panel and game controls (reset, undo, flip board)
- Ready for deployment on GitHub Pages

## Project Structure
```
chess-game/
├─ index.html          # Main page
├─ style.css           # Styling (dark mode, animations)
├─ script.js           # Game logic and AI
├─ README.md           # Instructions for developers
└─ assets/             # Optional piece SVGs (currently using Unicode)
```

## Quick Start
1. Clone the repo or copy the folder to your web server.
2. Open `index.html` in a browser.
3. Play locally or push to GitHub and enable GitHub Pages.

## Deploy to GitHub
```bash
# From the `chess-game` folder
git init
git add .
git commit -m "Initial chess game release"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/chess-game.git
git push -u origin main
```
Then enable **Pages** in the repository settings (source: `main` / `root`).

Enjoy the game and feel free to extend the AI or UI! 🎉
