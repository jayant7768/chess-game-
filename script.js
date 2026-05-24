/* ==============================================================
   MODERN CHESS GAME ENGINE UI UPGRADE
   Replace your OLD render() function with this COMPLETE one
   ============================================================== */

function render() {

  const boardEl = document.getElementById('board');

  boardEl.innerHTML = '';

  /* ===== MODERN BOARD STYLE ===== */
  boardEl.style.cssText = `
    display:grid;
    grid-template-columns:repeat(8,1fr);

    width:min(620px,92vw);

    aspect-ratio:1;

    border-radius:18px;

    overflow:hidden;

    border:4px solid rgba(255,255,255,0.08);

    box-shadow:
      0 25px 60px rgba(0,0,0,0.55),
      inset 0 0 20px rgba(255,255,255,0.05);

    background:#111827;
  `;

  const rows = flipped
    ? [0,1,2,3,4,5,6,7]
    : [7,6,5,4,3,2,1,0];

  const cols = flipped
    ? [7,6,5,4,3,2,1,0]
    : [0,1,2,3,4,5,6,7];

  for (const r of rows) {

    for (const c of cols) {

      const square = document.createElement('div');

      const isDark = (r + c) % 2 === 1;

      const squareId = idxToSq(r, c);

      const piece = board[r][c];

      square.dataset.row = r;
      square.dataset.col = c;

      /* ===== PROFESSIONAL BOARD COLORS ===== */
      square.style.cssText = `
        display:flex;
        align-items:center;
        justify-content:center;

        position:relative;

        background:${isDark ? '#b58863' : '#f0d9b5'};

        font-size:clamp(2.2rem,4vw,3.2rem);

        cursor:pointer;

        user-select:none;

        transition:
          transform 0.15s ease,
          filter 0.15s ease,
          background 0.2s ease;
      `;

      /* ===== HOVER EFFECT ===== */
      square.addEventListener('mouseenter', () => {

        square.style.filter = 'brightness(1.08)';

      });

      square.addEventListener('mouseleave', () => {

        square.style.filter = 'brightness(1)';

      });

      /* ===== SELECTED PIECE ===== */
      if (
        selected &&
        selected.row === r &&
        selected.col === c
      ) {

        square.style.boxShadow =
          'inset 0 0 0 5px #ffd700';

      }

      /* ===== VALID MOVE INDICATORS ===== */
      if (legalMoves.includes(squareId)) {

        const moveDot = document.createElement('div');

        moveDot.style.cssText = `
          width:18px;
          height:18px;

          border-radius:50%;

          background:rgba(0,0,0,0.35);

          position:absolute;

          top:50%;
          left:50%;

          transform:translate(-50%,-50%);
        `;

        square.appendChild(moveDot);
      }

      /* ===== PIECE RENDERING ===== */
      if (piece) {

        const pieceEl = document.createElement('div');

        pieceEl.textContent =
          UNICODE[piece.color][piece.type];

        pieceEl.style.pointerEvents = 'none';

        pieceEl.style.transition =
          'transform 0.15s ease';

        /* ===== WHITE PIECES ===== */
        if (piece.color === 'w') {

          pieceEl.style.color = '#ffffff';

          pieceEl.style.textShadow = `
            0 0 2px #000,
            0 0 6px rgba(0,0,0,0.45)
          `;
        }

        /* ===== BLACK PIECES ===== */
        else {

          pieceEl.style.color = '#111111';

          pieceEl.style.textShadow = `
            0 0 2px rgba(255,255,255,0.2)
          `;
        }

        square.appendChild(pieceEl);
      }

      square.addEventListener('click', onSquareClick);

      boardEl.appendChild(square);
    }
  }

  updateStatus();

  updateUndoBtn();
}


/* ==============================================================
   MODERN THEME
   Replace OLD applyTheme() with this
   ============================================================== */

function applyTheme() {

  const dark =
    document.getElementById('themeSwitch')?.checked ?? true;

  document.body.style.background = dark
    ? `
      radial-gradient(circle at top,
      #1e293b,
      #0f172a 60%)
    `
    : `
      linear-gradient(135deg,
      #dbeafe,
      #e0e7ff)
    `;

  document.body.style.color =
    dark ? '#ffffff' : '#111827';

  document.body.style.minHeight = '100vh';

  document.body.style.fontFamily =
    'Inter, sans-serif';
}


/* ==============================================================
   MODERN BUTTON UI
   Add this after DOMContentLoaded
   ============================================================== */

window.addEventListener('DOMContentLoaded', () => {

  initGame();

  render();

  applyTheme();

  /* ===== BUTTON STYLING ===== */
  document.querySelectorAll('button').forEach(btn => {

    btn.style.cssText = `
      background:rgba(255,255,255,0.08);

      border:1px solid rgba(255,255,255,0.12);

      color:white;

      padding:10px 18px;

      border-radius:12px;

      cursor:pointer;

      transition:0.2s ease;

      backdrop-filter:blur(10px);

      font-weight:600;
    `;

    btn.addEventListener('mouseenter', () => {

      btn.style.transform = 'translateY(-2px)';

      btn.style.background =
        'rgba(255,255,255,0.15)';
    });

    btn.addEventListener('mouseleave', () => {

      btn.style.transform = 'translateY(0px)';

      btn.style.background =
        'rgba(255,255,255,0.08)';
    });
  });

  /* ===== CONTROLS ===== */

  document.getElementById('newGameBtn')
    .addEventListener('click', () => {

      initGame();

      document.getElementById('moveList').innerHTML = '';

      render();
    });

  document.getElementById('undoBtn')
    .addEventListener('click', () => {

      undoMove();

      if (aiEnabled && moveHistory.length > 0)
        undoMove();
    });

  document.getElementById('flipBtn')
    .addEventListener('click', () => {

      flipped = !flipped;

      render();
    });

  document.getElementById('themeSwitch')
    ?.addEventListener('change', applyTheme);
});
