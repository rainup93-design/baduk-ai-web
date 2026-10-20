// ======================================================
// JANGGI (Korean Chess) AI - Master Engine
// Features: Traditional Piece Values, Positional Evaluation
// (Cha open files & infiltration, Po palace placement, Ma central mobility,
// Connected Jol/Byeong, Palace defense), MVV-LVA Ordering & Quiescence Search
// ======================================================

class JanggiAI {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty; // 'easy' | 'normal' | 'hard' | 'max'

    // Standard Korean Janggi piece points (scaled x10)
    this.pieceValues = {
      k: 10000, // 궁
      r: 130,   // 차 (13점)
      c: 70,    // 포 (7점)
      h: 50,    // 마 (5점)
      e: 30,    // 상 (3점)
      g: 30,    // 사 (3점)
      s: 20     // 졸/병 (2점)
    };

    // Ma position evaluation (favor center, penalize edge)
    this.pstMa = [
      [-10, -5,   0,   5,   5,   0,  -5, -10],
      [ -5,  5,  10,  15,  15,  10,   5,  -5],
      [  0, 10,  20,  25,  25,  20,  10,   0],
      [  5, 15,  25,  30,  30,  25,  15,   5],
      [  5, 15,  25,  30,  30,  25,  15,   5],
      [  5, 15,  25,  30,  30,  25,  15,   5],
      [  5, 15,  25,  30,  30,  25,  15,   5],
      [  0, 10,  20,  25,  25,  20,  10,   0],
      [ -5,  5,  10,  15,  15,  10,   5,  -5],
      [-10, -5,   0,   5,   5,   0,  -5, -10]
    ];
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  selectMove(engine, color) {
    const legalMoves = engine.getAllLegalMoves(color);
    if (legalMoves.length === 0) return null;

    // Check immediate King capture (winning move)
    const kingWin = legalMoves.find(m => {
      const target = engine.board[m.toR][m.toC];
      return target && target.t === 'k';
    });
    if (kingWin) return kingWin;

    if (this.difficulty === 'easy') {
      // 25% random, 75% capture priority
      const captures = legalMoves.filter(m => engine.board[m.toR][m.toC] !== null);
      if (captures.length > 0 && Math.random() < 0.75) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    // Depths: normal=2 + QSearch, hard=3 + QSearch, max=4 + QSearch
    const depth = this.difficulty === 'normal' ? 2 : this.difficulty === 'hard' ? 3 : 4;
    return this.findBestMove(engine, color, depth);
  }

  findBestMove(engine, color, depth) {
    const legalMoves = engine.getAllLegalMoves(color);
    if (legalMoves.length === 0) return null;

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
      return engine.winner === aiColor ? 50000 + depth : -50000 - depth;
    }

    if (depth <= 0) {
      // Quiescence search for captures to avoid hanging Cha / Po
      return this.quiescence(engine, alpha, beta, currentTurn, aiColor, 3);
    }

    const legalMoves = engine.getAllLegalMoves(currentTurn);
    if (legalMoves.length === 0) {
      return -50000 - depth;
    }

    // Direct king capture check
    for (const m of legalMoves) {
      const target = engine.board[m.toR][m.toC];
      if (target && target.t === 'k') {
        return currentTurn === aiColor ? 50000 + depth : -50000 - depth;
      }
    }

    this.orderMoves(engine, legalMoves);

    // Dynamic branching factor: top 14 moves
    const topMoves = legalMoves.slice(0, 14);

    for (const move of topMoves) {
      engine.play(move.fromR, move.fromC, move.toR, move.toC);
      const score = -this.alphaBeta(engine, depth - 1, -beta, -alpha, engine.turn, aiColor);
      engine.undo();

      if (score >= beta) return beta;
      alpha = Math.max(alpha, score);
    }

    return alpha;
  }

  quiescence(engine, alpha, beta, currentTurn, aiColor, qDepth) {
    const standPat = this.evaluatePosition(engine, currentTurn);

    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;
    if (qDepth <= 0) return standPat;

    const allMoves = engine.getAllLegalMoves(currentTurn);
    const captures = allMoves.filter(m => engine.board[m.toR][m.toC] !== null);
    if (captures.length === 0) return standPat;

    this.orderMoves(engine, captures);
    const searchCaptures = captures.slice(0, 8);

    for (const move of searchCaptures) {
      engine.play(move.fromR, move.fromC, move.toR, move.toC);
      const score = -this.quiescence(engine, -beta, -alpha, engine.turn, aiColor, qDepth - 1);
      engine.undo();

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }

    return alpha;
  }

  orderMoves(engine, moves) {
    moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      const targetA = engine.board[a.toR][a.toC];
      const targetB = engine.board[b.toR][b.toC];

      if (targetA) {
        if (targetA.t === 'k') scoreA += 50000;
        scoreA += (this.pieceValues[targetA.t] || 0) * 10 - (this.pieceValues[engine.board[a.fromR][a.fromC].t] || 0);
      }
      if (targetB) {
        if (targetB.t === 'k') scoreB += 50000;
        scoreB += (this.pieceValues[targetB.t] || 0) * 10 - (this.pieceValues[engine.board[b.fromR][b.fromC].t] || 0);
      }

      // Cha forward development
      const pieceA = engine.board[a.fromR][a.fromC];
      const pieceB = engine.board[b.fromR][b.fromC];
      if (pieceA && pieceA.t === 'r') scoreA += 15;
      if (pieceB && pieceB.t === 'r') scoreB += 15;

      return scoreB - scoreA;
    });
  }

  evaluatePosition(engine, evalForColor) {
    let score = 0;
    const board = engine.board;

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        let val = this.pieceValues[piece.t] || 0;
        let posVal = 0;

        // 1. Cha (차) - Infiltration & Open Line Bonus
        if (piece.t === 'r') {
          const inEnemyCamp = (piece.color === 'han' && r >= 6) || (piece.color === 'cho' && r <= 3);
          if (inEnemyCamp) posVal += 25; // Enemy territory infiltration

          // Check if file is relatively open (count pieces in same column)
          let colCount = 0;
          for (let row = 0; row < 10; row++) {
            if (board[row][c]) colCount++;
          }
          if (colCount <= 3) posVal += 15; // Open file bonus
        }

        // 2. Po (포) - Central & Diagonal Power
        else if (piece.t === 'c') {
          // Central column or palace diagonal
          if (c === 4) posVal += 18; // Central Cannon (중포)
          if ((r === 1 || r === 8) && (c === 3 || c === 5)) posVal += 15; // Palace Cannon (귀포/면포)
        }

        // 3. Ma (마) - Mobility & Central Control
        else if (piece.t === 'h') {
          const maCol = Math.min(c, 7);
          posVal += this.pstMa[r][maCol];
        }

        // 4. Jol/Byeong (졸/병) - Advancing & Coordination
        else if (piece.t === 's') {
          const advance = piece.color === 'han' ? r : 9 - r;
          posVal += advance * 4;

          // Connected with adjacent friend Jol/Byeong
          const leftFriend = c > 0 && board[r][c - 1] && board[r][c - 1].t === 's' && board[r][c - 1].color === piece.color;
          const rightFriend = c < 8 && board[r][c + 1] && board[r][c + 1].t === 's' && board[r][c + 1].color === piece.color;
          if (leftFriend || rightFriend) posVal += 15; // Unbreakable connected line
        }

        // 5. Sa (사) - Palace Fortification
        else if (piece.t === 'g') {
          posVal += 10; // Guarding the King
        }

        val += posVal;

        if (piece.color === evalForColor) {
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
