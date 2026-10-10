// ======================================================
// JANGGI APP - Controller & Canvas Renderer
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('janggiCanvas');
  const ctx = canvas.getContext('2d');

  let config = {
    difficulty: 'normal',
    playerColor: JANGGI_CHO,
    soundEnabled: true,
    showHints: true
  };

  const COIN_REWARDS = {
    easy: 100,
    normal: 300,
    hard: 800,
    max: 1500
  };

  let engine = new JanggiEngine();
  let ai = new JanggiAI(config.difficulty);
  let isAiThinking = false;
  let selectedSquare = null; // { r, c }
  let legalMovesForSelected = []; // array of { toR, toC }

  // DOM Elements
  const headerCoins = document.getElementById('headerCoins');
  const guestSection = document.getElementById('guestSection');
  const userSection = document.getElementById('userSection');
  const headerAvatar = document.getElementById('headerAvatar');
  const headerUserName = document.getElementById('headerUserName');
  const headerUserRecord = document.getElementById('headerUserRecord');
  const currentDiffBadge = document.getElementById('currentDiffBadge');
  const playerRowCho = document.getElementById('playerRowCho');
  const playerRowHan = document.getElementById('playerRowHan');
  const nameCho = document.getElementById('nameCho');
  const nameHan = document.getElementById('nameHan');
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

  // Board layout: 10 rows, 9 cols
  const marginX = 36;
  const marginY = 36;
  const cellW = (canvas.width - marginX * 2) / (9 - 1);
  const cellH = (canvas.height - marginY * 2) / (10 - 1);

  // Hanja labels
  const hanjaLabels = {
    [JANGGI_CHO]: { k: '楚', g: '士', r: '車', c: '包', h: '馬', e: '象', s: '卒' },
    [JANGGI_HAN]: { k: '漢', g: '士', r: '車', c: '包', h: '馬', e: '象', s: '兵' }
  };

  function toDisplayRow(r) {
    return config.playerColor === JANGGI_CHO ? r : 9 - r;
  }
  function toDisplayCol(c) {
    return config.playerColor === JANGGI_CHO ? c : 8 - c;
  }
  function fromDisplayRow(dr) {
    return config.playerColor === JANGGI_CHO ? dr : 9 - dr;
  }
  function fromDisplayCol(dc) {
    return config.playerColor === JANGGI_CHO ? dc : 8 - dc;
  }

  function getPixelCoord(r, c) {
    const dr = toDisplayRow(r);
    const dc = toDisplayCol(c);
    return {
      x: marginX + dc * cellW,
      y: marginY + dr * cellH
    };
  }

  function getBoardCoord(px, py) {
    const dc = Math.round((px - marginX) / cellW);
    const dr = Math.round((py - marginY) / cellH);
    if (dr >= 0 && dr < 10 && dc >= 0 && dc < 9) {
      const clickDist = Math.hypot(px - (marginX + dc * cellW), py - (marginY + dr * cellH));
      if (clickDist < cellW * 0.48) {
        return { r: fromDisplayRow(dr), c: fromDisplayCol(dc) };
      }
    }
    return null;
  }

  // ----------------------------------------------------
  // Canvas Rendering
  // ----------------------------------------------------
  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Board wood background
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#e2aa68');
    bgGrad.addColorStop(1, '#be823c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Board outer border
    ctx.strokeStyle = '#432d16';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(marginX - 6, marginY - 6, (9 - 1) * cellW + 12, (10 - 1) * cellH + 12);

    // Grid lines
    ctx.strokeStyle = '#50351b';
    ctx.lineWidth = 1.2;

    // Horizontal lines (10)
    for (let r = 0; r < 10; r++) {
      const y = marginY + r * cellH;
      ctx.beginPath();
      ctx.moveTo(marginX, y);
      ctx.lineTo(marginX + 8 * cellW, y);
      ctx.stroke();
    }

    // Vertical lines (9)
    for (let c = 0; c < 9; c++) {
      const x = marginX + c * cellW;
      ctx.beginPath();
      ctx.moveTo(x, marginY);
      ctx.lineTo(x, marginY + 9 * cellH);
      ctx.stroke();
    }

    // Palace diagonal lines
    drawPalaceDiagonals(0, 2); // Han palace
    drawPalaceDiagonals(7, 9); // Cho palace

    // Highlight last move
    if (engine.history.length > 0) {
      const last = engine.history[engine.history.length - 1];
      const ptFrom = getPixelCoord(last.fromR, last.fromC);
      const ptTo = getPixelCoord(last.toR, last.toC);

      ctx.fillStyle = 'rgba(250, 204, 21, 0.3)';
      ctx.beginPath();
      ctx.arc(ptFrom.x, ptFrom.y, cellW * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.beginPath();
      ctx.arc(ptTo.x, ptTo.y, cellW * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw pieces
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = engine.board[r][c];
        if (piece) {
          const isSelected = selectedSquare && selectedSquare.r === r && selectedSquare.c === c;
          drawPiece(r, c, piece, isSelected);
        }
      }
    }

    // Draw legal move hints
    if (config.showHints && legalMovesForSelected.length > 0) {
      for (const m of legalMovesForSelected) {
        const pt = getPixelCoord(m.toR, m.toC);
        const target = engine.board[m.toR][m.toC];

        ctx.save();
        if (target) {
          // Capture hint: red ring
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, cellW * 0.38, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Move hint: green circle
          ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, cellW * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  function drawPalaceDiagonals(startR, endR) {
    const pt1 = getPixelCoord(startR, 3);
    const pt2 = getPixelCoord(endR, 5);
    const pt3 = getPixelCoord(startR, 5);
    const pt4 = getPixelCoord(endR, 3);

    ctx.strokeStyle = '#50351b';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pt3.x, pt3.y);
    ctx.lineTo(pt4.x, pt4.y);
    ctx.stroke();
  }

  function drawPiece(r, c, piece, isSelected) {
    const pt = getPixelCoord(r, c);
    const isKing = piece.t === 'k';
    const radius = isKing ? cellW * 0.44 : cellW * 0.38;

    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Piece wooden token
    const grad = ctx.createRadialGradient(
      pt.x - radius * 0.3, pt.y - radius * 0.3, radius * 0.1,
      pt.x, pt.y, radius
    );
    grad.addColorStop(0, '#fff4e0');
    grad.addColorStop(0.7, '#f3d9b1');
    grad.addColorStop(1, '#d8b27c');

    ctx.fillStyle = grad;
    ctx.beginPath();
    // Draw 8-sided rounded polygon
    const sides = 8;
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides;
      const px = pt.x + radius * Math.cos(angle);
      const py = pt.y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Piece border
    ctx.strokeStyle = isSelected ? '#ffd700' : '#8c6130';
    ctx.lineWidth = isSelected ? 3.5 : 1.5;
    ctx.stroke();

    ctx.restore();

    // Hanja Text
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${isKing ? cellW * 0.44 : cellW * 0.38}px 'Batang', 'Songti SC', 'Pretendard', serif`;

    const label = hanjaLabels[piece.color][piece.t] || '';
    if (piece.color === JANGGI_CHO) {
      ctx.fillStyle = '#1e40af'; // Blue for Cho
    } else {
      ctx.fillStyle = '#b91c1c'; // Red for Han
    }
    ctx.fillText(label, pt.x, pt.y + 1);

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

    const sq = getBoardCoord(clickX, clickY);
    if (!sq) return;

    // Check if moving selected piece
    if (selectedSquare) {
      const isLegal = legalMovesForSelected.some(m => m.toR === sq.r && m.toC === sq.c);
      if (isLegal) {
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

        triggerAiTurn();
        return;
      }
    }

    // Select piece
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

    let earnedCoins = 0;
    if (isPlayerWin) {
      earnedCoins = COIN_REWARDS[config.difficulty] || 300;
      if (config.soundEnabled && typeof soundManager !== 'undefined') {
        soundManager.playWinSound();
      }
      resultEmoji.textContent = '👑';
      resultTitle.textContent = '장군! 승리하였습니다!';
      resultDetail.textContent = `상대 궁을 함락시키고 완승을 거두었습니다! (+${earnedCoins}🪙)`;
      resultCoinReward.style.display = 'block';
      resEarnedCoins.textContent = `+${earnedCoins}`;

      try {
        await authManager.recordGame({
          gameType: 'janggi',
          result: 'win',
          difficulty: config.difficulty,
          moves: engine.history.length
        });
      } catch (e) {}
    } else {
      if (config.soundEnabled && typeof soundManager !== 'undefined') {
        soundManager.playLoseSound();
      }
      resultEmoji.textContent = '😢';
      resultTitle.textContent = '외통! 패배하였습니다';
      resultDetail.textContent = '내 궁이 잡히고 말았습니다. 다음 판에 복수하세요!';
      resultCoinReward.style.display = 'none';

      try {
        await authManager.recordGame({
          gameType: 'janggi',
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

    const isChoTurn = engine.turn === JANGGI_CHO;
    playerRowCho.classList.toggle('active', isChoTurn);
    playerRowHan.classList.toggle('active', !isChoTurn);

    if (config.playerColor === JANGGI_CHO) {
      nameCho.textContent = '나 (초 - 楚)';
      nameHan.textContent = `AI 장기 (${diffNames[config.difficulty]})`;
    } else {
      nameCho.textContent = `AI 장기 (${diffNames[config.difficulty]})`;
      nameHan.textContent = '나 (한 - 漢)';
    }

    if (engine.isGameOver) {
      turnStatusText.textContent = '대국이 종료되었습니다.';
    } else if (isAiThinking) {
      turnStatusText.textContent = 'AI가 최선의 장기수를 계산 중입니다...';
    } else if (engine.turn === config.playerColor) {
      turnStatusText.textContent = '내 차례입니다. 기물을 클릭하세요.';
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

    if (config.playerColor === JANGGI_HAN) {
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
