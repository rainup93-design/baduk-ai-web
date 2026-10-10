// ======================================================
// OMOK APP - Controller & Canvas Renderer
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('omokCanvas');
  const ctx = canvas.getContext('2d');

  let config = {
    difficulty: 'normal',
    playerColor: OMOK_BLACK,
    soundEnabled: true,
    showMoveNumbers: false
  };

  const COIN_REWARDS = {
    easy: 100,
    normal: 300,
    hard: 800,
    max: 1500
  };

  let engine = new OmokEngine(15);
  let ai = new OmokAI(config.difficulty);
  let isAiThinking = false;
  let hoverCoord = null;

  // DOM Elements
  const headerCoins = document.getElementById('headerCoins');
  const guestSection = document.getElementById('guestSection');
  const userSection = document.getElementById('userSection');
  const headerAvatar = document.getElementById('headerAvatar');
  const headerUserName = document.getElementById('headerUserName');
  const headerUserRecord = document.getElementById('headerUserRecord');
  const currentDiffBadge = document.getElementById('currentDiffBadge');
  const playerRowBlack = document.getElementById('playerRowBlack');
  const playerRowWhite = document.getElementById('playerRowWhite');
  const nameBlack = document.getElementById('nameBlack');
  const nameWhite = document.getElementById('nameWhite');
  const turnStatusBanner = document.getElementById('turnStatusBanner');
  const turnStatusText = document.getElementById('turnStatusText');
  const btnUndo = document.getElementById('btnUndo');
  const btnResign = document.getElementById('btnResign');
  const chkShowMoveNumbers = document.getElementById('chkShowMoveNumbers');
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
  const margin = 32;
  const cellSize = (canvas.width - margin * 2) / (15 - 1);

  function getPixelCoord(r, c) {
    return {
      x: margin + c * cellSize,
      y: margin + r * cellSize
    };
  }

  function getBoardCoord(x, y) {
    const c = Math.round((x - margin) / cellSize);
    const r = Math.round((y - margin) / cellSize);
    if (r >= 0 && r < 15 && c >= 0 && c < 15) {
      return { r, c };
    }
    return null;
  }

  // ----------------------------------------------------
  // Canvas Drawing
  // ----------------------------------------------------
  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Board wood background
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#e8af69');
    bgGrad.addColorStop(1, '#c2853f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = '#432d16';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 15; i++) {
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(margin, margin + i * cellSize);
      ctx.lineTo(canvas.width - margin, margin + i * cellSize);
      ctx.stroke();

      // Vertical
      ctx.beginPath();
      ctx.moveTo(margin + i * cellSize, margin);
      ctx.lineTo(margin + i * cellSize, canvas.height - margin);
      ctx.stroke();
    }

    // Star points (화점: 3, 7, 11)
    const starPoints = [3, 7, 11];
    ctx.fillStyle = '#432d16';
    for (const r of starPoints) {
      for (const c of starPoints) {
        const pt = getPixelCoord(r, c);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hover stone
    if (hoverCoord && !engine.isGameOver && engine.turn === config.playerColor && !isAiThinking) {
      if (engine.isValidMove(hoverCoord.r, hoverCoord.c)) {
        const pt = getPixelCoord(hoverCoord.r, hoverCoord.c);
        ctx.save();
        ctx.globalAlpha = 0.45;
        drawStone(pt.x, pt.y, config.playerColor);
        ctx.restore();
      }
    }

    // Placed stones
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const color = engine.board[r][c];
        if (color !== OMOK_EMPTY) {
          const pt = getPixelCoord(r, c);
          drawStone(pt.x, pt.y, color);

          // Move number
          if (config.showMoveNumbers) {
            const moveIdx = engine.history.findIndex(h => h.r === r && h.c === c);
            if (moveIdx !== -1) {
              ctx.fillStyle = color === OMOK_BLACK ? '#ffffff' : '#111111';
              ctx.font = 'bold 11px Pretendard, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(moveIdx + 1, pt.x, pt.y);
            }
          }
        }
      }
    }

    // Last move indicator
    if (engine.lastMove) {
      const pt = getPixelCoord(engine.lastMove.r, engine.lastMove.c);
      ctx.strokeStyle = engine.lastMove.color === OMOK_BLACK ? '#ef4444' : '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, cellSize * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Win line highlight
    if (engine.winLine) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const startPt = getPixelCoord(engine.winLine[0].r, engine.winLine[0].c);
      ctx.moveTo(startPt.x, startPt.y);
      for (let i = 1; i < engine.winLine.length; i++) {
        const pt = getPixelCoord(engine.winLine[i].r, engine.winLine[i].c);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  }

  function drawStone(x, y, color) {
    const radius = cellSize * 0.43;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);

    const grad = ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.3, radius * 0.1,
      x, y, radius
    );

    if (color === OMOK_BLACK) {
      grad.addColorStop(0, '#555555');
      grad.addColorStop(0.5, '#222222');
      grad.addColorStop(1, '#0a0a0a');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.7, '#e8e8e8');
      grad.addColorStop(1, '#cccccc');
    }

    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  // ----------------------------------------------------
  // Game Play Logic
  // ----------------------------------------------------
  function handleCanvasClick(e) {
    if (engine.isGameOver || isAiThinking || engine.turn !== config.playerColor) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const coord = getBoardCoord(clickX, clickY);
    if (!coord || !engine.isValidMove(coord.r, coord.c)) return;

    // Player Move
    engine.play(coord.r, coord.c);
    if (config.soundEnabled && typeof soundManager !== 'undefined') {
      soundManager.playStoneSound();
    }
    updateUI();
    drawBoard();

    if (engine.isGameOver) {
      handleGameOver();
      return;
    }

    // Trigger AI turn
    triggerAiTurn();
  }

  function triggerAiTurn() {
    isAiThinking = true;
    updateUI();

    const thinkDelay = config.difficulty === 'easy' ? 300 : config.difficulty === 'normal' ? 500 : 700;
    setTimeout(() => {
      const aiColor = engine.getOpponent(config.playerColor);
      const move = ai.selectMove(engine, aiColor);

      if (move && engine.isValidMove(move.r, move.c)) {
        engine.play(move.r, move.c);
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
    }, thinkDelay);
  }

  async function handleGameOver() {
    const isPlayerWin = engine.winner === config.playerColor;
    const isDraw = engine.winner === 0;

    let earnedCoins = 0;
    if (isPlayerWin) {
      earnedCoins = COIN_REWARDS[config.difficulty] || 300;
      if (config.soundEnabled && typeof soundManager !== 'undefined') {
        soundManager.playWinSound();
      }
      resultEmoji.textContent = '🎉';
      resultTitle.textContent = '승리하였습니다!';
      resultDetail.textContent = `오목 5목을 먼저 달성했습니다! (+${earnedCoins}🪙)`;
      resultCoinReward.style.display = 'block';
      resEarnedCoins.textContent = `+${earnedCoins}`;

      // Save game & reward coins
      try {
        await authManager.recordGame({
          gameType: 'omok',
          result: 'win',
          difficulty: config.difficulty,
          moves: engine.history.length
        });
      } catch (e) {
        console.error('Record game error:', e);
      }
    } else if (isDraw) {
      resultEmoji.textContent = '🤝';
      resultTitle.textContent = '무승부!';
      resultDetail.textContent = '판이 모두 차서 무승부로 끝났습니다.';
      resultCoinReward.style.display = 'none';
    } else {
      if (config.soundEnabled && typeof soundManager !== 'undefined') {
        soundManager.playLoseSound();
      }
      resultEmoji.textContent = '😢';
      resultTitle.textContent = '패배하였습니다';
      resultDetail.textContent = 'AI가 먼저 5목을 완성했습니다. 다시 도전해보세요!';
      resultCoinReward.style.display = 'none';

      try {
        await authManager.recordGame({
          gameType: 'omok',
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
  // UI Updates
  // ----------------------------------------------------
  function updateUI() {
    const diffNames = { easy: '쉬움', normal: '보통', hard: '어려움', max: '최대' };
    currentDiffBadge.textContent = diffNames[config.difficulty] || '보통';

    const isBlackTurn = engine.turn === OMOK_BLACK;
    playerRowBlack.classList.toggle('active', isBlackTurn);
    playerRowWhite.classList.toggle('active', !isBlackTurn);

    if (config.playerColor === OMOK_BLACK) {
      nameBlack.textContent = '나 (흑)';
      nameWhite.textContent = `AI 오목 (${diffNames[config.difficulty]})`;
    } else {
      nameBlack.textContent = `AI 오목 (${diffNames[config.difficulty]})`;
      nameWhite.textContent = '나 (백)';
    }

    if (engine.isGameOver) {
      turnStatusText.textContent = '대국이 종료되었습니다.';
    } else if (isAiThinking) {
      turnStatusText.textContent = 'AI가 최적의 착수점을 생각 중입니다...';
    } else if (engine.turn === config.playerColor) {
      turnStatusText.textContent = '내 차례입니다. 오목판을 클릭하여 착수하세요.';
    } else {
      turnStatusText.textContent = 'AI의 차례입니다.';
    }
  }

  function updateCoinsDisplay() {
    const coins = authManager.getCoins();
    headerCoins.textContent = coins;
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
  // Event Listeners
  // ----------------------------------------------------
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    hoverCoord = getBoardCoord(x, y);
    drawBoard();
  });

  canvas.addEventListener('mouseleave', () => {
    hoverCoord = null;
    drawBoard();
  });

  canvas.addEventListener('click', handleCanvasClick);

  btnUndo.addEventListener('click', () => {
    if (isAiThinking || engine.isGameOver || engine.history.length === 0) return;
    // Undo 2 moves (AI move and player move)
    if (engine.turn === config.playerColor && engine.history.length >= 2) {
      engine.undo();
      engine.undo();
    } else if (engine.history.length === 1 && engine.turn !== config.playerColor) {
      engine.undo();
    }
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

  chkShowMoveNumbers.addEventListener('change', (e) => {
    config.showMoveNumbers = e.target.checked;
    drawBoard();
  });

  chkSound.addEventListener('change', (e) => {
    config.soundEnabled = e.target.checked;
  });

  btnOpenNewGameModal.addEventListener('click', () => {
    modalNewGame.classList.add('active');
  });

  btnResultNewGame.addEventListener('click', () => {
    modalResult.classList.remove('active');
    modalNewGame.classList.add('active');
  });

  // Modal controls
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
    const activeColor = parseInt(document.querySelector('#colorSelection .seg-btn.active').getAttribute('data-val'));

    config.difficulty = activeDiff;
    config.playerColor = activeColor;
    ai.setDifficulty(activeDiff);

    engine.reset();
    modalNewGame.classList.remove('active');
    updateUI();
    drawBoard();

    // If player is white, AI (black) moves first
    if (config.playerColor === OMOK_WHITE) {
      triggerAiTurn();
    }
  });

  // Auth integration
  btnOpenAuthModal.addEventListener('click', () => modalAuth.classList.add('active'));
  btnLogout.addEventListener('click', async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await authManager.logout();
      updateAuthDisplay();
    }
  });

  // Init
  async function init() {
    await authManager.checkAuth();
    updateAuthDisplay();
    updateUI();
    drawBoard();
  }

  authManager.onUserChange(() => updateAuthDisplay());
  init();
});
