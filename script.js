/* ==============================================================
   script.js  –  Complete Chess Game Engine (Vanilla JS)
   ============================================================== */

/* ─── 1. CONSTANTS ─────────────────────────────────────────── */
const FILES = ['a','b','c','d','e','f','g','h'];
const SCORE  = { P:100, N:320, B:330, R:500, Q:900, K:20000 };
const AI_DEPTH = { easy:1, medium:3, hard:4 };

const UNICODE = {
  w: { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙' },
  b: { K:'♚', Q:'♛', R:'♜', B:'♝', N:'♞', P:'♟' }
};

/* ─── 2. HELPERS ────────────────────────────────────────────── */
const sqToIdx = sq  => [8 - parseInt(sq[1], 10), FILES.indexOf(sq[0])];
const idxToSq = (r,c) => `${FILES[c]}${8 - r}`;
const opposite = col => col === 'w' ? 'b' : 'w';
const cloneBoard = b => b.map(r => r.map(c => c ? {...c} : null));

/* ─── 3. GAME STATE ─────────────────────────────────────────── */
let board, turn, selected, legalMoves, moveHistory;
let castling, enPassantTarget, halfmoveClock, fullmoveNumber;
let aiEnabled = false, aiDifficulty = 'medium', flipped = false;

function initGame() {
  board = Array.from({length:8}, () => Array(8).fill(null));
  const backRank = ['R','N','B','Q','K','B','N','R'];
  backRank.forEach((t,i) => {
    board[0][i] = {type:t, color:'b'};
    board[7][i] = {type:t, color:'w'};
  });
  for(let c=0;c<8;c++){
    board[1][c] = {type:'P', color:'b'};
    board[6][c] = {type:'P', color:'w'};
  }
  turn            = 'w';
  selected        = null;
  legalMoves      = [];
  moveHistory     = [];
  castling        = { w:{K:true,Q:true}, b:{K:true,Q:true} };
  enPassantTarget = null;
  halfmoveClock   = 0;
  fullmoveNumber  = 1;
}

/* ─── 4. RENDER ─────────────────────────────────────────────── */
function render() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  boardEl.style.cssText = `
    display:grid;
    grid-template-columns:repeat(8,1fr);
    width:min(560px,90vw);
    aspect-ratio:1;
    border-radius:12px;
    overflow:hidden;
    box-shadow:0 16px 40px rgba(0,0,0,.55);
  `;

  const rows = flipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const cols = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  for(const r of rows) {
    for(const c of cols) {
      const sq   = document.createElement('div');
      const dark = (r + c) % 2 === 1;
      const sqId = idxToSq(r,c);
      const p    = board[r][c];

      sq.dataset.row = r;
      sq.dataset.col = c;
      sq.style.cssText = `
        display:flex; align-items:center; justify-content:center;
        font-size:clamp(1.6rem,4vw,2.4rem);
        cursor:pointer;
        user-select:none;
        background:${dark ? '#b58863' : '#f0d9b5'};
        transition: background .15s, transform .1s;
        position:relative;
      `;

      if(selected && selected.row===r && selected.col===c) {
        sq.style.background = '#f6f669cc';
      }
      if(legalMoves.includes(sqId)) {
        sq.style.background = dark ? '#cdd16e' : '#f6f669';
      }

      if(p) sq.textContent = UNICODE[p.color][p.type];

      sq.addEventListener('mouseenter', () => { sq.style.transform='scale(1.08)'; });
      sq.addEventListener('mouseleave', () => { sq.style.transform='scale(1)'; });
      sq.addEventListener('click', onSquareClick);
      boardEl.appendChild(sq);
    }
  }
  updateStatus();
  updateUndoBtn();
}

function updateStatus() {
  const el   = document.getElementById('statusMsg');
  const name = turn === 'w' ? '⬜ White' : '⬛ Black';
  if(isCheckmate(turn))      el.innerHTML = `🏆 <strong>${opposite(turn)==='w'?'⬜ White':'⬛ Black'} wins by checkmate!</strong>`;
  else if(isStalemate(turn)) el.innerHTML = `🤝 <strong>Stalemate – draw!</strong>`;
  else if(isInCheck(turn))   el.innerHTML = `⚠️ <strong>${name} is in check!</strong>`;
  else                       el.innerHTML = `${name} to move`;
}

function updateUndoBtn() {
  document.getElementById('undoBtn').disabled = moveHistory.length === 0;
}

/* ─── 5. MOVE GENERATION ────────────────────────────────────── */
function generateLegalMoves(fr, fc) {
  const piece = board[fr][fc];
  if(!piece) return [];
  const raw = generatePseudo(fr, fc, piece, board, true);
  return raw.filter(m => !leavesKingInCheck(piece.color, {from:idxToSq(fr,fc), to:m.to, extra:m.extra||{}})).map(m=>m.to);
}

function generatePseudo(fr, fc, piece, brd, full=false) {
  const moves  = [];
  const col    = piece.color;
  const addSq  = (r,c,extra={}) => {
    if(r<0||r>7||c<0||c>7) return;
    const t = brd[r][c];
    if(t && t.color===col) return;
    moves.push({from:idxToSq(fr,fc), to:idxToSq(r,c), extra});
  };
  const slide  = (dr,dc) => {
    let r=fr+dr, c=fc+dc;
    while(r>=0&&r<8&&c>=0&&c<8){
      const t=brd[r][c];
      if(t && t.color===col) break;
      moves.push({from:idxToSq(fr,fc), to:idxToSq(r,c), extra:{}});
      if(t) break;
      r+=dr; c+=dc;
    }
  };

  switch(piece.type) {
    case 'P': {
      const dir   = col==='w' ? -1 : 1;
      const start = col==='w' ? 6  : 1;
      // forward
      if(fr+dir>=0 && fr+dir<8 && !brd[fr+dir][fc])
        addSq(fr+dir, fc);
      // double
      if(fr===start && !brd[fr+dir][fc] && !brd[fr+2*dir][fc])
        addSq(fr+2*dir, fc, {double:true});
      // captures
      for(const dc of [-1,1]){
        const nr=fr+dir, nc=fc+dc;
        if(nr<0||nr>7||nc<0||nc>7) continue;
        if(brd[nr][nc] && brd[nr][nc].color!==col) addSq(nr,nc);
        if(full && enPassantTarget===idxToSq(nr,nc))
          moves.push({from:idxToSq(fr,fc), to:idxToSq(nr,nc), extra:{enPassant:true}});
      }
      break;
    }
    case 'N':
      [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
        .forEach(([dr,dc])=>addSq(fr+dr,fc+dc)); break;
    case 'B': [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc)); break;
    case 'R': [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc)); break;
    case 'Q': [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc)); break;
    case 'K': {
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>addSq(fr+dr,fc+dc));
      if(full && !isInCheck(col)){
        // king-side
        if(castling[col].K && !brd[fr][fc+1] && !brd[fr][fc+2]
           && !isSquareAttacked(idxToSq(fr,fc+1), opposite(col))
           && !isSquareAttacked(idxToSq(fr,fc+2), opposite(col)))
          moves.push({from:idxToSq(fr,fc), to:idxToSq(fr,fc+2), extra:{castling:'K'}});
        // queen-side
        if(castling[col].Q && !brd[fr][fc-1] && !brd[fr][fc-2] && !brd[fr][fc-3]
           && !isSquareAttacked(idxToSq(fr,fc-1), opposite(col))
           && !isSquareAttacked(idxToSq(fr,fc-2), opposite(col)))
          moves.push({from:idxToSq(fr,fc), to:idxToSq(fr,fc-2), extra:{castling:'Q'}});
      }
    }
  }
  return moves;
}

function leavesKingInCheck(color, move) {
  const tmp = cloneBoard(board);
  const [fr,fc] = sqToIdx(move.from);
  const [tr,tc] = sqToIdx(move.to);
  const p = {...tmp[fr][fc]};

  if(move.extra.enPassant){
    const epRow = color==='w' ? tr+1 : tr-1;
    tmp[epRow][tc] = null;
  }
  if(move.extra.castling){
    const side = move.extra.castling;
    if(side==='K'){ tmp[fr][5]=tmp[fr][7]; tmp[fr][7]=null; }
    else          { tmp[fr][3]=tmp[fr][0]; tmp[fr][0]=null; }
  }
  tmp[tr][tc]=p; tmp[fr][fc]=null;

  let kSq=null;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(tmp[r][c]?.type==='K' && tmp[r][c].color===color)
      kSq=idxToSq(r,c);
  return isSquareAttacked(kSq, opposite(color), tmp);
}

function isSquareAttacked(sq, byColor, brd=board){
  const [tr,tc]=sqToIdx(sq);
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=brd[r][c];
    if(p && p.color===byColor){
      const pseudo=generatePseudo(r,c,p,brd,false);
      if(pseudo.some(m=>m.to===sq)) return true;
    }
  }
  return false;
}

function isInCheck(color){
  let kSq=null;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(board[r][c]?.type==='K' && board[r][c].color===color)
      kSq=idxToSq(r,c);
  return isSquareAttacked(kSq, opposite(color));
}

function hasLegalMoves(color){
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(board[r][c]?.color===color && generateLegalMoves(r,c).length>0)
      return true;
  return false;
}

function isCheckmate(color){ return isInCheck(color) && !hasLegalMoves(color); }
function isStalemate(color){ return !isInCheck(color) && !hasLegalMoves(color); }

/* ─── 6. MAKE / UNDO MOVE ───────────────────────────────────── */
function makeMove(fromSq, toSq, extra={}) {
  const [fr,fc]=sqToIdx(fromSq), [tr,tc]=sqToIdx(toSq);
  const piece    = board[fr][fc];
  const captured = board[tr][tc];

  const hist = {
    from:fromSq, to:toSq,
    piece:    {...piece},
    captured: captured ? {...captured} : null,
    extra,
    prevEP:        enPassantTarget,
    prevCastling:  JSON.parse(JSON.stringify(castling)),
    prevHalf:      halfmoveClock,
    prevFull:      fullmoveNumber
  };

  board[tr][tc]=piece; board[fr][fc]=null;
  if(piece.type==='P'||captured) halfmoveClock=0; else halfmoveClock++;

  enPassantTarget = (piece.type==='P' && Math.abs(tr-fr)===2)
    ? idxToSq((fr+tr)/2, fc) : null;

  if(extra.enPassant){ const epRow=piece.color==='w'?tr+1:tr-1; board[epRow][tc]=null; }
  if(extra.castling==='K'){ board[tr][5]=board[tr][7]; board[tr][7]=null; }
  if(extra.castling==='Q'){ board[tr][3]=board[tr][0]; board[tr][0]=null; }

  if(piece.type==='K'){ castling[piece.color].K=false; castling[piece.color].Q=false; }
  if(piece.type==='R'){
    if(fr===7&&fc===0) castling.w.Q=false;
    if(fr===7&&fc===7) castling.w.K=false;
    if(fr===0&&fc===0) castling.b.Q=false;
    if(fr===0&&fc===7) castling.b.K=false;
  }

  if(piece.type==='P'&&(tr===0||tr===7)){ board[tr][tc].type='Q'; hist.promoted=true; }

  turn = opposite(turn);
  if(turn==='w') fullmoveNumber++;
  moveHistory.push(hist);
  updateMoveList(hist);
  render();
}

function undoMove(){
  if(!moveHistory.length) return;
  const h = moveHistory.pop();
  const [fr,fc]=sqToIdx(h.from), [tr,tc]=sqToIdx(h.to);
  board[fr][fc] = h.piece;
  board[tr][tc] = h.captured;
  if(h.extra.enPassant){ const epRow=h.piece.color==='w'?tr+1:tr-1; board[epRow][tc]={type:'P',color:opposite(h.piece.color)}; }
  if(h.extra.castling==='K'){ board[fr][7]=board[fr][5]; board[fr][5]=null; }
  if(h.extra.castling==='Q'){ board[fr][0]=board[fr][3]; board[fr][3]=null; }
  if(h.promoted) board[fr][fc].type='P';
  castling        = JSON.parse(JSON.stringify(h.prevCastling));
  enPassantTarget = h.prevEP;
  halfmoveClock   = h.prevHalf;
  fullmoveNumber  = h.prevFull;
  turn = opposite(turn);
  document.getElementById('moveList').lastElementChild?.remove();
  render();
}

/* ─── 7. UI INTERACTION ─────────────────────────────────────── */
function onSquareClick(e) {
  const row = Number(e.currentTarget.dataset.row);
  const col = Number(e.currentTarget.dataset.col);
  const sq  = idxToSq(row, col);

  if(isCheckmate(turn)||isStalemate(turn)) return;

  if(selected) {
    if(legalMoves.includes(sq)) {
      const extra = {};
      const piece = board[selected.row][selected.col];
      const dc = col - selected.col;
      if(piece.type==='K'&&Math.abs(dc)===2) extra.castling=dc>0?'K':'Q';
      if(piece.type==='P'&&sq===enPassantTarget) extra.enPassant=true;
      makeMove(idxToSq(selected.row, selected.col), sq, extra);
      selected=null; legalMoves=[];
      if(aiEnabled && turn==='b') setTimeout(runAI, 200);
      return;
    }
    selected=null; legalMoves=[]; render(); return;
  }

  const piece = board[row][col];
  if(piece && piece.color===turn){
    selected   = {row, col};
    legalMoves = generateLegalMoves(row, col);
    render();
  }
}

function updateMoveList(hist) {
  const list = document.getElementById('moveList');
  const isWhite = hist.piece.color==='w';
  if(isWhite) {
    const li = document.createElement('li');
    li.style.cssText='padding:2px 4px;display:flex;gap:8px;';
    li.innerHTML=`<span style="opacity:.5">${fullmoveNumber-1}.</span><span>${fmtMove(hist)}</span><span id="black-slot-${fullmoveNumber-1}" style="opacity:.7"></span>`;
    list.appendChild(li);
  } else {
    const slot = document.getElementById(`black-slot-${fullmoveNumber-1}`);
    if(slot) slot.textContent = fmtMove(hist);
  }
  list.scrollTop = list.scrollHeight;
}

function fmtMove(h){
  if(h.extra.castling) return h.extra.castling==='K'?'O-O':'O-O-O';
  const p = h.piece.type==='P' ? '' : h.piece.type;
  return `${p}${h.captured||h.extra.enPassant?'x':''}${h.to}${h.promoted?'=Q':''}`;
}

/* ─── 8. AI (MINIMAX + ALPHA-BETA) ─────────────────────────── */
function evalBoard(){
  let s=0;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c];
    if(p) s += SCORE[p.type] * (p.color==='w'?1:-1);
  }
  return s;
}

function allMoves(color){
  const mv=[];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c];
    if(p&&p.color===color)
      generateLegalMoves(r,c).forEach(to=>mv.push({from:idxToSq(r,c),to,extra:{}}));
  }
  return mv;
}

function minimax(depth, alpha, beta, maximizing){
  if(depth===0) return {score:evalBoard()};
  const color=maximizing?'w':'b';
  const moves=allMoves(color);
  if(!moves.length) return {score: isInCheck(color)?(maximizing?-99999:99999):0};

  let best=null;
  for(const m of moves){
    const [fr,fc]=sqToIdx(m.from),[tr,tc]=sqToIdx(m.to);
    const mp=board[fr][fc], cap=board[tr][tc];
    board[tr][tc]=mp; board[fr][fc]=null;
    const {score}=minimax(depth-1,alpha,beta,!maximizing);
    board[fr][fc]=mp; board[tr][tc]=cap;
    if(maximizing){ if(score>alpha){alpha=score;best={...m,score};} }
    else          { if(score<beta) {beta=score; best={...m,score};} }
    if(beta<=alpha) break;
  }
  return best||{score:maximizing?-99999:99999};
}

function runAI(){
  const depth=AI_DEPTH[aiDifficulty];
  const best=minimax(depth,-Infinity,Infinity,turn==='w');
  if(best?.from) makeMove(best.from,best.to,best.extra||{});
}

/* ─── 9. CONTROLS WIRING ────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  initGame();
  render();
  applyTheme();

  document.getElementById('newGameBtn').addEventListener('click', ()=>{
    initGame();
    document.getElementById('moveList').innerHTML='';
    render();
  });

  document.getElementById('undoBtn').addEventListener('click', ()=>{
    undoMove();
    if(aiEnabled && moveHistory.length>0) undoMove(); // undo AI move too
  });

  document.getElementById('flipBtn').addEventListener('click', ()=>{
    flipped=!flipped; render();
  });

  document.getElementById('themeSwitch').addEventListener('change', applyTheme);
});

function applyTheme(){
  const dark = document.getElementById('themeSwitch').checked;
  document.body.style.background = dark
    ? 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)'
    : 'linear-gradient(135deg,#e8e0f0,#d4c5f9,#c9b8f0)';
  document.body.style.color = dark ? '#f0f0f0' : '#1a1a2e';
}
