// ======================================================
// OMOK (Gomoku) AI
// Threat evaluation + Minimax/Alpha-beta
// ======================================================

var OMOK_EMPTY = (typeof OMOK_EMPTY !== 'undefined') ? OMOK_EMPTY : (typeof window !== 'undefined' && window.OMOK_EMPTY !== undefined ? window.OMOK_EMPTY : 0);
var OMOK_BLACK = (typeof OMOK_BLACK !== 'undefined') ? OMOK_BLACK : (typeof window !== 'undefined' && window.OMOK_BLACK !== undefined ? window.OMOK_BLACK : 1);
var OMOK_WHITE = (typeof OMOK_WHITE !== 'undefined') ? OMOK_WHITE : (typeof window !== 'undefined' && window.OMOK_WHITE !== undefined ? window.OMOK_WHITE : 2);

class OmokAI {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty; // 'easy' | 'normal' | 'hard' | 'max'
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  selectMove(engine, aiColor) {
    const oppColor = engine.getOpponent(aiColor);
    const size = engine.size;

    // First move of the game -> Center
    if (engine.history.length === 0) {
      const center = Math.floor(size / 2);
      return { r: center, c: center };
    }

    // Candidate moves around existing stones (distance <= 2)
    const candidates = this.getCandidates(engine);
    if (candidates.length === 0) {
      return { r: Math.floor(size / 2), c: Math.floor(size / 2) };
    }

    if (this.difficulty === 'easy') {
      return this.selectMoveEasy(engine, candidates, aiColor, oppColor);
    } else if (this.difficulty === 'normal') {
      return this.selectMoveNormal(engine, candidates, aiColor, oppColor);
    } else if (this.difficulty === 'hard') {
      return this.selectMoveHard(engine, candidates, aiColor, oppColor, 2);
    } else { // 'max'
      return this.selectMoveHard(engine, candidates, aiColor, oppColor, 3);
    }
  }

  // Get active empty positions within 2 steps of any placed stone
  getCandidates(engine) {
    const size = engine.size;
    const board = engine.board;
    const visited = Array(size).fill(false).map(() => Array(size).fill(false));
    const candidates = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] !== OMOK_EMPTY) {
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (board[nr][nc] === OMOK_EMPTY && !visited[nr][nc]) {
                  visited[nr][nc] = true;
                  candidates.push({ r: nr, c: nc });
                }
              }
            }
          }
        }
      }
    }

    return candidates;
  }

  // Evaluate single point threat score
  evaluatePoint(board, size, r, c, color) {
    const directions = [
      [ [0, 1], [0, -1] ],
      [ [1, 0], [-1, 0] ],
      [ [1, 1], [-1, -1] ],
      [ [1, -1], [-1, 1] ]
    ];
    const opp = color === OMOK_BLACK ? OMOK_WHITE : OMOK_BLACK;
    let totalScore = 0;

    for (const [dir1, dir2] of directions) {
      let count = 1;
      let openEnds = 0;

      // dir 1
      let nr = r + dir1[0];
      let nc = c + dir1[1];
      while (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === color) {
        count++;
        nr += dir1[0];
        nc += dir1[1];
      }
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === OMOK_EMPTY) {
        openEnds++;
      }

      // dir 2
      nr = r + dir2[0];
      nc = c + dir2[1];
      while (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === color) {
        count++;
        nr += dir2[0];
        nc += dir2[1];
      }
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === OMOK_EMPTY) {
        openEnds++;
      }

      // Scoring table
      if (count >= 5) {
        totalScore += 1000000; // 5 in a row
      } else if (count === 4) {
        if (openEnds === 2) totalScore += 100000; // Open 4
        else if (openEnds === 1) totalScore += 10000; // Blocked 4
      } else if (count === 3) {
        if (openEnds === 2) totalScore += 8000;  // Open 3
        else if (openEnds === 1) totalScore += 800;
      } else if (count === 2) {
        if (openEnds === 2) totalScore += 500;
        else if (openEnds === 1) totalScore += 50;
      } else if (count === 1 && openEnds === 2) {
        totalScore += 10;
      }
    }

    return totalScore;
  }

  // Easy AI
  selectMoveEasy(engine, candidates, aiColor, oppColor) {
    // 30% chance completely random
    if (Math.random() < 0.3) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return this.selectMoveNormal(engine, candidates, aiColor, oppColor);
  }

  // Normal AI: Direct threat evaluation
  selectMoveNormal(engine, candidates, aiColor, oppColor) {
    let bestScore = -Infinity;
    let bestMoves = [];

    for (const cand of candidates) {
      // Offensive score
      const attackScore = this.evaluatePoint(engine.board, engine.size, cand.r, cand.c, aiColor);
      // Defensive score (how dangerous if opponent plays here)
      const defendScore = this.evaluatePoint(engine.board, engine.size, cand.r, cand.c, oppColor);

      // AI win has highest priority, then block opponent win
      let score = attackScore + defendScore * 1.1;

      // Slight center preference
      const center = Math.floor(engine.size / 2);
      const distToCenter = Math.abs(cand.r - center) + Math.abs(cand.c - center);
      score -= distToCenter * 2;

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [cand];
      } else if (score === bestScore) {
        bestMoves.push(cand);
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  // Hard & Max AI: Alpha-Beta Search
  selectMoveHard(engine, candidates, aiColor, oppColor, depth) {
    // Score all candidates first to prune and sort
    const scoredCandidates = candidates.map(cand => {
      const atk = this.evaluatePoint(engine.board, engine.size, cand.r, cand.c, aiColor);
      const def = this.evaluatePoint(engine.board, engine.size, cand.r, cand.c, oppColor);
      return {
        ...cand,
        score: atk >= 1000000 ? 9999999 : (def >= 1000000 ? 8888888 : atk + def * 1.2)
      };
    });

    // Immediate win or block
    if (scoredCandidates.some(c => c.score >= 8888888)) {
      scoredCandidates.sort((a, b) => b.score - a.score);
      return scoredCandidates[0];
    }

    scoredCandidates.sort((a, b) => b.score - a.score);
    // Take top 10 candidates for alpha-beta
    const topMoves = scoredCandidates.slice(0, 10);

    let bestScore = -Infinity;
    let bestMove = topMoves[0];

    for (const move of topMoves) {
      // Make move
      engine.board[move.r][move.c] = aiColor;
      const score = -this.alphaBeta(engine, depth - 1, -Infinity, Infinity, false, aiColor, oppColor);
      engine.board[move.r][move.c] = OMOK_EMPTY;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  alphaBeta(engine, depth, alpha, beta, isAiTurn, aiColor, oppColor) {
    if (depth <= 0) {
      return this.evaluateBoard(engine.board, engine.size, aiColor, oppColor);
    }

    const currentTurnColor = isAiTurn ? aiColor : oppColor;
    const candidates = this.getCandidates(engine);

    // Quick candidate sorting
    const scored = candidates.map(cand => ({
      ...cand,
      score: this.evaluatePoint(engine.board, engine.size, cand.r, cand.c, currentTurnColor)
    }));
    scored.sort((a, b) => b.score - a.score);
    const topMoves = scored.slice(0, 6);

    if (isAiTurn) {
      let maxEval = -Infinity;
      for (const move of topMoves) {
        if (move.score >= 1000000) return 5000000; // Immediate win
        engine.board[move.r][move.c] = aiColor;
        const ev = this.alphaBeta(engine, depth - 1, alpha, beta, false, aiColor, oppColor);
        engine.board[move.r][move.c] = OMOK_EMPTY;

        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of topMoves) {
        if (move.score >= 1000000) return -5000000; // Immediate opponent win
        engine.board[move.r][move.c] = oppColor;
        const ev = this.alphaBeta(engine, depth - 1, alpha, beta, true, aiColor, oppColor);
        engine.board[move.r][move.c] = OMOK_EMPTY;

        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  evaluateBoard(board, size, aiColor, oppColor) {
    let aiScore = 0;
    let oppScore = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === aiColor) {
          aiScore += this.evaluatePoint(board, size, r, c, aiColor);
        } else if (board[r][c] === oppColor) {
          oppScore += this.evaluatePoint(board, size, r, c, oppColor);
        }
      }
    }

    return aiScore - oppScore * 1.1;
  }
}

if (typeof window !== 'undefined') {
  window.OmokAI = OmokAI;
}
if (typeof module !== 'undefined') {
  module.exports = { OmokAI };
}
