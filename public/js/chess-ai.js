// ======================================================
// CHESS AI
// Piece-Square Tables + Minimax with Alpha-Beta Pruning
// ======================================================

class ChessAI {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty; // 'easy' | 'normal' | 'hard' | 'max'

    this.pieceValues = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 20000
    };

    // Piece-Square Tables (White perspective: row 0=opponent backrank, row 7=own backrank)
    this.pstPawn = [
      [ 0,  0,  0,  0,  0,  0,  0,  0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [ 5,  5, 10, 25, 25, 10,  5,  5],
      [ 0,  0,  0, 20, 20,  0,  0,  0],
      [ 5, -5,-10,  0,  0,-10, -5,  5],
      [ 5, 10, 10,-20,-20, 10, 10,  5],
      [ 0,  0,  0,  0,  0,  0,  0,  0]
    ];

    this.pstKnight = [
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,  0,  0,  0,  0,-20,-40],
      [-30,  0, 10, 15, 15, 10,  0,-30],
      [-30,  5, 15, 20, 20, 15,  5,-30],
      [-30,  0, 15, 20, 20, 15,  0,-30],
      [-30,  5, 10, 15, 15, 10,  5,-30],
      [-40,-20,  0,  5,  5,  0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50]
    ];

    this.pstBishop = [
      [-20,-10,-10,-10,-10,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5, 10, 10,  5,  0,-10],
      [-10,  5,  5, 10, 10,  5,  5,-10],
      [-10,  0, 10, 10, 10, 10,  0,-10],
      [-10, 10, 10, 10, 10, 10, 10,-10],
      [-10,  5,  0,  0,  0,  0,  5,-10],
      [-20,-10,-10,-10,-10,-10,-10,-20]
    ];

    this.pstKing = [
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [ 20,  20,   0,   0,   0,   0,  20,  20],
      [ 20,  30,  10,   0,   0,  10,  30,  20]
    ];
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  selectMove(engine, color) {
    const legalMoves = engine.getAllLegalMoves(color);
    if (legalMoves.length === 0) return null;

    if (this.difficulty === 'easy') {
      // 30% random, 70% capture prefer
      const captures = legalMoves.filter(m => engine.board[m.toR][m.toC] !== null);
      if (captures.length > 0 && Math.random() < 0.7) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    const depth = this.difficulty === 'normal' ? 2 : this.difficulty === 'hard' ? 3 : 4;
    return this.findBestMove(engine, color, depth);
  }

  findBestMove(engine, color, depth) {
    const legalMoves = engine.getAllLegalMoves(color);
    if (legalMoves.length === 0) return null;

    // Move ordering: evaluate captures first
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
    if (depth <= 0 || engine.isGameOver) {
      return this.evaluatePosition(engine, aiColor);
    }

    const legalMoves = engine.getAllLegalMoves(currentTurn);
    if (legalMoves.length === 0) {
      if (engine.isInCheck(currentTurn)) {
        return -50000 - depth; // Checkmate loss
      }
      return 0; // Stalemate draw
    }

    this.orderMoves(engine, legalMoves);

    for (const move of legalMoves) {
      engine.play(move.fromR, move.fromC, move.toR, move.toC);
      const score = -this.alphaBeta(engine, depth - 1, -beta, -alpha, engine.turn, aiColor);
      engine.undo();

      if (score >= beta) return beta; // Beta cut-off
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

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        let val = this.pieceValues[piece.t] || 0;
        let pstVal = 0;

        // Apply PST
        const rankIdx = piece.color === CHESS_WHITE ? r : 7 - r;
        if (piece.t === 'p') pstVal = this.pstPawn[rankIdx][c];
        else if (piece.t === 'n') pstVal = this.pstKnight[rankIdx][c];
        else if (piece.t === 'b') pstVal = this.pstBishop[rankIdx][c];
        else if (piece.t === 'k') pstVal = this.pstKing[rankIdx][c];

        val += pstVal;

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
  window.ChessAI = ChessAI;
}
if (typeof module !== 'undefined') {
  module.exports = { ChessAI };
}
