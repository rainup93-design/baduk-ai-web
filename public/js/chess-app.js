// ======================================================
// CHESS APP - Controller & Canvas Renderer
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('chessCanvas');
  const ctx = canvas.getContext('2d');

  let config = {
    difficulty: 'normal',
    playerColor: CHESS_WHITE,
    soundEnabled: true,
    showHints: true
  };

  const COIN_REWARDS = {
    easy: 100,
    normal: 300,
    hard: 800,
    max: 1500
  };

  let engine = new ChessEngine();
  let ai = new ChessAI(config.difficulty);
  let isAiThinking = false;
  let selectedSquare = null; // { r, c }
  let legalMovesForSelected = []; // array of { toR, toC, ... }

  // DOM Elements
  const headerCoins = document.getElementById('headerCoins');
  const guestSection = document.getElementById('guestSection');
  const userSection = document.getElementById('userSection');
  const headerAvatar = document.getElementById('headerAvatar');
  const headerUserName = document.getElementById('headerUserName');
  const headerUserRecord = document.getElementById('headerUserRecord');
  const currentDiffBadge = document.getElementById('currentDiffBadge');
  const playerRowWhite = document.getElementById('playerRowWhite');
  const playerRowBlack = document.getElementById('playerRowBlack');
  const nameWhite = document.getElementById('nameWhite');
  const nameBlack = document.getElementById('nameBlack');
  const turnStatusText = document.getElementById('turnStatusText');
  const btnUndo = document.getElementById('btnUndo');
  const btnResign = document.getElementById('btnResign');
  const chkShowHints = document.getElementById('chkShowHints');
  const chkSound = document.getElementById('chkSound');

  // Modals
  const modalNewGame = document.getElementById('modalNewGame');
  const modalResult = document.getElementById('modalResult');
  const modalAuth = document.getElementById('modalAuth');
  const btnOpenNewGameModal = document.getElementById('btnOpenNewGameModal');
  const btnOpenAuthModal = document.getElementById('btnOpenAuthModal');
  const btnLogout = document.getElementById('btnLogout');
  const btnStartGame = document.getElementById('btnStartGame');
  const btnResultNewGame = document.getElementById('btnResultNewGame');
  const resultEmoji = document.getElementById('resultEmoji');
  const resultTitle = document.getElementById('resultTitle');
  const resultDetail = document.getElementById('resultDetail');
  const resultCoinReward = document.getElementById('resultCoinReward');
  const resEarnedCoins = document.getElementById('resEarnedCoins');

  // Board layout
  const margin = 24;
  const boardSize = canvas.width - margin * 2;
  const squareSize = boardSize / 8;

  // Visual piece symbols mapping
  const pieceSymbols = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
  };

  // Convert row/col based on player perspective (if player is black, flip board)
  function toDisplayRow(r) {
    return config.playerColor === CHESS_WHITE ? r : 7 - r;
  }
  function toDisplayCol(c) {
    return config.playerColor === CHESS_WHITE ? c : 7 - c;
  }
  function fromDisplayRow(dr) {
    return config.playerColor === CHESS_WHITE ? dr : 7 - dr;
  }
  function fromDisplayCol(dc) {
    return config.playerColor === CHESS_WHITE ? dc : 7 - dc;
  }

  function getSquareRect(r, c) {
    const dr = toDisplayRow(r);
    const dc = toDisplayCol(c);
    return {
      x: margin + dc * squareSize,
      y: margin + dr * squareSize,
      w: squareSize,
      h: squareSize
    };
  }

  function getSquareFromPixel(x, y) {
    if (x < margin || x >= canvas.width - margin || y < margin || y >= canvas.height - margin) return null;
    const dc = Math.floor((x - margin) / squareSize);
    const dr = Math.floor((y - margin) / squareSize);
    if (dr >= 0 && dr < 8 && dc >= 0 && dc < 8) {
      return { r: fromDisplayRow(dr), c: fromDisplayCol(dc) };
    }
    return null;
  }

  // ----------------------------------------------------
  // Canvas Rendering
  // ----------------------------------------------------
  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer border
    ctx.fillStyle = '#262421';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw 64 squares
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const rect = getSquareRect(r, c);
        const isLight = (r + c) % 2 === 0;

        // Base square color
        ctx.fillStyle = isLight ? '#edeed1' : '#779952';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        // Highlight last move
        if (engine.history.length > 0) {
          const last = engine.history[engine.history.length - 1];
          if ((last.fromR === r && last.fromC === c) || (last.toR === r && last.toC === c)) {
            ctx.fillStyle = 'rgba(247, 247, 105, 0.45)';
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
          }
        }

        // Highlight selected square
        if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
          ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
          ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 3;
          ctx.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3);
        }

        // Highlight king in check
        const piece = engine.board[r][c];
        if (piece && piece.t === 'k' && piece.color === engine.turn && engine.isInCheck(engine.turn)) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        }
      }
    }

    // Rank & File notations
    ctx.font = 'bold 12px Pretendard, sans-serif';
    for (let i = 0; i < 8; i++) {
      const file = config.playerColor === CHESS_WHITE ? String.fromCharCode(97 + i) : String.fromCharCode(104 - i);
      const rank = config.playerColor === CHESS_WHITE ? (8 - i).toString() : (i + 1).toString();

      // Files along bottom
      ctx.fillStyle = i % 2 === 1 ? '#edeed1' : '#779952';
      ctx.fillText(file, margin + i * squareSize + 5, canvas.height - margin + 16);

      // Ranks along left
      ctx.fillStyle = i % 2 === 0 ? '#edeed1' : '#779952';
      ctx.fillText(rank, margin - 16, margin + i * squareSize + 18);
    }

    // Draw pieces
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = engine.board[r][c];
        if (piece) {
          drawPiece(r, c, piece);
        }
      }
    }

    // Draw legal move hints
    if (config.showHints && legalMovesForSelected.length > 0) {
      for (const m of legalMovesForSelected) {
        const rect = getSquareRect(m.toR, m.toC);
        const targetPiece = engine.board[m.toR][m.toC];

        ctx.save();
        if (targetPiece || m.isEnPassant) {
          // Capture hint: ring around edge
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.4, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Empty square move hint: circle in center
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  function drawPiece(r, c, piece) {
    const rect = getSquareRect(r, c);
    const sym = pieceSymbols[piece.color][piece.t];

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${squareSize * 0.76}px 'Segoe UI Symbol', 'Apple Symbols', 'Arial Unicode MS', sans-serif`;

    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2 + 2;

    if (piece.color === CHESS_WHITE) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sym, cx, cy);
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 1;
      ctx.strokeText(sym, cx, cy);
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#18181b';
      ctx.fillText(sym, cx, cy);
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 0.8;
      ctx.strokeText(sym, cx, cy);
    }

    ctx.restore();
  }

  // ----------------------------------------------------
  // Interactions
  // ----------------------------------------------------
  canvas.addEventListener('click', (e) => {
    if (engine.isGameOver || isAiThinking || engine.turn !== config.playerColor) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const sq = getSquareFromPixel(clickX, clickY);
    if (!sq) return;

    // If already selected a piece, check if click is a legal move
    if (selectedSquare) {
      const isLegal = legalMovesForSelected.some(m => m.toR === sq.r && m.toC === sq.c);
      if (isLegal) {
        // Execute player move
        engine.play(selectedSquare.r, selectedSquare.c, sq.r, sq.c);
        selectedSquare = null;
        legalMovesForSelected = [];

        if (config.soundEnabled && typeof soundManager !== 'undefined') {
          soundManager.playStoneSound();
        }

        updateUI();
        drawBoard();

        if (engine.isGameOver) {
          handleGameOver();
          return;
        }

        // Trigger AI
        triggerAiTurn();
        return;
      }
    }

    // Select piece of player color
    const piece = engine.board[sq.r][sq.c];
    if (piece && piece.color === config.playerColor) {
      selectedSquare = sq;
      legalMovesForSelected = engine.getLegalMoves(sq.r, sq.c);
    } else {
      selectedSquare = null;
      legalMovesForSelected = [];
    }

    drawBoard();
  });

  function triggerAiTurn() {
    isAiThinking = true;
    updateUI();

    const delay = config.difficulty === 'easy' ? 400 : config.difficulty === 'normal' ? 600 : 800;
    setTimeout(() => {
      const aiColor = engine.getOpponent(config.playerColor);
      const move = ai.selectMove(engine, aiColor);

      if (move) {
        engine.play(move.fromR, move.fromC, move.toR, move.toC);
        if (config.soundEnabled && typeof soundManager !== 'undefined') {
          soundManager.playStoneSound();
        }
      }

      isAiThinking = false;
      updateUI();
      drawBoard();

      if (engine.isGameOver) {
        handleGameOver();
      }
    }, delay);
  }

  async function handleGameOver() {
    const isPlayerWin = engine.winner === config.playerColor;
    const isDraw = engine.winner === 'draw';

    let earnedCoins = 0;
    if (isPlayerWin) {
      earnedCoins = COIN_REWARDS[config.difficulty] || 300;
      if (config.soundEnabled && typeof soundManager !== 'undefined') {
        soundManager.playWinSound();
      }
      resultEmoji.textContent = '🏆';
      resultTitle.textContent = '체크메이트 승리!';
      resultDetail.textContent = `상대 킹을 체크메이트했습니다! (+${earnedCoins}🪙)`;
      resultCoinReward.style.display = 'block';
      resEarnedCoins.textContent = `+${earnedCoins}`;

      try {
        await authManager.recordGame({
          gameType: 'chess',
          result: 'win',
          difficulty: config.difficulty,
          moves: engine.history.length
        });
      } catch (e) {}
    } else if (isDraw) {
      resultEmoji.textContent = '🤝';
      resultTitle.textContent = '스테일메이트 무승부!';
      resultDetail.textContent = '합법적인 이동이 없어 스테일메이트로 비겼습니다.';
      resultCoinReward.style.display = 'none';
    } else {
      if (config.soundEnabled && typeof soundManager !== 'undefined') {
        soundManager.playLoseSound();
      }
      resultEmoji.textContent = '♟️';
      resultTitle.textContent = '체크메이트 패배';
      resultDetail.textContent = 'AI에게 체크메이트 당했습니다. 다시 도전해보세요!';
      resultCoinReward.style.display = 'none';

      try {
        await authManager.recordGame({
          gameType: 'chess',
          result: 'loss',
          difficulty: config.difficulty,
          moves: engine.history.length
        });
      } catch (e) {}
    }

    updateCoinsDisplay();
    modalResult.classList.add('active');
  }

  // ----------------------------------------------------
  // UI Helpers
  // ----------------------------------------------------
  function updateUI() {
    const diffNames = { easy: '쉬움', normal: '보통', hard: '어려움', max: '최대' };
    currentDiffBadge.textContent = diffNames[config.difficulty] || '보통';

    const isWhiteTurn = engine.turn === CHESS_WHITE;
    playerRowWhite.classList.toggle('active', isWhiteTurn);
    playerRowBlack.classList.toggle('active', !isWhiteTurn);

    if (config.playerColor === CHESS_WHITE) {
      nameWhite.textContent = '나 (백)';
      nameBlack.textContent = `AI 체스 (${diffNames[config.difficulty]})`;
    } else {
      nameWhite.textContent = `AI 체스 (${diffNames[config.difficulty]})`;
      nameBlack.textContent = '나 (흑)';
    }

    if (engine.isGameOver) {
      turnStatusText.textContent = engine.winner === 'draw' ? '스테일메이트 (무승부)' : '체크메이트! 대국 종료';
    } else if (isAiThinking) {
      turnStatusText.textContent = 'AI가 최선의 수를 계산 중입니다...';
    } else if (engine.turn === config.playerColor) {
      if (engine.isInCheck(config.playerColor)) {
        turnStatusText.textContent = '⚠️ 체크! 킹이 위협받고 있습니다.';
      } else {
        turnStatusText.textContent = '내 차례입니다. 기물을 클릭하세요.';
      }
    } else {
      turnStatusText.textContent = 'AI의 차례입니다.';
    }
  }

  function updateCoinsDisplay() {
    headerCoins.textContent = authManager.getCoins();
  }

  function updateAuthDisplay() {
    updateCoinsDisplay();
    const user = authManager.user;
    if (user) {
      guestSection.style.display = 'none';
      userSection.style.display = 'flex';
      headerAvatar.textContent = (user.nickname || user.username)[0].toUpperCase();
      headerUserName.textContent = user.nickname || user.username;
      const wins = user.stats ? user.stats.wins : 0;
      const losses = user.stats ? user.stats.losses : 0;
      headerUserRecord.textContent = `${wins}승 ${losses}패`;
    } else {
      guestSection.style.display = 'flex';
      userSection.style.display = 'none';
    }
  }

  // ----------------------------------------------------
  // Event Handlers
  // ----------------------------------------------------
  btnUndo.addEventListener('click', () => {
    if (isAiThinking || engine.isGameOver || engine.history.length === 0) return;
    if (engine.turn === config.playerColor && engine.history.length >= 2) {
      engine.undo();
      engine.undo();
    } else if (engine.history.length === 1 && engine.turn !== config.playerColor) {
      engine.undo();
    }
    selectedSquare = null;
    legalMovesForSelected = [];
    updateUI();
    drawBoard();
  });

  btnResign.addEventListener('click', () => {
    if (engine.isGameOver) return;
    if (confirm('대국을 기권하시겠습니까?')) {
      engine.isGameOver = true;
      engine.winner = engine.getOpponent(config.playerColor);
      handleGameOver();
    }
  });

  chkShowHints.addEventListener('change', (e) => {
    config.showHints = e.target.checked;
    drawBoard();
  });

  chkSound.addEventListener('change', (e) => {
    config.soundEnabled = e.target.checked;
  });

  btnOpenNewGameModal.addEventListener('click', () => modalNewGame.classList.add('active'));
  btnResultNewGame.addEventListener('click', () => {
    modalResult.classList.remove('active');
    modalNewGame.classList.add('active');
  });

  document.querySelectorAll('#diffSelection .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#diffSelection .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('#colorSelection .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#colorSelection .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  btnStartGame.addEventListener('click', () => {
    const activeDiff = document.querySelector('#diffSelection .seg-btn.active').getAttribute('data-val');
    const activeColor = document.querySelector('#colorSelection .seg-btn.active').getAttribute('data-val');

    config.difficulty = activeDiff;
    config.playerColor = activeColor;
    ai.setDifficulty(activeDiff);

    engine.reset();
    selectedSquare = null;
    legalMovesForSelected = [];
    modalNewGame.classList.remove('active');
    updateUI();
    drawBoard();

    if (config.playerColor === CHESS_BLACK) {
      triggerAiTurn();
    }
  });

  btnOpenAuthModal.addEventListener('click', () => modalAuth.classList.add('active'));
  btnLogout.addEventListener('click', async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await authManager.logout();
      updateAuthDisplay();
    }
  });

  async function init() {
    await authManager.checkAuth();
    updateAuthDisplay();
    updateUI();
    drawBoard();
  }

  authManager.onUserChange(() => updateAuthDisplay());
  init();
});
