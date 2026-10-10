// ======================================================
// JANGGI AI
// Material & Position Evaluation + Minimax Alpha-Beta
// ======================================================

class JanggiAI {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty; // 'easy' | 'normal' | 'hard' | 'max'

    this.pieceValues = {
      k: 10000,
      r: 130,
      c: 70,
      h: 50,
      e: 30,
      g: 30,
      s: 20
    };
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  selectMove(engine, color) {
    const legalMoves = engine.getAllLegalMoves(color);
    if (legalMoves.length === 0) return null;

    if (this.difficulty === 'easy') {
      const captures = legalMoves.filter(m => engine.board[m.toR][m.toC] !== null);
      if (captures.length > 0 && Math.random() < 0.7) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    const depth = this.difficulty === 'normal' ? 2 : this.difficulty === 'hard' ? 3 : 3;
    return this.findBestMove(engine, color, depth);
  }

  findBestMove(engine, color, depth) {
    const legalMoves = engine.getAllLegalMoves(color);
    if (legalMoves.length === 0) return null;

    // Check immediate king capture
    const kingCapture = legalMoves.find(m => {
      const target = engine.board[m.toR][m.toC];
      return target && target.t === 'k';
    });
    if (kingCapture) return kingCapture;

    this.orderMoves(engine, legalMoves);

    let bestScore = -Infinity;
    let bestMove = legalMoves[0];
    let alpha = -Infinity;
    const beta = Infinity;

    // Explore top moves
    const topMoves = this.difficulty === 'max' ? legalMoves.slice(0, 15) : legalMoves;

    for (const move of topMoves) {
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
    if (depth <= 0 || engine.isGameOver) {
      return this.evaluatePosition(engine, aiColor);
    }

    const legalMoves = engine.getAllLegalMoves(currentTurn);
    if (legalMoves.length === 0) {
      return -5000;
    }

    // Check king capture
    for (const m of legalMoves) {
      const target = engine.board[m.toR][m.toC];
      if (target && target.t === 'k') {
        return currentTurn === aiColor ? 10000 : -10000;
      }
    }

    this.orderMoves(engine, legalMoves);
    const movesToSearch = legalMoves.slice(0, 10);

    for (const move of movesToSearch) {
      engine.play(move.fromR, move.fromC, move.toR, move.toC);
      const score = -this.alphaBeta(engine, depth - 1, -beta, -alpha, engine.turn, aiColor);
      engine.undo();

      if (score >= beta) return beta;
      alpha = Math.max(alpha, score);
    }

    return alpha;
  }

  orderMoves(engine, moves) {
    moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      const targetA = engine.board[a.toR][a.toC];
      const targetB = engine.board[b.toR][b.toC];

      if (targetA) scoreA = this.pieceValues[targetA.t] * 10 - this.pieceValues[engine.board[a.fromR][a.fromC].t];
      if (targetB) scoreB = this.pieceValues[targetB.t] * 10 - this.pieceValues[engine.board[b.fromR][b.fromC].t];

      return scoreB - scoreA;
    });
  }

  evaluatePosition(engine, aiColor) {
    let score = 0;
    const board = engine.board;

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        let val = this.pieceValues[piece.t] || 0;

        // Position bonus: Soldiers advanced
        if (piece.t === 's') {
          const advance = piece.color === JANGGI_HAN ? r : 9 - r;
          val += advance * 3;
        }

        if (piece.color === aiColor) {
          score += val;
        } else {
          score -= val;
        }
      }
    }

    return score;
  }
}

if (typeof window !== 'undefined') {
  window.JanggiAI = JanggiAI;
}
if (typeof module !== 'undefined') {
  module.exports = { JanggiAI };
}
