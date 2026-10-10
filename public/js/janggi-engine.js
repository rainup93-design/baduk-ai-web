// ======================================================
// JANGGI (Korean Chess) Engine
// 10x9 Board, Traditional Korean Rules
// Pieces: 궁(k), 사(g), 차(r), 포(c), 마(h), 상(e), 졸/병(s)
// Sides: 초(cho, blue), 한(han, red)
// ======================================================

var JANGGI_CHO = 'cho'; // Blue (Player default)
var JANGGI_HAN = 'han'; // Red (AI default)

class JanggiEngine {
  constructor() {
    this.board = [];
    this.turn = JANGGI_CHO;
    this.history = [];
    this.isGameOver = false;
    this.winner = null;
    this.winReason = '';
    this.reset();
  }

  reset() {
    // 10 rows x 9 cols
    this.board = Array(10).fill(null).map(() => Array(9).fill(null));

    // Han (Red) setup - top
    this.board[0][0] = { t: 'r', color: JANGGI_HAN }; // 차
    this.board[0][1] = { t: 'h', color: JANGGI_HAN }; // 마
    this.board[0][2] = { t: 'e', color: JANGGI_HAN }; // 상
    this.board[0][3] = { t: 'g', color: JANGGI_HAN }; // 사
    this.board[1][4] = { t: 'k', color: JANGGI_HAN }; // 궁 (한)
    this.board[0][5] = { t: 'g', color: JANGGI_HAN }; // 사
    this.board[0][6] = { t: 'e', color: JANGGI_HAN }; // 상
    this.board[0][7] = { t: 'h', color: JANGGI_HAN }; // 마
    this.board[0][8] = { t: 'r', color: JANGGI_HAN }; // 차

    this.board[2][1] = { t: 'c', color: JANGGI_HAN }; // 포
    this.board[2][7] = { t: 'c', color: JANGGI_HAN }; // 포

    this.board[3][0] = { t: 's', color: JANGGI_HAN }; // 병
    this.board[3][2] = { t: 's', color: JANGGI_HAN };
    this.board[3][4] = { t: 's', color: JANGGI_HAN };
    this.board[3][6] = { t: 's', color: JANGGI_HAN };
    this.board[3][8] = { t: 's', color: JANGGI_HAN };

    // Cho (Blue) setup - bottom
    this.board[9][0] = { t: 'r', color: JANGGI_CHO }; // 차
    this.board[9][1] = { t: 'h', color: JANGGI_CHO }; // 마
    this.board[9][2] = { t: 'e', color: JANGGI_CHO }; // 상
    this.board[9][3] = { t: 'g', color: JANGGI_CHO }; // 사
    this.board[8][4] = { t: 'k', color: JANGGI_CHO }; // 궁 (초)
    this.board[9][5] = { t: 'g', color: JANGGI_CHO }; // 사
    this.board[9][6] = { t: 'e', color: JANGGI_CHO }; // 상
    this.board[9][7] = { t: 'h', color: JANGGI_CHO }; // 마
    this.board[9][8] = { t: 'r', color: JANGGI_CHO }; // 차

    this.board[7][1] = { t: 'c', color: JANGGI_CHO }; // 포
    this.board[7][7] = { t: 'c', color: JANGGI_CHO }; // 포

    this.board[6][0] = { t: 's', color: JANGGI_CHO }; // 졸
    this.board[6][2] = { t: 's', color: JANGGI_CHO };
    this.board[6][4] = { t: 's', color: JANGGI_CHO };
    this.board[6][6] = { t: 's', color: JANGGI_CHO };
    this.board[6][8] = { t: 's', color: JANGGI_CHO };

    this.turn = JANGGI_CHO;
    this.history = [];
    this.isGameOver = false;
    this.winner = null;
    this.winReason = '';
  }

  getOpponent(color) {
    return color === JANGGI_CHO ? JANGGI_HAN : JANGGI_CHO;
  }

  isPalace(r, c, color) {
    if (c < 3 || c > 5) return false;
    if (color === JANGGI_HAN) return r >= 0 && r <= 2;
    if (color === JANGGI_CHO) return r >= 7 && r <= 9;
    return (r >= 0 && r <= 2) || (r >= 7 && r <= 9);
  }

  isPalaceCenter(r, c) {
    return (r === 1 && c === 4) || (r === 8 && c === 4);
  }

  // Palace diagonal diagonals check
  canUsePalaceDiagonal(fromR, fromC, toR, toC) {
    const palace = (fromR >= 0 && fromR <= 2 && toR >= 0 && toR <= 2) ||
                   (fromR >= 7 && fromR <= 9 && toR >= 7 && toR <= 9);
    if (!palace) return false;
    if (fromC < 3 || fromC > 5 || toC < 3 || toC > 5) return false;

    // Movement must follow X lines
    const isCorner = (r, c) => (r === 0 || r === 2 || r === 7 || r === 9) && (c === 3 || c === 5);
    const isCenter = (r, c) => (r === 1 || r === 8) && c === 4;

    if (isCenter(fromR, fromC) && isCorner(toR, toC)) return true;
    if (isCorner(fromR, fromC) && isCenter(toR, toC)) return true;
    if (isCorner(fromR, fromC) && isCorner(toR, toC) && Math.abs(fromR - toR) === 2 && Math.abs(fromC - toC) === 2) {
      return true; // 2 steps across center
    }
    return false;
  }

  getPseudoMoves(fromR, fromC) {
    const piece = this.board[fromR][fromC];
    if (!piece) return [];
    const moves = [];
    const color = piece.color;
    const opp = this.getOpponent(color);

    switch (piece.t) {
      case 'k': // 궁 (King)
      case 'g': { // 사 (Guard)
        // Must stay inside own palace
        const palaceRows = color === JANGGI_HAN ? [0, 1, 2] : [7, 8, 9];
        // 4 orthogonal
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = fromR + dr;
          const nc = fromC + dc;
          if (palaceRows.includes(nr) && nc >= 3 && nc <= 5) {
            const target = this.board[nr][nc];
            if (!target || target.color === opp) moves.push({ toR: nr, toC: nc });
          }
        }
        // Diagonals inside palace
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          const nr = fromR + dr;
          const nc = fromC + dc;
          if (this.canUsePalaceDiagonal(fromR, fromC, nr, nc)) {
            const target = this.board[nr][nc];
            if (!target || target.color === opp) moves.push({ toR: nr, toC: nc });
          }
        }
        break;
      }
      case 's': { // 졸/병 (Soldier)
        // Moves forward or sideways (Han moves down +1, Cho moves up -1)
        const forward = color === JANGGI_HAN ? 1 : -1;
        // Forward
        const nr = fromR + forward;
        if (nr >= 0 && nr < 10) {
          const target = this.board[nr][fromC];
          if (!target || target.color === opp) moves.push({ toR: nr, toC: fromC });
        }
        // Sideways
        for (const dc of [-1, 1]) {
          const nc = fromC + dc;
          if (nc >= 0 && nc < 9) {
            const target = this.board[fromR][nc];
            if (!target || target.color === opp) moves.push({ toR: fromR, toC: nc });
          }
        }
        // Diagonal forward in opponent palace
        const oppPalaceRows = color === JANGGI_HAN ? [7, 8, 9] : [0, 1, 2];
        if (oppPalaceRows.includes(fromR) && fromC >= 3 && fromC <= 5) {
          for (const dc of [-1, 1]) {
            const dr = forward;
            const targetR = fromR + dr;
            const targetC = fromC + dc;
            if (this.canUsePalaceDiagonal(fromR, fromC, targetR, targetC)) {
              const target = this.board[targetR][targetC];
              if (!target || target.color === opp) moves.push({ toR: targetR, toC: targetC });
            }
          }
        }
        break;
      }
      case 'r': { // 차 (Chariot)
        // Orthogonal rays
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          let nr = fromR + dr;
          let nc = fromC + dc;
          while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
            const target = this.board[nr][nc];
            if (!target) {
              moves.push({ toR: nr, toC: nc });
            } else {
              if (target.color === opp) moves.push({ toR: nr, toC: nc });
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
        // Palace diagonals
        if (this.isPalace(fromR, fromC)) {
          for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
            const nr = fromR + dr;
            const nc = fromC + dc;
            if (this.canUsePalaceDiagonal(fromR, fromC, nr, nc)) {
              const target = this.board[nr][nc];
              if (!target) {
                moves.push({ toR: nr, toC: nc });
                // Check 2 steps
                const nnr = nr + dr;
                const nnc = nc + dc;
                if (this.canUsePalaceDiagonal(nr, nc, nnr, nnc)) {
                  const target2 = this.board[nnr][nnc];
                  if (!target2 || target2.color === opp) moves.push({ toR: nnr, toC: nnc });
                }
              } else {
                if (target.color === opp) moves.push({ toR: nr, toC: nc });
              }
            }
          }
        }
        break;
      }
      case 'c': { // 포 (Cannon)
        // Must jump over exactly one piece (cannot jump or capture another cannon!)
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          let nr = fromR + dr;
          let nc = fromC + dc;
          let jumped = false;
          while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9) {
            const target = this.board[nr][nc];
            if (!jumped) {
              if (target) {
                if (target.t === 'c') break; // Cannot jump over another cannon!
                jumped = true; // Screen piece found
              }
            } else {
              // Can land or capture
              if (!target) {
                moves.push({ toR: nr, toC: nc });
              } else {
                if (target.t !== 'c' && target.color === opp) {
                  moves.push({ toR: nr, toC: nc }); // Capture
                }
                break;
              }
            }
            nr += dr;
            nc += dc;
          }
        }
        // Palace diagonals for Cannon
        if (this.isPalace(fromR, fromC)) {
          for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
            const midR = fromR + dr;
            const midC = fromC + dc;
            const endR = fromR + dr * 2;
            const endC = fromC + dc * 2;
            if (this.canUsePalaceDiagonal(fromR, fromC, midR, midC) && this.canUsePalaceDiagonal(midR, midC, endR, endC)) {
              const mid = this.board[midR][midC];
              const end = this.board[endR][endC];
              if (mid && mid.t !== 'c') { // Can jump
                if (!end || (end.t !== 'c' && end.color === opp)) {
                  moves.push({ toR: endR, toC: endC });
                }
              }
            }
          }
        }
        break;
      }
      case 'h': { // 마 (Horse)
        // 1 step orthogonal, then 1 step diagonal
        // Block check on first orthogonal step (멱)
        const horseMoves = [
          { dr1: -1, dc1: 0, dr2: -2, dc2: -1 },
          { dr1: -1, dc1: 0, dr2: -2, dc2: 1 },
          { dr1: 1, dc1: 0, dr2: 2, dc2: -1 },
          { dr1: 1, dc1: 0, dr2: 2, dc2: 1 },
          { dr1: 0, dc1: -1, dr2: -1, dc2: -2 },
          { dr1: 0, dc1: -1, dr2: 1, dc2: -2 },
          { dr1: 0, dc1: 1, dr2: -1, dc2: 2 },
          { dr1: 0, dc1: 1, dr2: 1, dc2: 2 }
        ];

        for (const hm of horseMoves) {
          const blockR = fromR + hm.dr1;
          const blockC = fromC + hm.dc1;
          if (blockR >= 0 && blockR < 10 && blockC >= 0 && blockC < 9 && !this.board[blockR][blockC]) {
            const destR = fromR + hm.dr2;
            const destC = fromC + hm.dc2;
            if (destR >= 0 && destR < 10 && destC >= 0 && destC < 9) {
              const target = this.board[destR][destC];
              if (!target || target.color === opp) {
                moves.push({ toR: destR, toC: destC });
              }
            }
          }
        }
        break;
      }
      case 'e': { // 상 (Elephant)
        // 1 step orthogonal, then 2 steps diagonal
        // 2 block checks (멱)
        const elephantMoves = [
          { dr1: -1, dc1: 0, dr2: -2, dc2: -1, dr3: -3, dc3: -2 },
          { dr1: -1, dc1: 0, dr2: -2, dc2: 1, dr3: -3, dc3: 2 },
          { dr1: 1, dc1: 0, dr2: 2, dc2: -1, dr3: 3, dc3: -2 },
          { dr1: 1, dc1: 0, dr2: 2, dc2: 1, dr3: 3, dc3: 2 },
          { dr1: 0, dc1: -1, dr2: -1, dc2: -2, dr3: -2, dc3: -3 },
          { dr1: 0, dc1: -1, dr2: 1, dc2: -2, dr3: 2, dc3: -3 },
          { dr1: 0, dc1: 1, dr2: -1, dc2: 2, dr3: -2, dc3: 3 },
          { dr1: 0, dc1: 1, dr2: 1, dc2: 2, dr3: 2, dc3: 3 }
        ];

        for (const em of elephantMoves) {
          const b1R = fromR + em.dr1;
          const b1C = fromC + em.dc1;
          const b2R = fromR + em.dr2;
          const b2C = fromC + em.dc2;
          const destR = fromR + em.dr3;
          const destC = fromC + em.dc3;

          if (b1R >= 0 && b1R < 10 && b1C >= 0 && b1C < 9 && !this.board[b1R][b1C] &&
              b2R >= 0 && b2R < 10 && b2C >= 0 && b2C < 9 && !this.board[b2R][b2C] &&
              destR >= 0 && destR < 10 && destC >= 0 && destC < 9) {
            const target = this.board[destR][destC];
            if (!target || target.color === opp) {
              moves.push({ toR: destR, toC: destC });
            }
          }
        }
        break;
      }
    }

    return moves;
  }

  findKing(color) {
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = this.board[r][c];
        if (piece && piece.t === 'k' && piece.color === color) {
          return { r, c };
        }
      }
    }
    return null;
  }

  isKingCaptured(color) {
    return this.findKing(color) === null;
  }

  getLegalMoves(fromR, fromC) {
    const piece = this.board[fromR][fromC];
    if (!piece || piece.color !== this.turn || this.isGameOver) return [];
    return this.getPseudoMoves(fromR, fromC);
  }

  getAllLegalMoves(color = this.turn) {
    const moves = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color === color) {
          const pMoves = this.getPseudoMoves(r, c);
          for (const m of pMoves) {
            moves.push({ fromR: r, fromC: c, ...m });
          }
        }
      }
    }
    return moves;
  }

  play(fromR, fromC, toR, toC) {
    const piece = this.board[fromR][fromC];
    if (!piece || piece.color !== this.turn) return false;

    const legal = this.getLegalMoves(fromR, fromC);
    if (!legal.some(m => m.toR === toR && m.toC === toC)) return false;

    const captured = this.board[toR][toC];

    this.history.push({
      fromR, fromC, toR, toC,
      piece: { ...piece },
      captured: captured ? { ...captured } : null
    });

    this.board[toR][toC] = piece;
    this.board[fromR][fromC] = null;

    // Check if King was captured
    if (captured && captured.t === 'k') {
      this.isGameOver = true;
      this.winner = piece.color;
      this.winReason = 'king_captured';
      return true;
    }

    this.turn = this.getOpponent(this.turn);
    return true;
  }

  undo() {
    if (this.history.length === 0) return false;
    const entry = this.history.pop();

    this.board[entry.fromR][entry.fromC] = entry.piece;
    this.board[entry.toR][entry.toC] = entry.captured;
    this.turn = entry.piece.color;
    this.isGameOver = false;
    this.winner = null;
    this.winReason = '';

    return true;
  }
}

if (typeof window !== 'undefined') {
  window.JanggiEngine = JanggiEngine;
}
if (typeof module !== 'undefined') {
  module.exports = { JanggiEngine, JANGGI_CHO, JANGGI_HAN };
}
