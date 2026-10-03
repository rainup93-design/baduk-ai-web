// Baduk (Go) AI Engine - 4 Difficulty Levels
// Easy (쉬움), Normal (보통), Hard (어려움), Maximum (최대)

if (typeof EMPTY === 'undefined') {
  EMPTY = 0;
  BLACK = 1;
  WHITE = 2;
}

let BadukEngineClass = typeof BadukEngine !== 'undefined' ? BadukEngine : null;
if (!BadukEngineClass && typeof require !== 'undefined') {
  try {
    BadukEngineClass = require('./baduk-engine').BadukEngine;
  } catch (e) {}
}

class BadukAI {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty; // 'easy' | 'normal' | 'hard' | 'max'
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  // Get list of all legal moves on current engine
  getLegalMoves(engine, color) {
    const moves = [];
    for (let r = 0; r < engine.size; r++) {
      for (let c = 0; c < engine.size; c++) {
        if (engine.board[r][c] === EMPTY) {
          const res = engine.isValidMove(r, c, color);
          if (res.valid) {
            moves.push({ r, c, capturedCount: res.capturedCount });
          }
        }
      }
    }
    return moves;
  }

  // Main entry point: choose best move
  selectMove(engine, color) {
    const legalMoves = this.getLegalMoves(engine, color);
    if (legalMoves.length === 0) {
      return { pass: true };
    }

    switch (this.difficulty) {
      case 'easy':
        return this.selectEasyMove(engine, color, legalMoves);
      case 'normal':
        return this.selectNormalMove(engine, color, legalMoves);
      case 'hard':
        return this.selectHardMove(engine, color, legalMoves);
      case 'max':
        return this.selectMaxMove(engine, color, legalMoves);
      default:
        return this.selectNormalMove(engine, color, legalMoves);
    }
  }

  // ----------------------------------------------------
  // 1. EASY (쉬움)
  // ----------------------------------------------------
  selectEasyMove(engine, color, legalMoves) {
    const opponent = engine.getOpponent(color);

    // 50% chance: check immediate capture
    if (Math.random() < 0.5) {
      const captureMoves = legalMoves.filter(m => m.capturedCount > 0);
      if (captureMoves.length > 0) {
        return captureMoves[Math.floor(Math.random() * captureMoves.length)];
      }
    }

    // 40% chance: save stones in atari
    if (Math.random() < 0.4) {
      const saveMove = this.findAtariEscape(engine, color, legalMoves);
      if (saveMove) return saveMove;
    }

    // Prefer moves near existing stones, but with high randomness
    const nearMoves = this.filterNearStones(engine, legalMoves, 2);
    const pool = nearMoves.length > 0 && Math.random() < 0.6 ? nearMoves : legalMoves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ----------------------------------------------------
  // 2. NORMAL (보통)
  // ----------------------------------------------------
  selectNormalMove(engine, color, legalMoves) {
    const opponent = engine.getOpponent(color);

    // 1. Capture opponent stones in atari (always)
    const captureMoves = legalMoves.filter(m => m.capturedCount > 0);
    if (captureMoves.length > 0) {
      // Pick the move that captures the most stones
      captureMoves.sort((a, b) => b.capturedCount - a.capturedCount);
      return captureMoves[0];
    }

    // 2. Save own stones in atari
    const escapeMove = this.findAtariEscape(engine, color, legalMoves);
    if (escapeMove) return escapeMove;

    // 3. Put opponent in atari
    const atariMoves = this.findAtariAttacks(engine, color, legalMoves);
    if (atariMoves.length > 0 && Math.random() < 0.75) {
      return atariMoves[Math.floor(Math.random() * atariMoves.length)];
    }

    // 4. Early game opening: corners and sides
    const openingMove = this.findOpeningMove(engine, legalMoves);
    if (openingMove && Math.random() < 0.7) {
      return openingMove;
    }

    // 5. Score moves using basic heuristics
    let bestScore = -Infinity;
    let bestMove = legalMoves[0];

    for (const move of legalMoves) {
      let score = this.evaluateBasicHeuristic(engine, move.r, move.c, color);
      score += (Math.random() * 4 - 2); // slight variance
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  // ----------------------------------------------------
  // 3. HARD (어려움)
  // ----------------------------------------------------
  selectHardMove(engine, color, legalMoves) {
    // 1. Critical tactical moves (atari capture / escape)
    const tacticalMove = this.findTacticalMove(engine, color, legalMoves);
    if (tacticalMove) return tacticalMove;

    // 2. Evaluate all candidate moves with advanced tactical & positional scores
    const scoredMoves = [];
    for (const move of legalMoves) {
      const score = this.evaluateAdvancedPosition(engine, move.r, move.c, color);
      scoredMoves.push({ ...move, score });
    }

    scoredMoves.sort((a, b) => b.score - a.score);

    // Filter top candidates (top 5) and do a 1-ply lookahead
    const topCandidates = scoredMoves.slice(0, 5);
    let bestMove = topCandidates[0];
    let bestLookaheadScore = -Infinity;

    for (const candidate of topCandidates) {
      const lookaheadScore = this.lookahead1Ply(engine, candidate.r, candidate.c, color);
      const combined = candidate.score * 0.6 + lookaheadScore * 0.4;
      if (combined > bestLookaheadScore) {
        bestLookaheadScore = combined;
        bestMove = candidate;
      }
    }

    return bestMove;
  }

  // ----------------------------------------------------
  // 4. MAXIMUM (최대 - MCTS + Deep Heuristic Evaluation)
  // ----------------------------------------------------
  selectMaxMove(engine, color, legalMoves) {
    // 1. Immediate capture / escape if decisive
    const tacticalMove = this.findTacticalMove(engine, color, legalMoves);
    if (tacticalMove && tacticalMove.urgent) {
      return tacticalMove;
    }

    // 2. Candidate Selection (Smart Pruning)
    // Score all legal moves and pick the top 8 candidates for MCTS rollout
    const scoredCandidates = legalMoves.map(m => {
      const score = this.evaluateAdvancedPosition(engine, m.r, m.c, color);
      return { ...m, score };
    });
    scoredCandidates.sort((a, b) => b.score - a.score);

    const candidates = scoredCandidates.slice(0, Math.min(10, scoredCandidates.length));
    if (candidates.length === 1) return candidates[0];

    // 3. Mini-MCTS Rollout on the top candidates
    const simulationsPerCandidate = engine.size >= 19 ? 35 : 60;
    let bestCandidate = candidates[0];
    let highestWinRate = -Infinity;

    for (const candidate of candidates) {
      let wins = 0;
      for (let i = 0; i < simulationsPerCandidate; i++) {
        const simResult = this.fastRollout(engine, candidate.r, candidate.c, color, 14);
        if (simResult === color) {
          wins += 1;
        } else if (simResult === 'draw') {
          wins += 0.5;
        }
      }

      const winRate = wins / simulationsPerCandidate;
      // Combine MCTS win rate with static position evaluation
      const combinedScore = winRate * 70 + (candidate.score / 20) * 30;

      if (combinedScore > highestWinRate) {
        highestWinRate = combinedScore;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  // ----------------------------------------------------
  // TACTICAL & HEURISTIC HELPERS
  // ----------------------------------------------------

  findTacticalMove(engine, color, legalMoves) {
    const opponent = engine.getOpponent(color);

    // 1. Capture opponent's group in atari (highest value)
    const captureMoves = legalMoves.filter(m => m.capturedCount > 0);
    if (captureMoves.length > 0) {
      captureMoves.sort((a, b) => b.capturedCount - a.capturedCount);
      // If capturing 2 or more stones, or single stone in vital area -> urgent
      return { ...captureMoves[0], urgent: captureMoves[0].capturedCount >= 2 };
    }

    // 2. Save own groups with 1 liberty (in atari)
    const escapeMove = this.findAtariEscape(engine, color, legalMoves);
    if (escapeMove) {
      return { ...escapeMove, urgent: true };
    }

    // 3. Check groups with 2 liberties (push to atari or extend liberties)
    const urgentAtari = this.findAtariAttacks(engine, color, legalMoves);
    if (urgentAtari.length > 0) {
      return urgentAtari[0];
    }

    return null;
  }

  findAtariEscape(engine, color, legalMoves) {
    const checked = new Set();
    const endangeredGroups = [];

    for (let r = 0; r < engine.size; r++) {
      for (let c = 0; c < engine.size; c++) {
        if (engine.board[r][c] === color) {
          const key = `${r},${c}`;
          if (!checked.has(key)) {
            const grp = engine.getGroup(r, c);
            for (const [sr, sc] of grp.stones) {
              checked.add(`${sr},${sc}`);
            }
            if (grp.libertiesCount === 1) {
              endangeredGroups.push(grp);
            }
          }
        }
      }
    }

    if (endangeredGroups.length === 0) return null;

    // Sort by largest group first
    endangeredGroups.sort((a, b) => b.stones.length - a.stones.length);

    // Try to play at the single liberty to extend
    for (const grp of endangeredGroups) {
      const [libR, libC] = grp.liberties[0];
      const valid = engine.isValidMove(libR, libC, color);
      if (valid.valid) {
        // Ensure that playing here actually increases liberties
        const testBoard = engine.board.map(row => [...row]);
        testBoard[libR][libC] = color;
        const newGrp = engine.getGroup(libR, libC, testBoard);
        if (newGrp.libertiesCount > 1 || valid.capturedCount > 0) {
          return { r: libR, c: libC };
        }
      }
    }

    return null;
  }

  findAtariAttacks(engine, color, legalMoves) {
    const opponent = engine.getOpponent(color);
    const atariMoves = [];

    for (const move of legalMoves) {
      // Simulate move
      const testBoard = engine.board.map(row => [...row]);
      testBoard[move.r][move.c] = color;

      for (const [nr, nc] of engine.getNeighbors(move.r, move.c)) {
        if (testBoard[nr][nc] === opponent) {
          const grp = engine.getGroup(nr, nc, testBoard);
          if (grp && grp.libertiesCount === 1) {
            atariMoves.push(move);
            break;
          }
        }
      }
    }
    return atariMoves;
  }

  findOpeningMove(engine, legalMoves) {
    const s = engine.size;
    const cornerStars = [];

    if (s === 19) {
      // Standard star points: 3, 9, 15 (0-indexed: 3, 9, 15)
      const stars = [3, 9, 15];
      for (const r of [3, 15]) {
        for (const c of [3, 15]) {
          cornerStars.push([r, c]);
        }
      }
    } else if (s === 13) {
      const stars = [3, 9];
      for (const r of stars) {
        for (const c of stars) {
          cornerStars.push([r, c]);
        }
      }
    } else if (s === 9) {
      const stars = [2, 6];
      for (const r of stars) {
        for (const c of stars) {
          cornerStars.push([r, c]);
        }
      }
    }

    for (const [cr, cc] of cornerStars) {
      if (engine.board[cr][cc] === EMPTY) {
        const valid = engine.isValidMove(cr, cc, engine.turn);
        if (valid.valid) return { r: cr, c: cc };
      }
    }

    return null;
  }

  evaluateBasicHeuristic(engine, r, c, color) {
    let score = 0;
    const s = engine.size;
    const opponent = engine.getOpponent(color);

    // Distance to edge (3rd and 4th lines are best in opening/midgame)
    const distEdge = Math.min(r, c, s - 1 - r, s - 1 - c);
    if (distEdge === 2 || distEdge === 3) score += 6; // 3rd, 4th line
    else if (distEdge === 1) score += 2; // 2nd line
    else if (distEdge === 0) score -= 3; // 1st line (usually endgame only)

    // Neighbors
    const neighbors = engine.getNeighbors(r, c);
    let friendlyAdj = 0;
    let enemyAdj = 0;
    let emptyAdj = 0;

    for (const [nr, nc] of neighbors) {
      if (engine.board[nr][nc] === color) friendlyAdj++;
      else if (engine.board[nr][nc] === opponent) enemyAdj++;
      else emptyAdj++;
    }

    score += emptyAdj * 2.5; // more liberties = good
    score += friendlyAdj * 3.0; // connection
    if (enemyAdj > 0 && friendlyAdj === 0 && emptyAdj <= 1) {
      score -= 10; // suicidal / trapped
    }

    return score;
  }

  evaluateAdvancedPosition(engine, r, c, color) {
    let score = this.evaluateBasicHeuristic(engine, r, c, color);
    const opponent = engine.getOpponent(color);
    const s = engine.size;

    // Simulate placing the stone
    const testBoard = engine.board.map(row => [...row]);
    testBoard[r][c] = color;

    // Check newly formed group liberties
    const selfGroup = engine.getGroup(r, c, testBoard);
    if (selfGroup) {
      score += selfGroup.libertiesCount * 3.5;
      if (selfGroup.libertiesCount === 1) score -= 25; // Dangerous atari
      if (selfGroup.libertiesCount === 2) score -= 5;
    }

    // Pattern Recognition: Tiger's mouth (호구) / Eye shape / Diagonal connection
    const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    let friendlyDiag = 0;
    for (const [dr, dc] of diagonals) {
      const nr = r + dr;
      const nc = c + dc;
      if (engine.isInBounds(nr, nc) && engine.board[nr][nc] === color) {
        friendlyDiag++;
      }
    }
    score += friendlyDiag * 2.0;

    // Enemy liberties reduction
    for (const [nr, nc] of engine.getNeighbors(r, c)) {
      if (engine.board[nr][nc] === opponent) {
        const enemyGroup = engine.getGroup(nr, nc, testBoard);
        if (enemyGroup) {
          if (enemyGroup.libertiesCount === 1) score += 20; // Puts in atari!
          else if (enemyGroup.libertiesCount === 2) score += 8; // Pressures enemy
        }
      }
    }

    return score;
  }

  lookahead1Ply(engine, r, c, color) {
    const opponent = engine.getOpponent(color);
    const EngineClass = BadukEngineClass || BadukEngine;
    const tempEngine = new EngineClass(engine.size, engine.komi);
    tempEngine.board = engine.board.map(row => [...row]);
    tempEngine.turn = color;
    tempEngine.captures = { ...engine.captures };

    const playResult = tempEngine.play(r, c, color);
    if (!playResult.valid) return -100;

    // Opponent's best response score
    const oppMoves = this.getLegalMoves(tempEngine, opponent);
    if (oppMoves.length === 0) return 50;

    let oppBestScore = -Infinity;
    for (const om of oppMoves.slice(0, 8)) {
      const oppScore = this.evaluateBasicHeuristic(tempEngine, om.r, om.c, opponent);
      if (oppScore > oppBestScore) oppBestScore = oppScore;
    }

    return 20 - oppBestScore;
  }

  // Fast rollout simulation for MCTS
  fastRollout(engine, startR, startC, rootColor, maxDepth = 12) {
    const EngineClass = BadukEngineClass || BadukEngine;
    const sim = new EngineClass(engine.size, engine.komi);
    sim.board = engine.board.map(row => [...row]);
    sim.turn = rootColor;
    sim.captures = { ...engine.captures };

    const firstMove = sim.play(startR, startC, rootColor);
    if (!firstMove.valid) return engine.getOpponent(rootColor);

    let currColor = engine.getOpponent(rootColor);

    for (let depth = 0; depth < maxDepth; depth++) {
      if (sim.isGameOver) break;

      const legal = this.getLegalMoves(sim, currColor);
      if (legal.length === 0) {
        sim.pass(currColor);
      } else {
        // Fast heuristic pick: captures > random near moves
        const captures = legal.filter(m => m.capturedCount > 0);
        let chosen;
        if (captures.length > 0 && Math.random() < 0.7) {
          chosen = captures[0];
        } else {
          chosen = legal[Math.floor(Math.random() * legal.length)];
        }
        sim.play(chosen.r, chosen.c, currColor);
      }

      currColor = sim.getOpponent(currColor);
    }

    // Evaluate territory & captures at end of rollout
    const score = sim.calculateScore();
    return score.winner;
  }

  filterNearStones(engine, legalMoves, radius = 2) {
    return legalMoves.filter(m => {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = m.r + dr;
          const nc = m.c + dc;
          if (engine.isInBounds(nr, nc) && engine.board[nr][nc] !== EMPTY) {
            return true;
          }
        }
      }
      return false;
    });
  }
}

// Export for node or browser
if (typeof window !== 'undefined') {
  window.BadukAI = BadukAI;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BadukAI };
}
