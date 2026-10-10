// ======================================================
// OMOK (Gomoku) Engine
// 15x15 Board, standard 5-in-a-row rules
// ======================================================

var OMOK_EMPTY = 0;
var OMOK_BLACK = 1;
var OMOK_WHITE = 2;

if (typeof window !== 'undefined') {
  window.OMOK_EMPTY = OMOK_EMPTY;
  window.OMOK_BLACK = OMOK_BLACK;
  window.OMOK_WHITE = OMOK_WHITE;
}

class OmokEngine {
  constructor(size = 15) {
    this.size = size;
    this.board = [];
    this.turn = OMOK_BLACK; // Black moves first
    this.history = [];
    this.isGameOver = false;
    this.winner = null;
    this.winLine = null;
    this.lastMove = null;
    this.reset();
  }

  reset() {
    this.board = Array(this.size).fill(null).map(() => Array(this.size).fill(OMOK_EMPTY));
    this.turn = OMOK_BLACK;
    this.history = [];
    this.isGameOver = false;
    this.winner = null;
    this.winLine = null;
    this.lastMove = null;
  }

  isValidMove(r, c) {
    if (this.isGameOver) return false;
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return false;
    return this.board[r][c] === OMOK_EMPTY;
  }

  play(r, c) {
    if (!this.isValidMove(r, c)) return false;

    const color = this.turn;
    this.board[r][c] = color;
    this.lastMove = { r, c, color };
    this.history.push({ r, c, color });

    // Check Win
    const winResult = this.checkWin(r, c, color);
    if (winResult.won) {
      this.isGameOver = true;
      this.winner = color;
      this.winLine = winResult.line;
      return true;
    }

    // Check Draw (board full)
    if (this.history.length >= this.size * this.size) {
      this.isGameOver = true;
      this.winner = 0; // Draw
      return true;
    }

    // Switch turn
    this.turn = this.turn === OMOK_BLACK ? OMOK_WHITE : OMOK_BLACK;
    return true;
  }

  checkWin(r, c, color) {
    const directions = [
      [ [0, 1], [0, -1] ],   // 가로 (-)
      [ [1, 0], [-1, 0] ],   // 세로 (|)
      [ [1, 1], [-1, -1] ],  // 대각선 (\)
      [ [1, -1], [-1, 1] ]   // 대각선 (/)
    ];

    for (const [dir1, dir2] of directions) {
      let count = 1;
      const line = [{ r, c }];

      // Positive direction
      let nr = r + dir1[0];
      let nc = c + dir1[1];
      while (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === color) {
        count++;
        line.push({ r: nr, c: nc });
        nr += dir1[0];
        nc += dir1[1];
      }

      // Negative direction
      nr = r + dir2[0];
      nc = c + dir2[1];
      while (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === color) {
        count++;
        line.push({ r: nr, c: nc });
        nr += dir2[0];
        nc += dir2[1];
      }

      // 5개 이상이면 승리 (일반 오목 룰: 5목 이상 승리)
      if (count >= 5) {
        return { won: true, line };
      }
    }

    return { won: false, line: null };
  }

  undo() {
    if (this.history.length === 0) return false;
    const last = this.history.pop();
    this.board[last.r][last.c] = OMOK_EMPTY;
    this.turn = last.color;
    this.isGameOver = false;
    this.winner = null;
    this.winLine = null;
    this.lastMove = this.history.length > 0 ? this.history[this.history.length - 1] : null;
    return true;
  }

  getOpponent(color) {
    return color === OMOK_BLACK ? OMOK_WHITE : OMOK_BLACK;
  }
}

if (typeof window !== 'undefined') {
  window.OmokEngine = OmokEngine;
}
if (typeof module !== 'undefined') {
  module.exports = { OmokEngine, OMOK_EMPTY, OMOK_BLACK, OMOK_WHITE };
}
