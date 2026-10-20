// ======================================================
// CHESS AI - Master Engine
// Features: Full PSTs (all pieces + endgame king),
// Positional Evaluation (Rook on 7th, open files, bishop pair, passed pawns),
// MVV-LVA Move Ordering, Alpha-Beta Pruning & Quiescence Search
// ======================================================

class ChessAI {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty; // 'easy' | 'normal' | 'hard' | 'max'

    this.pieceValues = {
      p: 100,
      n: 320,
      b: 335,
      r: 500,
      q: 920,
      k: 20000
    };

    // Piece-Square Tables (White perspective: rank 0=opponent backrank, rank 7=own backrank)
    this.pstPawn = [
      [  0,   0,   0,   0,   0,   0,   0,   0],
      [ 50,  50,  50,  50,  50,  50,  50,  50],
      [ 10,  15,  25,  35,  35,  25,  15,  10],
      [  5,   5,  20,  30,  30,  20,   5,   5],
      [  0,   0,  10,  25,  25,  10,   0,   0],
      [  5,  -5, -10,   5,   5, -10,  -5,   5],
      [  5,  10,  10, -20, -20,  10,  10,   5],
      [  0,   0,   0,   0,   0,   0,   0,   0]
    ];

    this.pstKnight = [
      [-50, -40, -30, -30, -30, -30, -40, -50],
      [-40, -20,   0,   5,   5,   0, -20, -40],
      [-30,   5,  15,  20,  20,  15,   5, -30],
      [-30,   5,  20,  25,  25,  20,   5, -30],
      [-30,   5,  20,  25,  25,  20,   5, -30],
      [-30,   5,  15,  20,  20,  15,   5, -30],
      [-40, -20,   0,   5,   5,   0, -20, -40],
      [-50, -40, -30, -30, -30, -30, -40, -50]
    ];

    this.pstBishop = [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10,   5,   0,   0,   0,   0,   5, -10],
      [-10,  10,  10,  15,  15,  10,  10, -10],
      [-10,   5,  15,  20,  20,  15,   5, -10],
      [-10,   5,  15,  20,  20,  15,   5, -10],
      [-10,  10,  10,  15,  15,  10,  10, -10],
      [-10,   5,   0,   0,   0,   0,   5, -10],
      [-20, -10, -10, -10, -10, -10, -10, -20]
    ];

    this.pstRook = [
      [  0,   0,   5,  10,  10,   5,   0,   0],
      [ 35,  35,  35,  35,  35,  35,  35,  35], // 7th rank infiltration
      [ -5,   0,   0,   0,   0,   0,   0,  -5],
      [ -5,   0,   0,   0,   0,   0,   0,  -5],
      [ -5,   0,   0,   0,   0,   0,   0,  -5],
      [ -5,   0,   0,   0,   0,   0,   0,  -5],
      [  5,  10,  10,  10,  10,  10,  10,   5],
      [  0,   0,   5,  10,  10,   5,   0,   0]
    ];

    this.pstQueen = [
      [-20, -10, -10,  -5,  -5, -10, -10, -20],
      [-10,   0,   5,   0,   0,   0,   0, -10],
      [-10,   5,   5,   5,   5,   5,   0, -10],
      [  0,   0,   5,   5,   5,   5,   0,  -5],
      [ -5,   0,   5,   5,   5,   5,   0,  -5],
      [-10,   0,   5,   5,   5,   5,   0, -10],
      [-10,   0,   0,   0,   0,   0,   0, -10],
      [-20, -10, -10,  -5,  -5, -10, -10, -20]
    ];

    // Midgame King (seeks safety behind pawns)
    this.pstKingMid = [
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [ 20,  20,   0,   0,   0,   0,  20,  20],
      [ 20,  30,  10,   0,   0,  10,  30,  20]
    ];

    // Endgame King (active centralization)
    this.pstKingEnd = [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10,   0,  10,  10,  10,  10,   0, -10],
      [-10,  10,  20,  20,  20,  20,  10, -10],
      [-10,  10,  20,  30,  30,  20,  10, -10],
      [-10,  10,  20,  30,  30,  20,  10, -10],
      [-10,  10,  20,  20,  20,  20,  10, -10],
      [-10,   0,  10,  10,  10,  10,   0, -10],
      [-20, -10, -10, -10, -10, -10, -10, -20]
    ];

    // Opening book moves
    this.openingBook = {
      // White openings
      '': [{ fromR: 6, fromC: 4, toR: 4, toC: 4 }, { fromR: 6, fromC: 3, toR: 4, toC: 3 }, { fromR: 7, fromC: 6, toR: 5, toC: 5 }],
      // Black responses to 1.e4
      '6,4,4,4': [{ fromR: 1, fromC: 4, toR: 3, toC: 4 }, { fromR: 1, fromC: 2, toR: 3, toC: 2 }, { fromR: 0, fromC: 6, toR: 2, toC: 5 }],
      // Black responses to 1.d4
      '6,3,4,3': [{ fromR: 1, fromC: 3, toR: 3, toC: 3 }, { fromR: 0, fromC: 6, toR: 2, toC: 5 }]
    };
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  selectMove(engine, color) {
    const legalMoves = engine.getAllLegalMoves(color);
    if (legalMoves.length === 0) return null;

    // Check opening book
    if (engine.history.length <= 1) {
      const histKey = engine.history.map(h => `${h.fromR},${h.fromC},${h.toR},${h.toC}`).join(';');
      const bookList = this.openingBook[histKey];
      if (bookList && bookList.length > 0) {
        const choice = bookList[Math.floor(Math.random() * bookList.length)];
        const match = legalMoves.find(m => m.fromR === choice.fromR && m.fromC === choice.fromC && m.toR === choice.toR && m.toC === choice.toC);
        if (match) return match;
      }
    }

    if (this.difficulty === 'easy') {
      // 25% random, 75% capture prefer
      const captures = legalMoves.filter(m => engine.board[m.toR][m.toC] !== null);
      if (captures.length > 0 && Math.random() < 0.75) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    // Depths: Normal: 2 + QSearch, Hard: 3 + QSearch, Max: 4 + QSearch
    const depth = this.difficulty === 'normal' ? 2 : this.difficulty === 'hard' ? 3 : 4;
    return this.findBestMove(engine, color, depth);
  }

  findBestMove(engine, color, depth) {
    const legalMoves = engine.getAllLegalMoves(color);
    if (legalMoves.length === 0) return null;

    // Move ordering: MVV-LVA
    this.orderMoves(engine, legalMoves);

    let bestScore = -Infinity;
    let bestMove = legalMoves[0];
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of legalMoves) {
      engine.play(move.fromR, move.fromC, move.toR, move.toC);
      const score = -this.alphaBeta(engine, depth - 1, -beta, -alpha, engine.turn, color);
      engine.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
    }

    return bestMove;
  }

  alphaBeta(engine, depth, alpha, beta, currentTurn, aiColor) {
    if (engine.isGameOver) {
      if (engine.winner === null) return 0; // Stalemate
      return engine.winner === aiColor ? 50000 + depth : -50000 - depth;
    }

    if (depth <= 0) {
      // Transition to Quiescence Search to eliminate horizon effect
      return this.quiescence(engine, alpha, beta, currentTurn, aiColor, 4);
    }

    const legalMoves = engine.getAllLegalMoves(currentTurn);
    if (legalMoves.length === 0) {
      if (engine.isInCheck(currentTurn)) {
        return -50000 - depth; // Checkmate
      }
      return 0; // Stalemate
    }

    this.orderMoves(engine, legalMoves);

    for (const move of legalMoves) {
      engine.play(move.fromR, move.fromC, move.toR, move.toC);
      const score = -this.alphaBeta(engine, depth - 1, -beta, -alpha, engine.turn, aiColor);
      engine.undo();

      if (score >= beta) return beta;
      alpha = Math.max(alpha, score);
    }

    return alpha;
  }

  // Quiescence Search: capture-only evaluation to resolve tactical exchanges
  quiescence(engine, alpha, beta, currentTurn, aiColor, qDepth) {
    const standPat = this.evaluatePosition(engine, currentTurn);

    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;
    if (qDepth <= 0) return standPat;

    // Search only captures
    const allMoves = engine.getAllLegalMoves(currentTurn);
    const captures = allMoves.filter(m => engine.board[m.toR][m.toC] !== null);
    if (captures.length === 0) return standPat;

    this.orderMoves(engine, captures);

    for (const move of captures) {
      engine.play(move.fromR, move.fromC, move.toR, move.toC);
      const score = -this.quiescence(engine, -beta, -alpha, engine.turn, aiColor, qDepth - 1);
      engine.undo();

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }

    return alpha;
  }

  // MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
  orderMoves(engine, moves) {
    moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      const targetA = engine.board[a.toR][a.toC];
      const targetB = engine.board[b.toR][b.toC];

      if (targetA) {
        scoreA = (this.pieceValues[targetA.t] || 0) * 10 - (this.pieceValues[engine.board[a.fromR][a.fromC].t] || 0);
      }
      if (targetB) {
        scoreB = (this.pieceValues[targetB.t] || 0) * 10 - (this.pieceValues[engine.board[b.fromR][b.fromC].t] || 0);
      }

      // Promotions
      if (a.isPromotion) scoreA += 800;
      if (b.isPromotion) scoreB += 800;

      // Castling
      if (a.isCastling) scoreA += 50;
      if (b.isCastling) scoreB += 50;

      return scoreB - scoreA;
    });
  }

  // Positional & Material Evaluation
  evaluatePosition(engine, evalForColor) {
    let score = 0;
    const board = engine.board;

    // Check game phase (total non-pawn material)
    let nonPawnMaterial = 0;
    let whiteBishops = 0;
    let blackBishops = 0;
    const pawnCols = { w: new Set(), b: new Set() };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        if (piece.t !== 'p' && piece.t !== 'k') {
          nonPawnMaterial += this.pieceValues[piece.t] || 0;
        }
        if (piece.t === 'b') {
          if (piece.color === 'w') whiteBishops++;
          else blackBishops++;
        }
        if (piece.t === 'p') {
          pawnCols[piece.color].add(c);
        }
      }
    }

    // Endgame threshold: non-pawn material < 1400 (roughly a queen + rook, or minor pieces)
    const isEndgame = nonPawnMaterial < 1400;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        let val = this.pieceValues[piece.t] || 0;
        let pstVal = 0;

        const rankIdx = piece.color === 'w' ? r : 7 - r;

        if (piece.t === 'p') {
          pstVal = this.pstPawn[rankIdx][c];
          // Passed pawn bonus
          const isPassed = !pawnCols[engine.getOpponent(piece.color)].has(c);
          if (isPassed) {
            pstVal += (7 - rankIdx) * 15;
          }
        } else if (piece.t === 'n') {
          pstVal = this.pstKnight[rankIdx][c];
        } else if (piece.t === 'b') {
          pstVal = this.pstBishop[rankIdx][c];
        } else if (piece.t === 'r') {
          pstVal = this.pstRook[rankIdx][c];
          // Rook on open file bonus
          if (!pawnCols[piece.color].has(c)) {
            pstVal += 25; // Open / semi-open file
          }
        } else if (piece.t === 'q') {
          pstVal = this.pstQueen[rankIdx][c];
        } else if (piece.t === 'k') {
          pstVal = isEndgame ? this.pstKingEnd[rankIdx][c] : this.pstKingMid[rankIdx][c];
        }

        val += pstVal;

        if (piece.color === evalForColor) {
          score += val;
        } else {
          score -= val;
        }
      }
    }

    // Bishop pair bonus (+35)
    if (evalForColor === 'w') {
      if (whiteBishops >= 2) score += 35;
      if (blackBishops >= 2) score -= 35;
    } else {
      if (blackBishops >= 2) score += 35;
      if (whiteBishops >= 2) score -= 35;
    }

    return score;
  }
}

if (typeof window !== 'undefined') {
  window.ChessAI = ChessAI;
}
if (typeof module !== 'undefined') {
  module.exports = { ChessAI };
}
