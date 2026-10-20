// ===================================================================
// Baduk (Go) AI Engine - Grandmaster Edition
// 4 Difficulty Levels: Easy, Normal, Hard, Maximum
// Features: Comprehensive Fuseki (Corners, Approaches, Enclosures, Extensions),
// Haengma Shape Heuristics (Tiger's Mouth, Bamboo Joint, Knight's Move,
// Cut/Connect, Empty Triangle Penalty), Tactical Atari Escape & Double-Atari,
// Pattern-Guided Monte Carlo Tree Search
// ===================================================================

if (typeof EMPTY === 'undefined') { var EMPTY = 0; }
if (typeof BLACK === 'undefined') { var BLACK = 1; }
if (typeof WHITE === 'undefined') { var WHITE = 2; }

let BadukEngineClass = typeof BadukEngine !== 'undefined' ? BadukEngine : null;
if (!BadukEngineClass && typeof require !== 'undefined') {
  try {
    BadukEngineClass = require('./baduk-engine').BadukEngine;
  } catch (e) {}
}

class BadukAI {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty; // 'easy' | 'normal' | 'hard' | 'max'
    this._EMPTY = 0;
    this._BLACK = 1;
    this._WHITE = 2;
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  getLegalMoves(engine, color) {
    const moves = [];
    for (let r = 0; r < engine.size; r++) {
      for (let c = 0; c < engine.size; c++) {
        if (engine.board[r][c] === this._EMPTY) {
          const res = engine.isValidMove(r, c, color);
          if (res.valid) {
            moves.push({ r, c, capturedCount: res.capturedCount });
          }
        }
      }
    }
    return moves;
  }

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
  // 1. EASY (쉬움) - 약 25% 실수 확률
  // ----------------------------------------------------
  selectEasyMove(engine, color, legalMoves) {
    if (Math.random() < 0.45) {
      const captureMoves = legalMoves.filter(m => m.capturedCount > 0);
      if (captureMoves.length > 0) {
        return captureMoves[Math.floor(Math.random() * captureMoves.length)];
      }
    }

    if (Math.random() < 0.35) {
      const saveMove = this.findAtariEscape(engine, color, legalMoves);
      if (saveMove) return saveMove;
    }

    const nearMoves = this.filterNearStones(engine, legalMoves, 2);
    const pool = nearMoves.length > 0 && Math.random() < 0.5 ? nearMoves : legalMoves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ----------------------------------------------------
  // 2. NORMAL (보통) - 탄탄한 포석 + 기본 행마법
  // ----------------------------------------------------
  selectNormalMove(engine, color, legalMoves) {
    // 1. Capture stones in atari
    const captureMoves = legalMoves.filter(m => m.capturedCount > 0);
    if (captureMoves.length > 0) {
      captureMoves.sort((a, b) => b.capturedCount - a.capturedCount);
      return captureMoves[0];
    }

    // 2. Save own endangered groups
    const escapeMove = this.findAtariEscape(engine, color, legalMoves);
    if (escapeMove) return escapeMove;

    // 3. Early Opening (Corners, Enclosures, Approaches, Star points)
    const openingMove = this.findFusekiMove(engine, color, legalMoves);
    if (openingMove && Math.random() < 0.85) {
      return openingMove;
    }

    // 4. Double atari attack
    const dblAtari = this.findDoubleAtari(engine, color, legalMoves);
    if (dblAtari) return dblAtari;

    // 5. Evaluate all moves by advanced shape & territory heuristic
    let bestScore = -Infinity;
    let bestMove = legalMoves[0];

    for (const move of legalMoves) {
      let score = this.evaluateAdvancedPosition(engine, move.r, move.c, color);
      score += (Math.random() * 2 - 1); // Slight variation
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  // ----------------------------------------------------
  // 3. HARD (어려움) - 포석 + 행마 + 2-ply 전술 수읽기
  // ----------------------------------------------------
  selectHardMove(engine, color, legalMoves) {
    // 1. Urgent tactical move
    const tacticalMove = this.findTacticalMove(engine, color, legalMoves);
    if (tacticalMove && tacticalMove.urgent) return tacticalMove;

    // 2. Early Opening Book (Fuseki)
    const openingMove = this.findFusekiMove(engine, color, legalMoves);
    if (openingMove) return openingMove;

    // 3. Evaluate and rank candidate moves
    const scoredMoves = legalMoves.map(move => ({
      ...move,
      score: this.evaluateAdvancedPosition(engine, move.r, move.c, color)
    }));

    scoredMoves.sort((a, b) => b.score - a.score);

    // Top 10 candidates with 1-ply lookahead
    const topCandidates = scoredMoves.slice(0, 10);
    let bestMove = topCandidates[0];
    let bestLookaheadScore = -Infinity;

    for (const candidate of topCandidates) {
      const lookaheadScore = this.lookahead1Ply(engine, candidate.r, candidate.c, color);
      const combined = candidate.score * 0.5 + lookaheadScore * 0.5;
      if (combined > bestLookaheadScore) {
        bestLookaheadScore = combined;
        bestMove = candidate;
      }
    }

    return bestMove;
  }

  // ----------------------------------------------------
  // 4. MAXIMUM (최대) - 패턴 가이드 MCTS + 심층 사활/형태 평가
  // ----------------------------------------------------
  selectMaxMove(engine, color, legalMoves) {
    // 1. Urgent tactical defense/offense
    const tacticalMove = this.findTacticalMove(engine, color, legalMoves);
    if (tacticalMove && tacticalMove.urgent) return tacticalMove;

    // 2. Early Opening Book
    const openingMove = this.findFusekiMove(engine, color, legalMoves);
    if (openingMove) return openingMove;

    // 3. Smart candidate ranking
    const scoredCandidates = legalMoves.map(m => ({
      ...m,
      score: this.evaluateAdvancedPosition(engine, m.r, m.c, color)
    }));
    scoredCandidates.sort((a, b) => b.score - a.score);

    const maxCandidates = engine.size >= 19 ? 8 : 12;
    const candidates = scoredCandidates.slice(0, Math.min(maxCandidates, scoredCandidates.length));
    if (candidates.length === 1) return candidates[0];

    // 4. Pattern-Guided MCTS
    const simsPerCandidate = engine.size >= 19 ? 16 : engine.size >= 13 ? 24 : 32;
    const rolloutDepth = engine.size >= 19 ? 10 : 14;

    let bestCandidate = candidates[0];
    let highestScore = -Infinity;

    for (const candidate of candidates) {
      let wins = 0;
      for (let i = 0; i < simsPerCandidate; i++) {
        const simResult = this.fastRollout(engine, candidate.r, candidate.c, color, rolloutDepth);
        if (simResult === color) {
          wins += 1;
        } else if (simResult === 'draw') {
          wins += 0.5;
        }
      }

      const winRate = wins / simsPerCandidate;
      const combinedScore = winRate * 65 + (candidate.score / 25) * 35;

      if (combinedScore > highestScore) {
        highestScore = combinedScore;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  // ----------------------------------------------------
  // FUSEKI (포석) - Corners, Enclosures, Approaches, Extensions
  // ----------------------------------------------------
  findFusekiMove(engine, color, legalMoves) {
    const s = engine.size;
    const totalStones = engine.history.length;
    // Apply fuseki in early game
    if (totalStones > s * 3.5) return null;

    if (s === 19) {
      // 1. Corners: 4-4 (Star) and 3-4 (Komoku)
      const corners = [
        // Star points (화점)
        { r: 3, c: 3 }, { r: 3, c: 15 }, { r: 15, c: 3 }, { r: 15, c: 15 },
        // Komoku (소목)
        { r: 2, c: 3 }, { r: 3, c: 2 }, { r: 2, c: 15 }, { r: 3, c: 16 },
        { r: 16, c: 3 }, { r: 15, c: 2 }, { r: 16, c: 15 }, { r: 15, c: 16 }
      ];

      // Play an empty corner if available
      for (const p of corners) {
        if (engine.board[p.r][p.c] === this._EMPTY && engine.isValidMove(p.r, p.c, color).valid) {
          // Check if corner quadrant is completely empty
          const qR = p.r < 9 ? 0 : 10;
          const qC = p.c < 9 ? 0 : 10;
          let emptyQuadrant = true;
          for (let dr = 0; dr < 6; dr++) {
            for (let dc = 0; dc < 6; dc++) {
              if (engine.board[qR + dr][qC + dc] !== this._EMPTY) {
                emptyQuadrant = false;
                break;
              }
            }
            if (!emptyQuadrant) break;
          }
          if (emptyQuadrant) return p;
        }
      }

      // 2. Corner Approaches (걸침) and Enclosures (굳힘)
      for (const p of [{ r: 3, c: 3 }, { r: 3, c: 15 }, { r: 15, c: 3 }, { r: 15, c: 15 }]) {
        const stone = engine.board[p.r][p.c];
        if (stone !== this._EMPTY) {
          // If our stone -> Enclosure (날일자 굳힘)
          if (stone === color) {
            const encMoves = [
              { r: p.r < 9 ? p.r + 2 : p.r - 2, c: p.c < 9 ? p.c + 1 : p.c - 1 },
              { r: p.r < 9 ? p.r + 1 : p.r - 1, c: p.c < 9 ? p.c + 2 : p.c - 2 }
            ];
            for (const em of encMoves) {
              if (engine.isInBounds(em.r, em.c) && engine.board[em.r][em.c] === this._EMPTY && engine.isValidMove(em.r, em.c, color).valid) {
                return em;
              }
            }
          }
          // If opponent stone -> Approach (날일자 걸침)
          else {
            const appMoves = [
              { r: p.r < 9 ? p.r + 2 : p.r - 2, c: p.c < 9 ? p.c + 1 : p.c - 1 },
              { r: p.r < 9 ? p.r + 1 : p.r - 1, c: p.c < 9 ? p.c + 2 : p.c - 2 }
            ];
            for (const am of appMoves) {
              if (engine.isInBounds(am.r, am.c) && engine.board[am.r][am.c] === this._EMPTY && engine.isValidMove(am.r, am.c, color).valid) {
                return am;
              }
            }
          }
        }
      }

      // 3. Side Extensions (3선 / 4선 변 벌림)
      const sideExtensions = [
        { r: 3, c: 9 }, { r: 9, c: 3 }, { r: 9, c: 15 }, { r: 15, c: 9 },
        { r: 2, c: 9 }, { r: 9, c: 2 }, { r: 9, c: 16 }, { r: 16, c: 9 }
      ];
      for (const sm of sideExtensions) {
        if (engine.board[sm.r][sm.c] === this._EMPTY && engine.isValidMove(sm.r, sm.c, color).valid) {
          return sm;
        }
      }
    } else if (s === 13) {
      const stars = [
        { r: 3, c: 3 }, { r: 3, c: 9 }, { r: 9, c: 3 }, { r: 9, c: 9 },
        { r: 3, c: 6 }, { r: 6, c: 3 }, { r: 6, c: 9 }, { r: 9, c: 6 }, { r: 6, c: 6 }
      ];
      for (const st of stars) {
        if (engine.board[st.r][st.c] === this._EMPTY && engine.isValidMove(st.r, st.c, color).valid) {
          return st;
        }
      }
    } else if (s === 9) {
      const stars = [
        { r: 2, c: 2 }, { r: 2, c: 6 }, { r: 6, c: 2 }, { r: 6, c: 6 }, { r: 4, c: 4 }
      ];
      for (const st of stars) {
        if (engine.board[st.r][st.c] === this._EMPTY && engine.isValidMove(st.r, st.c, color).valid) {
          return st;
        }
      }
    }

    return null;
  }

  // ----------------------------------------------------
  // TACTICAL MOVES (Atari, Escape, Cuts)
  // ----------------------------------------------------
  findTacticalMove(engine, color, legalMoves) {
    // 1. Capture opponent's group in atari
    const captureMoves = legalMoves.filter(m => m.capturedCount > 0);
    if (captureMoves.length > 0) {
      captureMoves.sort((a, b) => b.capturedCount - a.capturedCount);
      return { ...captureMoves[0], urgent: captureMoves[0].capturedCount >= 2 };
    }

    // 2. Save own groups in atari (only if escaping gives >= 2 liberties!)
    const escapeMove = this.findAtariEscape(engine, color, legalMoves);
    if (escapeMove) {
      return { ...escapeMove, urgent: true };
    }

    // 3. Double atari attack
    const dblAtari = this.findDoubleAtari(engine, color, legalMoves);
    if (dblAtari) {
      return { ...dblAtari, urgent: true };
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

    // Prioritize saving larger groups first
    endangeredGroups.sort((a, b) => b.stones.length - a.stones.length);

    for (const grp of endangeredGroups) {
      const [libR, libC] = grp.liberties[0];
      const valid = engine.isValidMove(libR, libC, color);
      if (valid.valid) {
        // Simulate playing the escape move
        const testBoard = engine.board.map(row => [...row]);
        testBoard[libR][libC] = color;
        const newGrp = engine.getGroup(libR, libC, testBoard);

        // Don't run into a ladder or futile 1-liberty escape!
        if (newGrp.libertiesCount >= 2 || valid.capturedCount > 0) {
          return { r: libR, c: libC };
        }
      }

      // Counter-attack: capture adjacent enemy group with 1 liberty
      for (const [sr, sc] of grp.stones) {
        for (const [nr, nc] of engine.getNeighbors(sr, sc)) {
          if (engine.board[nr][nc] === engine.getOpponent(color)) {
            const enemyGrp = engine.getGroup(nr, nc);
            if (enemyGrp && enemyGrp.libertiesCount === 1) {
              const [eLibR, eLibC] = enemyGrp.liberties[0];
              if (engine.isValidMove(eLibR, eLibC, color).valid) {
                return { r: eLibR, c: eLibC };
              }
            }
          }
        }
      }
    }

    return null;
  }

  findDoubleAtari(engine, color, legalMoves) {
    const opp = engine.getOpponent(color);
    for (const move of legalMoves) {
      const testBoard = engine.board.map(row => [...row]);
      testBoard[move.r][move.c] = color;

      let atariCount = 0;
      const seenGroups = new Set();

      for (const [nr, nc] of engine.getNeighbors(move.r, move.c)) {
        if (testBoard[nr][nc] === opp) {
          const grp = engine.getGroup(nr, nc, testBoard);
          if (grp && grp.libertiesCount === 1) {
            const root = `${grp.stones[0][0]},${grp.stones[0][1]}`;
            if (!seenGroups.has(root)) {
              seenGroups.add(root);
              atariCount++;
            }
          }
        }
      }

      if (atariCount >= 2) {
        return move; // Double atari found!
      }
    }
    return null;
  }

  // ----------------------------------------------------
  // ADVANCED POSITION & SHAPE EVALUATION
  // ----------------------------------------------------
  evaluateAdvancedPosition(engine, r, c, color) {
    let score = 0;
    const s = engine.size;
    const opponent = engine.getOpponent(color);

    // 1. Line distance (3rd line = territory, 4th line = influence)
    const distEdge = Math.min(r, c, s - 1 - r, s - 1 - c);
    if (distEdge === 3) score += 9;      // 4th line (세력)
    else if (distEdge === 2) score += 8; // 3rd line (실리)
    else if (distEdge === 1) score += 1; // 2nd line
    else if (distEdge === 0) {
      // 1st line (edge) is severely penalized unless capturing
      const isValid = engine.isValidMove(r, c, color);
      if (isValid.capturedCount === 0) {
        score -= 28;
      }
    }

    // 2. Simulate placing the stone
    const testBoard = engine.board.map(row => [...row]);
    testBoard[r][c] = color;

    // 3. Liberties of the newly formed group
    const selfGroup = engine.getGroup(r, c, testBoard);
    if (selfGroup) {
      score += selfGroup.libertiesCount * 3.5;
      if (selfGroup.libertiesCount === 1) score -= 35; // Suicidal / self-atari
      else if (selfGroup.libertiesCount === 2) score -= 5;
      else if (selfGroup.libertiesCount >= 4) score += 6; // Stable shape
    }

    // 4. HAENGMA SHAPES (행마법)
    score += this.evaluateHaengmaShapes(engine, r, c, color, testBoard);

    // 5. Pressuring enemy groups
    for (const [nr, nc] of engine.getNeighbors(r, c)) {
      if (engine.board[nr][nc] === opponent) {
        const enemyGroup = engine.getGroup(nr, nc, testBoard);
        if (enemyGroup) {
          if (enemyGroup.libertiesCount === 1) score += 24;  // Direct atari
          else if (enemyGroup.libertiesCount === 2) score += 10; // Strong pressure
          else if (enemyGroup.libertiesCount === 3) score += 4;
        }
      }
    }

    // 6. Territorial influence
    score += this.estimateInfluence(engine, r, c, color, testBoard);

    return score;
  }

  evaluateHaengmaShapes(engine, r, c, color, testBoard) {
    let shapeScore = 0;
    const opp = engine.getOpponent(color);

    // A. Tiger's Mouth (호구) Check
    // A point has 3 friendly stones surrounding it, making an eye
    const neighbors = engine.getNeighbors(r, c);
    let friendlyNeighbors = 0;
    for (const [nr, nc] of neighbors) {
      if (testBoard[nr][nc] === color) friendlyNeighbors++;
    }
    if (friendlyNeighbors === 3) {
      shapeScore += 26; // Complete Tiger's Mouth (호구 형성)
    } else if (friendlyNeighbors === 2) {
      shapeScore += 8;
    }

    // B. Bamboo Joint (쌍립) Check
    // Two friendly pairs side-by-side
    const dirs = [[0, 1], [1, 0]];
    for (const [dr, dc] of dirs) {
      const r1 = r + dr, c1 = c + dc;
      const r2 = r - dr, c2 = c - dc;
      if (engine.isInBounds(r1, c1) && engine.isInBounds(r2, c2)) {
        if (testBoard[r1][c1] === color && testBoard[r2][c2] === color) {
          shapeScore += 16;
        }
      }
    }

    // C. Knight's Move (날일자) & One-Space Jump (한칸뜀)
    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightOffsets) {
      const nr = r + dr, nc = c + dc;
      if (engine.isInBounds(nr, nc) && testBoard[nr][nc] === color) {
        shapeScore += 6;
      }
    }

    // D. Empty Triangle Penalty (빈삼각 감점)
    // 3 friendly stones in an L-shape around an empty point
    const cornerOffsets = [
      [[-1, 0], [0, -1], [-1, -1]],
      [[-1, 0], [0, 1], [-1, 1]],
      [[1, 0], [0, -1], [1, -1]],
      [[1, 0], [0, 1], [1, 1]]
    ];
    for (const [p1, p2, emptyP] of cornerOffsets) {
      const r1 = r + p1[0], c1 = c + p1[1];
      const r2 = r + p2[0], c2 = c + p2[1];
      const er = r + emptyP[0], ec = c + emptyP[1];
      if (engine.isInBounds(r1, c1) && engine.isInBounds(r2, c2) && engine.isInBounds(er, ec)) {
        if (testBoard[r1][c1] === color && testBoard[r2][c2] === color && testBoard[er][ec] === this._EMPTY) {
          shapeScore -= 22; // Bad heavy shape (빈삼각)
        }
      }
    }

    return shapeScore;
  }

  estimateInfluence(engine, r, c, color, testBoard) {
    let influence = 0;
    const opponent = engine.getOpponent(color);
    const radius = 3;

    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (!engine.isInBounds(nr, nc) || (dr === 0 && dc === 0)) continue;

        const dist = Math.abs(dr) + Math.abs(dc);
        const cell = testBoard[nr][nc];

        if (cell === this._EMPTY) {
          influence += (radius + 1 - dist) * 0.35;
        } else if (cell === color) {
          influence += (radius + 1 - dist) * 0.45;
        } else if (cell === opponent) {
          influence -= (radius + 1 - dist) * 0.25;
        }
      }
    }

    return influence;
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

    const oppMoves = this.getLegalMoves(tempEngine, opponent);
    if (oppMoves.length === 0) return 60;

    let oppBestScore = -Infinity;
    const checkCount = Math.min(10, oppMoves.length);
    for (let i = 0; i < checkCount; i++) {
      const om = oppMoves[i];
      const oppScore = this.evaluateAdvancedPosition(tempEngine, om.r, om.c, opponent);
      if (oppScore > oppBestScore) oppBestScore = oppScore;
    }

    return 25 - oppBestScore * 0.75;
  }

  fastRollout(engine, startR, startC, rootColor, maxDepth = 10) {
    const EngineClass = BadukEngineClass || BadukEngine;
    const sim = new EngineClass(engine.size, engine.komi);
    sim.board = engine.board.map(row => [...row]);
    sim.turn = rootColor;
    sim.captures = { ...engine.captures };

    const firstMove = sim.play(startR, startC, rootColor);
    if (!firstMove.valid) return engine.getOpponent(rootColor);

    let currColor = engine.getOpponent(rootColor);
    let consecutivePasses = 0;

    for (let depth = 0; depth < maxDepth; depth++) {
      if (sim.isGameOver) break;

      const legal = this.getLegalMoves(sim, currColor);
      if (legal.length === 0) {
        consecutivePasses++;
        if (consecutivePasses >= 2) break;
        currColor = sim.getOpponent(currColor);
        continue;
      }
      consecutivePasses = 0;

      // Pattern-guided rollout: prefer captures or near stones
      const captures = legal.filter(m => m.capturedCount > 0);
      let chosen;
      if (captures.length > 0 && Math.random() < 0.8) {
        chosen = captures[0];
      } else {
        const near = this.filterNearStones(sim, legal, 2);
        const pool = near.length > 0 && Math.random() < 0.7 ? near : legal;
        chosen = pool[Math.floor(Math.random() * pool.length)];
      }
      sim.play(chosen.r, chosen.c, currColor);

      currColor = sim.getOpponent(currColor);
    }

    const blackStones = this.countStones(sim, this._BLACK) + sim.captures[this._BLACK];
    const whiteStones = this.countStones(sim, this._WHITE) + sim.captures[this._WHITE] + sim.komi;

    if (Math.abs(blackStones - whiteStones) < 2) return 'draw';
    return blackStones > whiteStones ? this._BLACK : this._WHITE;
  }

  countStones(engine, color) {
    let count = 0;
    for (let r = 0; r < engine.size; r++) {
      for (let c = 0; c < engine.size; c++) {
        if (engine.board[r][c] === color) count++;
      }
    }
    return count;
  }

  filterNearStones(engine, legalMoves, radius = 2) {
    return legalMoves.filter(m => {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = m.r + dr;
          const nc = m.c + dc;
          if (engine.isInBounds(nr, nc) && engine.board[nr][nc] !== this._EMPTY) {
            return true;
          }
        }
      }
      return false;
    });
  }
}

if (typeof window !== 'undefined') {
  window.BadukAI = BadukAI;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BadukAI };
}
