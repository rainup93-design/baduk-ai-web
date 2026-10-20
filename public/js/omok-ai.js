// ======================================================
// OMOK (Gomoku) AI - Grandmaster Engine
// Features: Full Pattern Windows (Straight & Jump 4s/3s),
// 4-3 & 3-3 Threat Combinations, Alpha-Beta with Iterative Deepening
// ======================================================

var OMOK_EMPTY = (typeof OMOK_EMPTY !== 'undefined') ? OMOK_EMPTY : (typeof window !== 'undefined' && window.OMOK_EMPTY !== undefined ? window.OMOK_EMPTY : 0);
var OMOK_BLACK = (typeof OMOK_BLACK !== 'undefined') ? OMOK_BLACK : (typeof window !== 'undefined' && window.OMOK_BLACK !== undefined ? window.OMOK_BLACK : 1);
var OMOK_WHITE = (typeof OMOK_WHITE !== 'undefined') ? OMOK_WHITE : (typeof window !== 'undefined' && window.OMOK_WHITE !== undefined ? window.OMOK_WHITE : 2);

class OmokAI {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty; // 'easy' | 'normal' | 'hard' | 'max'

    // Direction vectors: horizontal, vertical, diagonal-down, diagonal-up
    this.directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1]
    ];
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

    // Second move -> Near center
    if (engine.history.length === 1) {
      const center = Math.floor(size / 2);
      const moves = [
        { r: center - 1, c: center },
        { r: center + 1, c: center },
        { r: center, c: center - 1 },
        { r: center, c: center + 1 },
        { r: center - 1, c: center - 1 },
        { r: center + 1, c: center + 1 }
      ];
      for (const m of moves) {
        if (engine.board[m.r][m.c] === OMOK_EMPTY) return m;
      }
    }

    // Active empty positions within 2 steps of any placed stone
    const candidates = this.getCandidates(engine);
    if (candidates.length === 0) {
      return { r: Math.floor(size / 2), c: Math.floor(size / 2) };
    }

    // 1. Check immediate winning moves (Five in a row)
    for (const cand of candidates) {
      engine.board[cand.r][cand.c] = aiColor;
      const winRes = engine.checkWin(cand.r, cand.c, aiColor);
      engine.board[cand.r][cand.c] = OMOK_EMPTY;
      if (winRes && winRes.won) return cand;
    }

    // 2. Block immediate opponent win (Opponent Five)
    for (const cand of candidates) {
      engine.board[cand.r][cand.c] = oppColor;
      const oppWinRes = engine.checkWin(cand.r, cand.c, oppColor);
      engine.board[cand.r][cand.c] = OMOK_EMPTY;
      if (oppWinRes && oppWinRes.won) return cand;
    }

    if (this.difficulty === 'easy') {
      return this.selectMoveEasy(engine, candidates, aiColor, oppColor);
    } else if (this.difficulty === 'normal') {
      return this.selectMoveNormal(engine, candidates, aiColor, oppColor);
    } else if (this.difficulty === 'hard') {
      return this.selectMoveHard(engine, candidates, aiColor, oppColor, 3);
    } else { // 'max'
      return this.selectMoveHard(engine, candidates, aiColor, oppColor, 4);
    }
  }

  // Candidates within Chebyshev distance 2 of existing stones
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

  // Comprehensive Pattern Evaluator on a line of 9 cells centered at (r, c)
  evaluatePointPatterns(board, size, r, c, color) {
    const opp = color === OMOK_BLACK ? OMOK_WHITE : OMOK_BLACK;
    let counts = {
      five: 0,
      openFour: 0,
      blockedFour: 0,
      openThree: 0,
      blockedThree: 0,
      openTwo: 0
    };

    for (const [dr, dc] of this.directions) {
      // Build string representation: 1=color, 2=opp, 0=empty, '#'=out of board
      let line = '';
      for (let offset = -4; offset <= 4; offset++) {
        const nr = r + offset * dr;
        const nc = c + offset * dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
          line += '#';
        } else if (offset === 0) {
          line += '1'; // Pretend we played here
        } else if (board[nr][nc] === color) {
          line += '1';
        } else if (board[nr][nc] === opp) {
          line += '2';
        } else {
          line += '0';
        }
      }

      // Check patterns on this 9-cell line
      if (line.includes('11111')) {
        counts.five++;
      } else if (line.includes('011110')) {
        counts.openFour++;
      } else {
        // Blocked / Jump Fours
        if (
          line.includes('211110') || line.includes('011112') ||
          line.includes('#11110') || line.includes('01111#') ||
          line.includes('10111') || line.includes('11011') || line.includes('11101')
        ) {
          counts.blockedFour++;
        }

        // Open Threes (both ends open and forms open four)
        if (
          line.includes('01110') ||
          line.includes('010110') ||
          line.includes('011010')
        ) {
          counts.openThree++;
        } else if (
          line.includes('211100') || line.includes('001112') ||
          line.includes('210110') || line.includes('011012') ||
          line.includes('211010') || line.includes('010112') ||
          line.includes('10011') || line.includes('11001') || line.includes('10101')
        ) {
          counts.blockedThree++;
        }

        // Open Twos
        if (
          line.includes('001100') ||
          line.includes('010100') || line.includes('001010') ||
          line.includes('010010')
        ) {
          counts.openTwo++;
        }
      }
    }

    // Calculate score with tactical multiplier
    let score = 0;
    if (counts.five > 0) score += 10000000;
    if (counts.openFour > 0) score += 2000000;
    if (counts.blockedFour > 0) score += 250000 * counts.blockedFour;

    // Double threat bonuses: 4-3, 3-3, double-four
    if (counts.blockedFour > 0 && counts.openThree > 0) {
      score += 850000; // Four-Three (사삼) - Lethal!
    }
    if (counts.blockedFour >= 2) {
      score += 900000; // Double-four
    }
    if (counts.openThree >= 2) {
      score += 650000; // Double-three (삼삼) - Deadly!
    } else if (counts.openThree === 1) {
      score += 80000;
    }

    if (counts.blockedThree > 0) score += 6000 * counts.blockedThree;
    if (counts.openTwo > 0) score += 1500 * counts.openTwo;

    return { score, counts };
  }

  // Easy AI: Occasional blunder
  selectMoveEasy(engine, candidates, aiColor, oppColor) {
    if (Math.random() < 0.28) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return this.selectMoveNormal(engine, candidates, aiColor, oppColor);
  }

  // Normal AI: Tactical Pattern Scoring
  selectMoveNormal(engine, candidates, aiColor, oppColor) {
    let bestScore = -Infinity;
    let bestMoves = [];

    for (const cand of candidates) {
      const atk = this.evaluatePointPatterns(engine.board, engine.size, cand.r, cand.c, aiColor);
      const def = this.evaluatePointPatterns(engine.board, engine.size, cand.r, cand.c, oppColor);

      // AI win has highest priority, then blocking opponent deadly attacks
      let score = atk.score + def.score * 1.15;

      // Center proximity bias
      const center = Math.floor(engine.size / 2);
      const dist = Math.abs(cand.r - center) + Math.abs(cand.c - center);
      score -= dist * 4;

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [cand];
      } else if (score === bestScore) {
        bestMoves.push(cand);
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  // Hard & Max AI: Alpha-Beta with Threat Heuristics
  selectMoveHard(engine, candidates, aiColor, oppColor, depth) {
    // Score all candidates
    const scoredCandidates = candidates.map(cand => {
      const atk = this.evaluatePointPatterns(engine.board, engine.size, cand.r, cand.c, aiColor);
      const def = this.evaluatePointPatterns(engine.board, engine.size, cand.r, cand.c, oppColor);

      let urgency = atk.score + def.score * 1.25;
      if (atk.counts.five > 0) urgency = 20000000;
      else if (def.counts.five > 0) urgency = 18000000;
      else if (atk.counts.openFour > 0) urgency = 15000000;
      else if (def.counts.openFour > 0) urgency = 12000000;
      else if (atk.counts.blockedFour > 0 && atk.counts.openThree > 0) urgency = 10000000;
      else if (def.counts.blockedFour > 0 && def.counts.openThree > 0) urgency = 8000000;

      return {
        ...cand,
        urgency,
        atkScore: atk.score,
        defScore: def.score
      };
    });

    scoredCandidates.sort((a, b) => b.urgency - a.urgency);

    // If an urgent move exists (5, open 4, 4-3), play it without deep search
    if (scoredCandidates[0].urgency >= 8000000) {
      return scoredCandidates[0];
    }

    // Select top 12 moves for minimax search
    const topMoves = scoredCandidates.slice(0, 12);
    let bestScore = -Infinity;
    let bestMove = topMoves[0];

    for (const move of topMoves) {
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
      return this.evaluateBoardFull(engine.board, engine.size, aiColor, oppColor);
    }

    const currentTurnColor = isAiTurn ? aiColor : oppColor;
    const candidates = this.getCandidates(engine);

    // Quick score candidates
    const scored = candidates.map(cand => {
      const p = this.evaluatePointPatterns(engine.board, engine.size, cand.r, cand.c, currentTurnColor);
      return { ...cand, score: p.score };
    });
    scored.sort((a, b) => b.score - a.score);

    // Top 8 branch factor for fast, deep search
    const topMoves = scored.slice(0, 8);

    if (isAiTurn) {
      let maxEval = -Infinity;
      for (const move of topMoves) {
        if (move.score >= 10000000) return 10000000 + depth; // Direct win
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
        if (move.score >= 10000000) return -10000000 - depth; // Direct loss
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

  evaluateBoardFull(board, size, aiColor, oppColor) {
    let aiScore = 0;
    let oppScore = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === aiColor) {
          aiScore += this.evaluatePointPatterns(board, size, r, c, aiColor).score;
        } else if (board[r][c] === oppColor) {
          oppScore += this.evaluatePointPatterns(board, size, r, c, oppColor).score;
        }
      }
    }

    return aiScore - oppScore * 1.2;
  }
}

if (typeof window !== 'undefined') {
  window.OmokAI = OmokAI;
}
if (typeof module !== 'undefined') {
  module.exports = { OmokAI };
}
