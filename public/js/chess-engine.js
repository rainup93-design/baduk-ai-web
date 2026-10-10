// ======================================================
// CHESS ENGINE
// Standard 8x8 Chess with Full Rules:
// Pawn double-step, en-passant, promotion, castling, check & checkmate
// ======================================================

var CHESS_WHITE = 'w';
var CHESS_BLACK = 'b';

class ChessEngine {
  constructor() {
    this.board = [];
    this.turn = CHESS_WHITE;
    this.history = [];
    this.isGameOver = false;
    this.winner = null;
    this.winReason = '';
    this.enPassantSquare = null; // { r, c }
    this.castling = {
      w: { k: true, q: true },
      b: { k: true, q: true }
    };
    this.reset();
  }

  reset() {
    // 8x8 Board setup
    // Pieces: p, r, n, b, q, k
    this.board = [
      [ {t:'r',color:'b'}, {t:'n',color:'b'}, {t:'b',color:'b'}, {t:'q',color:'b'}, {t:'k',color:'b'}, {t:'b',color:'b'}, {t:'n',color:'b'}, {t:'r',color:'b'} ],
      [ {t:'p',color:'b'}, {t:'p',color:'b'}, {t:'p',color:'b'}, {t:'p',color:'b'}, {t:'p',color:'b'}, {t:'p',color:'b'}, {t:'p',color:'b'}, {t:'p',color:'b'} ],
      [ null, null, null, null, null, null, null, null ],
      [ null, null, null, null, null, null, null, null ],
      [ null, null, null, null, null, null, null, null ],
      [ null, null, null, null, null, null, null, null ],
      [ {t:'p',color:'w'}, {t:'p',color:'w'}, {t:'p',color:'w'}, {t:'p',color:'w'}, {t:'p',color:'w'}, {t:'p',color:'w'}, {t:'p',color:'w'}, {t:'p',color:'w'} ],
      [ {t:'r',color:'w'}, {t:'n',color:'w'}, {t:'b',color:'w'}, {t:'q',color:'w'}, {t:'k',color:'w'}, {t:'b',color:'w'}, {t:'n',color:'w'}, {t:'r',color:'w'} ]
    ];
    this.turn = CHESS_WHITE;
    this.history = [];
    this.isGameOver = false;
    this.winner = null;
    this.winReason = '';
    this.enPassantSquare = null;
    this.castling = {
      w: { k: true, q: true },
      b: { k: true, q: true }
    };
  }

  cloneBoard() {
    return this.board.map(row => row.map(cell => cell ? { ...cell } : null));
  }

  getOpponent(color) {
    return color === CHESS_WHITE ? CHESS_BLACK : CHESS_WHITE;
  }

  // Get raw pseudo-legal moves for a piece (without check validation)
  getPseudoMoves(fromR, fromC) {
    const piece = this.board[fromR][fromC];
    if (!piece) return [];
    const moves = [];
    const color = piece.color;
    const opp = this.getOpponent(color);
    const forward = color === CHESS_WHITE ? -1 : 1;

    switch (piece.t) {
      case 'p': { // Pawn
        // 1 step forward
        const nr = fromR + forward;
        if (nr >= 0 && nr < 8 && !this.board[nr][fromC]) {
          moves.push({ toR: nr, toC: fromC });
          // 2 steps forward from initial rank
          const startRank = color === CHESS_WHITE ? 6 : 1;
          const nnr = fromR + forward * 2;
          if (fromR === startRank && !this.board[nnr][fromC]) {
            moves.push({ toR: nnr, toC: fromC, isDoubleStep: true });
          }
        }
        // Diagonal captures
        for (const dc of [-1, 1]) {
          const nc = fromC + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = this.board[nr][nc];
            if (target && target.color === opp) {
              moves.push({ toR: nr, toC: nc });
            } else if (this.enPassantSquare && this.enPassantSquare.r === nr && this.enPassantSquare.c === nc) {
              moves.push({ toR: nr, toC: nc, isEnPassant: true });
            }
          }
        }
        break;
      }
      case 'n': { // Knight
        const offsets = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of offsets) {
          const nr = fromR + dr;
          const nc = fromC + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = this.board[nr][nc];
            if (!target || target.color === opp) {
              moves.push({ toR: nr, toC: nc });
            }
          }
        }
        break;
      }
      case 'b': // Bishop
        this.addRayMoves(moves, fromR, fromC, [[-1, -1], [-1, 1], [1, -1], [1, 1]], opp);
        break;
      case 'r': // Rook
        this.addRayMoves(moves, fromR, fromC, [[-1, 0], [1, 0], [0, -1], [0, 1]], opp);
        break;
      case 'q': // Queen
        this.addRayMoves(moves, fromR, fromC, [
          [-1, -1], [-1, 1], [1, -1], [1, 1],
          [-1, 0], [1, 0], [0, -1], [0, 1]
        ], opp);
        break;
      case 'k': { // King
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = fromR + dr;
            const nc = fromC + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              const target = this.board[nr][nc];
              if (!target || target.color === opp) {
                moves.push({ toR: nr, toC: nc });
              }
            }
          }
        }
        // Castling
        const rank = color === CHESS_WHITE ? 7 : 0;
        if (fromR === rank && fromC === 4 && !this.isInCheck(color)) {
          // Kingside (O-O)
          if (this.castling[color].k &&
              !this.board[rank][5] && !this.board[rank][6] &&
              this.board[rank][7] && this.board[rank][7].t === 'r' &&
              !this.isSquareAttacked(rank, 5, opp) && !this.isSquareAttacked(rank, 6, opp)) {
            moves.push({ toR: rank, toC: 6, isCastling: 'k' });
          }
          // Queenside (O-O-O)
          if (this.castling[color].q &&
              !this.board[rank][3] && !this.board[rank][2] && !this.board[rank][1] &&
              this.board[rank][0] && this.board[rank][0].t === 'r' &&
              !this.isSquareAttacked(rank, 3, opp) && !this.isSquareAttacked(rank, 2, opp)) {
            moves.push({ toR: rank, toC: 2, isCastling: 'q' });
          }
        }
        break;
      }
    }

    return moves;
  }

  addRayMoves(moves, fromR, fromC, dirs, opp) {
    for (const [dr, dc] of dirs) {
      let nr = fromR + dr;
      let nc = fromC + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = this.board[nr][nc];
        if (!target) {
          moves.push({ toR: nr, toC: nc });
        } else {
          if (target.color === opp) {
            moves.push({ toR: nr, toC: nc });
          }
          break; // Blocked
        }
        nr += dr;
        nc += dc;
      }
    }
  }

  isSquareAttacked(r, c, attackerColor) {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === attackerColor) {
          if (piece.t === 'p') {
            const forward = attackerColor === CHESS_WHITE ? -1 : 1;
            if (row + forward === r && (col - 1 === c || col + 1 === c)) return true;
          } else if (piece.t === 'k') {
            if (Math.abs(row - r) <= 1 && Math.abs(col - c) <= 1) return true;
          } else {
            const moves = this.getPseudoMoves(row, col);
            if (moves.some(m => m.toR === r && m.toC === c)) return true;
          }
        }
      }
    }
    return false;
  }

  findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.t === 'k' && piece.color === color) {
          return { r, c };
        }
      }
    }
    return null;
  }

  isInCheck(color) {
    const kingPos = this.findKing(color);
    if (!kingPos) return false;
    return this.isSquareAttacked(kingPos.r, kingPos.c, this.getOpponent(color));
  }

  // Get truly legal moves (that do not leave king in check)
  getLegalMoves(fromR, fromC) {
    const piece = this.board[fromR][fromC];
    if (!piece || piece.color !== this.turn || this.isGameOver) return [];

    const pseudoMoves = this.getPseudoMoves(fromR, fromC);
    const legalMoves = [];

    for (const move of pseudoMoves) {
      // Simulate move
      const undoState = this.makeMoveSim(fromR, fromC, move);
      if (!this.isInCheck(piece.color)) {
        legalMoves.push(move);
      }
      this.undoMoveSim(fromR, fromC, move, undoState);
    }

    return legalMoves;
  }

  getAllLegalMoves(color = this.turn) {
    const all = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color === color) {
          const pseudo = this.getPseudoMoves(r, c);
          for (const m of pseudo) {
            const undoState = this.makeMoveSim(r, c, m);
            if (!this.isInCheck(color)) {
              all.push({ fromR: r, fromC: c, ...m });
            }
            this.undoMoveSim(r, c, m, undoState);
          }
        }
      }
    }
    return all;
  }

  makeMoveSim(fromR, fromC, move) {
    const piece = this.board[fromR][fromC];
    const captured = this.board[move.toR][move.toC];
    let epCaptured = null;

    if (move.isEnPassant) {
      const epRow = fromR;
      epCaptured = this.board[epRow][move.toC];
      this.board[epRow][move.toC] = null;
    }

    this.board[move.toR][move.toC] = piece;
    this.board[fromR][fromC] = null;

    if (move.isCastling === 'k') {
      const rook = this.board[move.toR][7];
      this.board[move.toR][5] = rook;
      this.board[move.toR][7] = null;
    } else if (move.isCastling === 'q') {
      const rook = this.board[move.toR][0];
      this.board[move.toR][3] = rook;
      this.board[move.toR][0] = null;
    }

    return { captured, epCaptured };
  }

  undoMoveSim(fromR, fromC, move, undoState) {
    const piece = this.board[move.toR][move.toC];
    this.board[fromR][fromC] = piece;
    this.board[move.toR][move.toC] = undoState.captured;

    if (move.isEnPassant) {
      this.board[fromR][move.toC] = undoState.epCaptured;
    }

    if (move.isCastling === 'k') {
      const rook = this.board[move.toR][5];
      this.board[move.toR][7] = rook;
      this.board[move.toR][5] = null;
    } else if (move.isCastling === 'q') {
      const rook = this.board[move.toR][3];
      this.board[move.toR][0] = rook;
      this.board[move.toR][3] = null;
    }
  }

  // Play real move
  play(fromR, fromC, toR, toC, promotion = 'q') {
    const legalMoves = this.getLegalMoves(fromR, fromC);
    const move = legalMoves.find(m => m.toR === toR && m.toC === toC);
    if (!move) return false;

    const piece = this.board[fromR][fromC];
    const captured = this.board[toR][toC];

    // Snapshot for history
    const historyEntry = {
      fromR, fromC, toR, toC,
      piece: { ...piece },
      captured: captured ? { ...captured } : null,
      moveData: { ...move },
      prevCastling: JSON.parse(JSON.stringify(this.castling)),
      prevEnPassant: this.enPassantSquare ? { ...this.enPassantSquare } : null
    };

    // En passant handling
    if (move.isEnPassant) {
      historyEntry.epCaptured = { ...this.board[fromR][toC] };
      this.board[fromR][toC] = null;
    }

    // Move piece
    this.board[toR][toC] = piece;
    this.board[fromR][fromC] = null;

    // Promotion
    if (piece.t === 'p' && (toR === 0 || toR === 7)) {
      this.board[toR][toC] = { t: promotion, color: piece.color };
    }

    // Castling rook move
    if (move.isCastling === 'k') {
      this.board[toR][5] = this.board[toR][7];
      this.board[toR][7] = null;
    } else if (move.isCastling === 'q') {
      this.board[toR][3] = this.board[toR][0];
      this.board[toR][0] = null;
    }

    // Update castling rights
    if (piece.t === 'k') {
      this.castling[piece.color].k = false;
      this.castling[piece.color].q = false;
    } else if (piece.t === 'r') {
      if (fromR === 7 && fromC === 7) this.castling.w.k = false;
      if (fromR === 7 && fromC === 0) this.castling.w.q = false;
      if (fromR === 0 && fromC === 7) this.castling.b.k = false;
      if (fromR === 0 && fromC === 0) this.castling.b.q = false;
    }

    // Update en passant square
    if (move.isDoubleStep) {
      const forward = piece.color === CHESS_WHITE ? -1 : 1;
      this.enPassantSquare = { r: fromR + forward, c: fromC };
    } else {
      this.enPassantSquare = null;
    }

    this.history.push(historyEntry);

    // Switch turn
    this.turn = this.getOpponent(this.turn);

    // Check game over
    const nextMoves = this.getAllLegalMoves(this.turn);
    if (nextMoves.length === 0) {
      this.isGameOver = true;
      if (this.isInCheck(this.turn)) {
        this.winner = this.getOpponent(this.turn);
        this.winReason = 'checkmate';
      } else {
        this.winner = 'draw';
        this.winReason = 'stalemate';
      }
    }

    return true;
  }

  undo() {
    if (this.history.length === 0) return false;
    const entry = this.history.pop();

    this.board[entry.fromR][entry.fromC] = entry.piece;
    this.board[entry.toR][entry.toC] = entry.captured;

    if (entry.moveData.isEnPassant) {
      this.board[entry.fromR][entry.toC] = entry.epCaptured;
    }

    if (entry.moveData.isCastling === 'k') {
      this.board[entry.toR][7] = this.board[entry.toR][5];
      this.board[entry.toR][5] = null;
    } else if (entry.moveData.isCastling === 'q') {
      this.board[entry.toR][0] = this.board[entry.toR][3];
      this.board[entry.toR][3] = null;
    }

    this.castling = entry.prevCastling;
    this.enPassantSquare = entry.prevEnPassant;
    this.turn = entry.piece.color;
    this.isGameOver = false;
    this.winner = null;
    this.winReason = '';

    return true;
  }
}

if (typeof window !== 'undefined') {
  window.ChessEngine = ChessEngine;
}
if (typeof module !== 'undefined') {
  module.exports = { ChessEngine, CHESS_WHITE, CHESS_BLACK };
}
