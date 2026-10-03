// Baduk (Go) Game Engine - Complete Rules Implementation
// Supports 9x9, 13x13, 19x19, captures, suicide prevention, Ko rule, pass, resign, scoring.

// Global Baduk constants
var EMPTY = 0;
var BLACK = 1;
var WHITE = 2;

if (typeof window !== 'undefined') {
  window.EMPTY = EMPTY;
  window.BLACK = BLACK;
  window.WHITE = WHITE;
}

class BadukEngine {
  constructor(size = 19, komi = 6.5) {
    this.size = size;
    this.komi = komi;
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: this.size }, () => Array(this.size).fill(EMPTY));
    this.turn = BLACK; // Black goes first
    this.captures = { [BLACK]: 0, [WHITE]: 0 }; // captures[BLACK] = black captured X white stones
    this.history = []; // stack of { board, turn, captures, koPoint, lastMove }
    this.koPoint = null; // [r, c] where placing is forbidden due to Ko
    this.consecutivePasses = 0;
    this.isGameOver = false;
    this.winner = null;
    this.winReason = null;
    this.lastMove = null; // { r, c, color }
  }

  getOpponent(color) {
    return color === BLACK ? WHITE : BLACK;
  }

  isInBounds(r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  getNeighbors(r, c) {
    const neighbors = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (this.isInBounds(nr, nc)) {
        neighbors.push([nr, nc]);
      }
    }
    return neighbors;
  }

  // Get a connected group of stones and its liberties
  getGroup(r, c, boardState = this.board) {
    const color = boardState[r][c];
    if (color === EMPTY) return null;

    const stones = [];
    const liberties = new Set();
    const visited = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    const queue = [[r, c]];
    visited[r][c] = true;

    while (queue.length > 0) {
      const [currR, currC] = queue.shift();
      stones.push([currR, currC]);

      for (const [nr, nc] of this.getNeighbors(currR, currC)) {
        if (boardState[nr][nc] === EMPTY) {
          liberties.add(`${nr},${nc}`);
        } else if (boardState[nr][nc] === color && !visited[nr][nc]) {
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }

    return {
      color,
      stones,
      libertiesCount: liberties.size,
      liberties: Array.from(liberties).map(s => s.split(',').map(Number))
    };
  }

  // Check if a move is valid
  isValidMove(r, c, color = this.turn) {
    if (this.isGameOver) return { valid: false, reason: '게임이 종료되었습니다.' };
    if (!this.isInBounds(r, c)) return { valid: false, reason: '판 바깥입니다.' };
    if (this.board[r][c] !== EMPTY) return { valid: false, reason: '이미 돌이 놓여 있습니다.' };

    // Ko check
    if (this.koPoint && this.koPoint[0] === r && this.koPoint[1] === c) {
      return { valid: false, reason: '패(Ko) 규칙으로 인해 바로 둘 수 없습니다.' };
    }

    // Simulate placing the stone
    const opponent = this.getOpponent(color);
    const tempBoard = this.board.map(row => [...row]);
    tempBoard[r][c] = color;

    // Check opponent groups that would be captured
    let capturedStonesCount = 0;
    const capturedGroups = [];
    const checkedGroups = new Set();

    for (const [nr, nc] of this.getNeighbors(r, c)) {
      if (tempBoard[nr][nc] === opponent) {
        const key = `${nr},${nc}`;
        if (!checkedGroups.has(key)) {
          const group = this.getGroup(nr, nc, tempBoard);
          for (const [sR, sC] of group.stones) {
            checkedGroups.add(`${sR},${sC}`);
          }
          if (group.libertiesCount === 0) {
            capturedStonesCount += group.stones.length;
            capturedGroups.push(group);
          }
        }
      }
    }

    // If no opponent captured, check for suicide
    if (capturedStonesCount === 0) {
      const selfGroup = this.getGroup(r, c, tempBoard);
      if (selfGroup.libertiesCount === 0) {
        return { valid: false, reason: '자충수(착수 금지점)입니다.' };
      }
    }

    return { valid: true, capturedGroups, capturedCount: capturedStonesCount };
  }

  // Play a move
  play(r, c, color = this.turn) {
    const validity = this.isValidMove(r, c, color);
    if (!validity.valid) return validity;

    // Save history for undo
    this.history.push({
      board: this.board.map(row => [...row]),
      turn: this.turn,
      captures: { ...this.captures },
      koPoint: this.koPoint ? [...this.koPoint] : null,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      consecutivePasses: this.consecutivePasses
    });

    // Place stone
    this.board[r][c] = color;
    let singleCapturePoint = null;

    // Remove captured stones
    if (validity.capturedGroups && validity.capturedGroups.length > 0) {
      for (const grp of validity.capturedGroups) {
        for (const [sR, sC] of grp.stones) {
          this.board[sR][sC] = EMPTY;
        }
      }
      this.captures[color] += validity.capturedCount;

      // Check Ko condition: 1 stone captured, placed stone has 1 liberty
      if (validity.capturedCount === 1) {
        const selfGroup = this.getGroup(r, c, this.board);
        if (selfGroup && selfGroup.stones.length === 1 && selfGroup.libertiesCount === 1) {
          singleCapturePoint = validity.capturedGroups[0].stones[0];
        }
      }
    }

    this.koPoint = singleCapturePoint;
    this.lastMove = { r, c, color };
    this.consecutivePasses = 0;
    this.turn = this.getOpponent(color);

    return {
      valid: true,
      capturedCount: validity.capturedCount,
      capturedGroups: validity.capturedGroups,
      move: { r, c, color }
    };
  }

  // Pass move
  pass(color = this.turn) {
    if (this.isGameOver) return { valid: false, reason: '게임이 종료되었습니다.' };

    this.history.push({
      board: this.board.map(row => [...row]),
      turn: this.turn,
      captures: { ...this.captures },
      koPoint: this.koPoint ? [...this.koPoint] : null,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      consecutivePasses: this.consecutivePasses
    });

    this.koPoint = null;
    this.lastMove = { pass: true, color };
    this.consecutivePasses += 1;
    this.turn = this.getOpponent(color);

    if (this.consecutivePasses >= 2) {
      this.endGameByPass();
    }

    return { valid: true, pass: true, consecutivePasses: this.consecutivePasses };
  }

  // Resign
  resign(color = this.turn) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.winner = this.getOpponent(color);
    this.winReason = '불계승 (상대 기권)';
    return {
      isGameOver: true,
      winner: this.winner,
      winReason: this.winReason
    };
  }

  // Undo move
  undo() {
    if (this.history.length === 0) return false;
    const prev = this.history.pop();
    this.board = prev.board;
    this.turn = prev.turn;
    this.captures = prev.captures;
    this.koPoint = prev.koPoint;
    this.lastMove = prev.lastMove;
    this.consecutivePasses = prev.consecutivePasses;
    this.isGameOver = false;
    this.winner = null;
    this.winReason = null;
    return true;
  }

  // Scoring / Territory Evaluation (Chinese / Korean rules flood-fill)
  calculateScore() {
    const visited = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    const territory = { [BLACK]: 0, [WHITE]: 0, dame: 0 };
    const territoryMap = Array.from({ length: this.size }, () => Array(this.size).fill(EMPTY));

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === EMPTY && !visited[r][c]) {
          const region = [];
          const borderColors = new Set();
          const queue = [[r, c]];
          visited[r][c] = true;

          while (queue.length > 0) {
            const [currR, currC] = queue.shift();
            region.push([currR, currC]);

            for (const [nr, nc] of this.getNeighbors(currR, currC)) {
              const neighborColor = this.board[nr][nc];
              if (neighborColor === EMPTY) {
                if (!visited[nr][nc]) {
                  visited[nr][nc] = true;
                  queue.push([nr, nc]);
                }
              } else {
                borderColors.add(neighborColor);
              }
            }
          }

          if (borderColors.size === 1) {
            const owner = borderColors.has(BLACK) ? BLACK : WHITE;
            territory[owner] += region.length;
            for (const [rgR, rgC] of region) {
              territoryMap[rgR][rgC] = owner;
            }
          } else {
            territory.dame += region.length;
          }
        }
      }
    }

    // Japanese/Korean style score: territory + captures (+ komi for white)
    const blackTotal = territory[BLACK] + this.captures[BLACK];
    const whiteTotal = territory[WHITE] + this.captures[WHITE] + this.komi;

    return {
      black: {
        territory: territory[BLACK],
        captures: this.captures[BLACK],
        total: blackTotal
      },
      white: {
        territory: territory[WHITE],
        captures: this.captures[WHITE],
        komi: this.komi,
        total: whiteTotal
      },
      diff: Math.abs(blackTotal - whiteTotal),
      winner: blackTotal > whiteTotal ? BLACK : WHITE,
      territoryMap
    };
  }

  endGameByPass() {
    this.isGameOver = true;
    const score = this.calculateScore();
    this.winner = score.winner;
    const diffStr = score.diff.toFixed(1);
    const winnerName = score.winner === BLACK ? '흑' : '백';
    this.winReason = `${winnerName} ${diffStr}집 승 (계가 완료)`;
  }
}

// Export for node or browser
if (typeof window !== 'undefined') {
  window.BadukEngine = BadukEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BadukEngine, EMPTY, BLACK, WHITE };
}
