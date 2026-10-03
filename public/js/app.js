// Baduk Master - Canvas Renderer & Main Application Controller
// Features: Complete Go rules, 4 AI Difficulties, Win on AI no moves, Coin rewards, Skin Shop

document.addEventListener('DOMContentLoaded', () => {
  const _BLACK = (typeof window !== 'undefined' && window.BLACK !== undefined) ? window.BLACK : 1;
  const _WHITE = (typeof window !== 'undefined' && window.WHITE !== undefined) ? window.WHITE : 2;
  const Engine = (typeof window !== 'undefined' && window.BadukEngine) ? window.BadukEngine : BadukEngine;
  const AI = (typeof window !== 'undefined' && window.BadukAI) ? window.BadukAI : BadukAI;

  // Game Configuration State
  let config = {
    difficulty: 'normal', // 'easy' | 'normal' | 'hard' | 'max'
    boardSize: 19,
    playerColor: _BLACK,
    showMoveNumbers: false,
    soundEnabled: true
  };

  // State
  let engine = new Engine(config.boardSize, 6.5);
  let ai = new AI(config.difficulty);
  let isAiThinking = false;
  let hoverCoord = null;
  let territoryEstimate = null;

  // DOM Elements
  const canvas = document.getElementById('badukCanvas');
  const ctx = canvas.getContext('2d');

  // Headers & Auth
  const guestSection = document.getElementById('guestSection');
  const userSection = document.getElementById('userSection');
  const headerAvatar = document.getElementById('headerAvatar');
  const headerUserName = document.getElementById('headerUserName');
  const headerUserRecord = document.getElementById('headerUserRecord');
  const headerCoins = document.getElementById('headerCoins');
  const btnOpenAuthModal = document.getElementById('btnOpenAuthModal');
  const btnOpenProfileModal = document.getElementById('btnOpenProfileModal');
  const btnOpenHistoryModal = document.getElementById('btnOpenHistoryModal');
  const btnOpenShopModal = document.getElementById('btnOpenShopModal');
  const btnLogout = document.getElementById('btnLogout');
  const btnOpenNewGameModal = document.getElementById('btnOpenNewGameModal');
  const btnLogo = document.getElementById('btnLogo');

  // In-Game UI
  const currentDiffBadge = document.getElementById('currentDiffBadge');
  const playerRowBlack = document.getElementById('playerRowBlack');
  const playerRowWhite = document.getElementById('playerRowWhite');
  const nameBlack = document.getElementById('nameBlack');
  const nameWhite = document.getElementById('nameWhite');
  const roleBlack = document.getElementById('roleBlack');
  const roleWhite = document.getElementById('roleWhite');
  const capturesBlack = document.getElementById('capturesBlack');
  const capturesWhite = document.getElementById('capturesWhite');
  const turnStatusBanner = document.getElementById('turnStatusBanner');
  const turnStatusText = document.getElementById('turnStatusText');
  const btnPass = document.getElementById('btnPass');
  const btnUndo = document.getElementById('btnUndo');
  const btnEstimate = document.getElementById('btnEstimate');
  const btnResign = document.getElementById('btnResign');
  const chkShowMoveNumbers = document.getElementById('chkShowMoveNumbers');
  const chkSound = document.getElementById('chkSound');

  // Modals
  const modalNewGame = document.getElementById('modalNewGame');
  const modalAuth = document.getElementById('modalAuth');
  const modalResult = document.getElementById('modalResult');
  const modalHistory = document.getElementById('modalHistory');
  const modalShop = document.getElementById('modalShop');

  // Modal New Game controls
  const diffSelection = document.getElementById('diffSelection');
  const sizeSelection = document.getElementById('sizeSelection');
  const colorSelection = document.getElementById('colorSelection');
  const btnStartGame = document.getElementById('btnStartGame');

  // Modal Auth controls
  const tabBtnLogin = document.getElementById('tabBtnLogin');
  const tabBtnRegister = document.getElementById('tabBtnRegister');
  const formLogin = document.getElementById('formLogin');
  const formRegister = document.getElementById('formRegister');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');
  const regUsername = document.getElementById('regUsername');
  const regNickname = document.getElementById('regNickname');
  const regPassword = document.getElementById('regPassword');
  const regError = document.getElementById('regError');

  // Modal Result controls
  const resultEmoji = document.getElementById('resultEmoji');
  const resultTitle = document.getElementById('resultTitle');
  const resultDetail = document.getElementById('resultDetail');
  const resultScoreBreakdown = document.getElementById('resultScoreBreakdown');
  const resBlackTotal = document.getElementById('resBlackTotal');
  const resWhiteTotal = document.getElementById('resWhiteTotal');
  const resultCoinReward = document.getElementById('resultCoinReward');
  const resEarnedCoins = document.getElementById('resEarnedCoins');
  const btnResultNewGame = document.getElementById('btnResultNewGame');

  // Modal History controls
  const statTotalGames = document.getElementById('statTotalGames');
  const statWinLoss = document.getElementById('statWinLoss');
  const statWinRate = document.getElementById('statWinRate');
  const statDiffEasy = document.getElementById('statDiffEasy');
  const statDiffNormal = document.getElementById('statDiffNormal');
  const statDiffHard = document.getElementById('statDiffHard');
  const statDiffMax = document.getElementById('statDiffMax');
  const historyListContainer = document.getElementById('historyListContainer');

  // Modal Shop controls
  const tabShopBoards = document.getElementById('tabShopBoards');
  const tabShopStones = document.getElementById('tabShopStones');
  const shopBoardsContainer = document.getElementById('shopBoardsContainer');
  const shopStonesContainer = document.getElementById('shopStonesContainer');
  const shopMyCoins = document.getElementById('shopMyCoins');

  // ----------------------------------------------------
  // Board & Skin Themes
  // ----------------------------------------------------
  const BOARD_THEMES = {
    kaya: {
      name: '전통 비자목',
      bgGrad: ['#e4ab65', '#d39850', '#c0843e'],
      grainColor: 'rgba(150, 80, 20, 0.08)',
      lineColor: '#432d16',
      starColor: '#3e2a14',
      borderColor: '#3e2a14'
    },
    ebony: {
      name: '흑단목 다크우드',
      bgGrad: ['#232220', '#181715', '#100f0e'],
      grainColor: 'rgba(255, 215, 0, 0.03)',
      lineColor: '#c5a059',
      starColor: '#ffd700',
      borderColor: '#d4af37'
    },
    emerald: {
      name: '에메랄드 옥석',
      bgGrad: ['#164e3f', '#0f382d', '#08231c'],
      grainColor: 'rgba(255, 255, 255, 0.06)',
      lineColor: '#7fe3c5',
      starColor: '#e0faf2',
      borderColor: '#60d9b5'
    },
    sakura: {
      name: '벚꽃 핑크우드',
      bgGrad: ['#f2c2c6', '#e09ea5', '#ce828b'],
      grainColor: 'rgba(255, 245, 245, 0.15)',
      lineColor: '#632c32',
      starColor: '#521d23',
      borderColor: '#6e3137'
    },
    neon: {
      name: '사이버 네온',
      bgGrad: ['#140e36', '#090620', '#03020c'],
      grainColor: 'rgba(0, 242, 254, 0.04)',
      lineColor: '#00f2fe',
      starColor: '#ff0844',
      borderColor: '#4facfe'
    }
  };

  // ----------------------------------------------------
  // Board Rendering Constants
  // ----------------------------------------------------
  let boardMargin = 32;
  let cellSize = 0;

  function updateDimensions() {
    const size = canvas.width; // 580
    boardMargin = config.boardSize === 19 ? 28 : config.boardSize === 13 ? 34 : 40;
    cellSize = (size - boardMargin * 2) / (config.boardSize - 1);
  }

  function getPixelCoord(r, c) {
    return {
      x: boardMargin + c * cellSize,
      y: boardMargin + r * cellSize
    };
  }

  function getBoardCoord(pixelX, pixelY) {
    const c = Math.round((pixelX - boardMargin) / cellSize);
    const r = Math.round((pixelY - boardMargin) / cellSize);
    if (r >= 0 && r < config.boardSize && c >= 0 && c < config.boardSize) {
      return { r, c };
    }
    return null;
  }

  // ----------------------------------------------------
  // Canvas Draw Functions with Skins
  // ----------------------------------------------------
  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const equipped = authManager.getEquipped();
    const boardSkinKey = equipped.board || 'kaya';
    const stoneSkinKey = equipped.stone || 'classic';
    const theme = BOARD_THEMES[boardSkinKey] || BOARD_THEMES.kaya;

    // 1. Board Background
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, theme.bgGrad[0]);
    grad.addColorStop(0.5, theme.bgGrad[1]);
    grad.addColorStop(1, theme.bgGrad[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle texture lines
    ctx.strokeStyle = theme.grainColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.height; i += 6) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i + Math.sin(i * 0.1) * 3);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(boardMargin, boardMargin, canvas.width - boardMargin * 2, canvas.height - boardMargin * 2);

    // 2. Grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.lineColor;

    for (let i = 0; i < config.boardSize; i++) {
      const y = boardMargin + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(boardMargin, y);
      ctx.lineTo(canvas.width - boardMargin, y);
      ctx.stroke();

      const x = boardMargin + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, boardMargin);
      ctx.lineTo(x, canvas.height - boardMargin);
      ctx.stroke();
    }

    // 3. Star points (Hoshi)
    const starPoints = getStarPoints(config.boardSize);
    ctx.fillStyle = theme.starColor;
    for (const [sr, sc] of starPoints) {
      const p = getPixelCoord(sr, sc);
      ctx.beginPath();
      ctx.arc(p.x, p.y, config.boardSize === 19 ? 3.5 : 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Territory markers if estimated
    if (territoryEstimate && territoryEstimate.territoryMap) {
      for (let r = 0; r < config.boardSize; r++) {
        for (let c = 0; c < config.boardSize; c++) {
          const owner = territoryEstimate.territoryMap[r][c];
          if (owner !== EMPTY) {
            const p = getPixelCoord(r, c);
            ctx.fillStyle = owner === _BLACK ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.65)';
            const sq = cellSize * 0.35;
            ctx.fillRect(p.x - sq / 2, p.y - sq / 2, sq, sq);
          }
        }
      }
    }

    // 5. Stones
    const stoneRadius = (cellSize * 0.94) / 2;
    for (let r = 0; r < config.boardSize; r++) {
      for (let c = 0; c < config.boardSize; c++) {
        const color = engine.board[r][c];
        if (color !== EMPTY) {
          const p = getPixelCoord(r, c);
          drawStoneWithSkin(ctx, p.x, p.y, stoneRadius, color, stoneSkinKey);
        }
      }
    }

    // 6. Move numbers
    if (config.showMoveNumbers && engine.history.length > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.max(10, Math.round(cellSize * 0.38))}px Pretendard, sans-serif`;

      const moveMap = new Map();
      engine.history.forEach((h, idx) => {
        if (h.lastMove && !h.lastMove.pass) {
          moveMap.set(`${h.lastMove.r},${h.lastMove.c}`, idx);
        }
      });
      if (engine.lastMove && !engine.lastMove.pass) {
        moveMap.set(`${engine.lastMove.r},${engine.lastMove.c}`, engine.history.length);
      }

      for (let r = 0; r < config.boardSize; r++) {
        for (let c = 0; c < config.boardSize; c++) {
          const color = engine.board[r][c];
          if (color !== EMPTY && moveMap.has(`${r},${c}`)) {
            const num = moveMap.get(`${r},${c}`);
            const p = getPixelCoord(r, c);
            ctx.fillStyle = color === _BLACK ? '#ffffff' : '#111111';
            ctx.fillText(num.toString(), p.x, p.y);
          }
        }
      }
    }

    // 7. Last move indicator
    if (engine.lastMove && !engine.lastMove.pass) {
      const p = getPixelCoord(engine.lastMove.r, engine.lastMove.c);
      ctx.strokeStyle = engine.lastMove.color === _BLACK ? '#f59e0b' : '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, stoneRadius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 8. Hover ghost stone
    if (hoverCoord && !engine.isGameOver && !isAiThinking && engine.turn === config.playerColor) {
      const { r, c } = hoverCoord;
      if (engine.board[r][c] === EMPTY) {
        const validRes = engine.isValidMove(r, c, config.playerColor);
        const p = getPixelCoord(r, c);
        if (validRes.valid) {
          ctx.save();
          ctx.globalAlpha = 0.55;
          drawStoneWithSkin(ctx, p.x, p.y, stoneRadius, config.playerColor, stoneSkinKey);
          ctx.restore();
        } else {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          const sz = stoneRadius * 0.45;
          ctx.beginPath();
          ctx.moveTo(p.x - sz, p.y - sz);
          ctx.lineTo(p.x + sz, p.y + sz);
          ctx.moveTo(p.x + sz, p.y - sz);
          ctx.lineTo(p.x - sz, p.y + sz);
          ctx.stroke();
        }
      }
    }
  }

  function drawStoneWithSkin(targetCtx, x, y, radius, color, skinKey) {
    targetCtx.save();

    // Drop Shadow
    targetCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    targetCtx.shadowBlur = 8;
    targetCtx.shadowOffsetX = 3;
    targetCtx.shadowOffsetY = 3;

    targetCtx.beginPath();
    targetCtx.arc(x, y, radius, 0, Math.PI * 2);

    const isBlack = color === _BLACK;

    if (skinKey === 'metal') {
      // Gold & Silver Metal
      if (isBlack) {
        // 24K Gold
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.05, x, y, radius);
        radGrad.addColorStop(0, '#fff4cc');
        radGrad.addColorStop(0.3, '#ffd700');
        radGrad.addColorStop(0.7, '#cc9900');
        radGrad.addColorStop(1, '#664d00');
        targetCtx.fillStyle = radGrad;
      } else {
        // Chrome Silver
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.05, x, y, radius);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.4, '#e2e8f0');
        radGrad.addColorStop(0.8, '#94a3b8');
        radGrad.addColorStop(1, '#475569');
        targetCtx.fillStyle = radGrad;
      }
    } else if (skinKey === 'gemstone') {
      // Ruby & Sapphire
      if (isBlack) {
        // Crimson Ruby
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        radGrad.addColorStop(0, '#ff758f');
        radGrad.addColorStop(0.4, '#c9184a');
        radGrad.addColorStop(0.8, '#800f2f');
        radGrad.addColorStop(1, '#3b0413');
        targetCtx.fillStyle = radGrad;
      } else {
        // Cobalt Sapphire
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        radGrad.addColorStop(0, '#caf0f8');
        radGrad.addColorStop(0.3, '#0096c7');
        radGrad.addColorStop(0.7, '#023e8a');
        radGrad.addColorStop(1, '#03045e');
        targetCtx.fillStyle = radGrad;
      }
    } else if (skinKey === 'neon') {
      // Cyber Neon Glow
      if (isBlack) {
        // Neon Hot Pink
        targetCtx.shadowColor = '#ff007f';
        targetCtx.shadowBlur = 14;
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        radGrad.addColorStop(0, '#ffb3d9');
        radGrad.addColorStop(0.5, '#ff007f');
        radGrad.addColorStop(1, '#660033');
        targetCtx.fillStyle = radGrad;
      } else {
        // Neon Electric Cyan
        targetCtx.shadowColor = '#00f2fe';
        targetCtx.shadowBlur = 14;
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        radGrad.addColorStop(0, '#e6ffff');
        radGrad.addColorStop(0.5, '#00f2fe');
        radGrad.addColorStop(1, '#004d66');
        targetCtx.fillStyle = radGrad;
      }
    } else if (skinKey === 'galaxy') {
      // Cosmic Galaxy
      if (isBlack) {
        // Deep Nebula Purple
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        radGrad.addColorStop(0, '#c77dff');
        radGrad.addColorStop(0.4, '#7b2cbf');
        radGrad.addColorStop(0.8, '#240046');
        radGrad.addColorStop(1, '#0d001a');
        targetCtx.fillStyle = radGrad;
      } else {
        // Opal Stardust White
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.4, '#e0aaff');
        radGrad.addColorStop(0.8, '#9d4edd');
        radGrad.addColorStop(1, '#5a189a');
        targetCtx.fillStyle = radGrad;
      }
    } else {
      // Classic Shell & Slate
      if (isBlack) {
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        radGrad.addColorStop(0, '#555555');
        radGrad.addColorStop(0.3, '#2b2b2b');
        radGrad.addColorStop(1, '#111111');
        targetCtx.fillStyle = radGrad;
      } else {
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.05, x, y, radius);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.7, '#e4e7eb');
        radGrad.addColorStop(1, '#c8cbd0');
        targetCtx.fillStyle = radGrad;
      }
    }

    targetCtx.fill();
    targetCtx.restore();
  }

  function getStarPoints(size) {
    if (size === 19) {
      return [
        [3, 3], [3, 9], [3, 15],
        [9, 3], [9, 9], [9, 15],
        [15, 3], [15, 9], [15, 15]
      ];
    } else if (size === 13) {
      return [
        [3, 3], [3, 9],
        [6, 6],
        [9, 3], [9, 9]
      ];
    } else if (size === 9) {
      return [
        [2, 2], [2, 6],
        [4, 4],
        [6, 2], [6, 6]
      ];
    }
    return [];
  }

  // ----------------------------------------------------
  // Game Actions & Turns
  // ----------------------------------------------------
  function updateUI() {
    capturesBlack.textContent = engine.captures[_BLACK];
    capturesWhite.textContent = engine.captures[_WHITE];

    if (engine.turn === _BLACK) {
      playerRowBlack.classList.add('active-turn');
      playerRowWhite.classList.remove('active-turn');
    } else {
      playerRowWhite.classList.add('active-turn');
      playerRowBlack.classList.remove('active-turn');
    }

    if (engine.isGameOver) {
      turnStatusText.innerHTML = `<strong>대국 종료:</strong> ${engine.winReason || '종료됨'}`;
    } else if (isAiThinking) {
      turnStatusText.innerHTML = `인공지능이 수를 생각하고 있습니다 <div class="ai-thinking-dots"><span></span><span></span><span></span></div>`;
    } else if (engine.turn === config.playerColor) {
      turnStatusText.textContent = '당신의 착수 차례입니다.';
    } else {
      turnStatusText.textContent = '인공지능의 차례입니다.';
    }

    const diffNames = {
      easy: { text: '쉬움 난이도 (+100🪙)', cls: 'diff-easy' },
      normal: { text: '보통 난이도 (+300🪙)', cls: 'diff-normal' },
      hard: { text: '어려움 난이도 (+800🪙)', cls: 'diff-hard' },
      max: { text: '최대 난이도 (+2000🪙)', cls: 'diff-max' }
    };
    const curDiff = diffNames[config.difficulty] || diffNames.normal;
    currentDiffBadge.textContent = curDiff.text;
    currentDiffBadge.className = `difficulty-badge ${curDiff.cls}`;

    const isPlayerBlack = config.playerColor === _BLACK;
    const userName = authManager.user ? authManager.user.nickname : '나';

    nameBlack.textContent = isPlayerBlack ? `${userName} (흑)` : '인공지능 (흑)';
    roleBlack.textContent = isPlayerBlack ? '플레이어 (선착)' : 'AI';

    nameWhite.textContent = !isPlayerBlack ? `${userName} (백)` : '인공지능 (백)';
    roleWhite.textContent = !isPlayerBlack ? '플레이어 (덤 6.5집)' : 'AI (덤 6.5집)';

    // Update Header Coins
    headerCoins.textContent = authManager.getCoins();
    if (shopMyCoins) shopMyCoins.textContent = authManager.getCoins();

    drawBoard();
  }

  function handleHumanMove(r, c) {
    if (engine.isGameOver || isAiThinking || engine.turn !== config.playerColor) {
      return;
    }

    territoryEstimate = null;
    const result = engine.play(r, c, config.playerColor);
    if (!result.valid) return;

    if (result.capturedCount > 0) {
      soundManager.playCapture();
    } else {
      soundManager.playStone();
    }

    updateUI();

    if (engine.isGameOver) {
      onGameOver();
      return;
    }

    triggerAiTurn();
  }

  function triggerAiTurn() {
    isAiThinking = true;
    updateUI();

    const thinkDelay = config.difficulty === 'max' ? 550 : config.difficulty === 'hard' ? 400 : 250;

    setTimeout(() => {
      if (engine.isGameOver) {
        isAiThinking = false;
        return;
      }

      const aiColor = engine.getOpponent(config.playerColor);

      // Check if AI has legal moves! "더이상 ai가 둘수 없으면 승리하게해줘"
      const legalMoves = ai.getLegalMoves(engine, aiColor);
      if (legalMoves.length === 0) {
        engine.isGameOver = true;
        engine.winner = config.playerColor;
        engine.winReason = '인공지능(AI) 착수 불가 - 플레이어 승리!';
        isAiThinking = false;
        updateUI();
        onGameOver();
        return;
      }

      const aiMove = ai.selectMove(engine, aiColor);

      // If AI passes because it cannot find good moves -> player wins!
      if (aiMove.pass) {
        engine.isGameOver = true;
        engine.winner = config.playerColor;
        engine.winReason = '인공지능(AI) 착수 포기 - 플레이어 승리!';
        isAiThinking = false;
        soundManager.playPass();
        updateUI();
        onGameOver();
        return;
      }

      const res = engine.play(aiMove.r, aiMove.c, aiColor);
      if (res.valid) {
        if (res.capturedCount > 0) {
          soundManager.playCapture();
        } else {
          soundManager.playStone();
        }
      }

      isAiThinking = false;
      updateUI();

      if (engine.isGameOver) {
        onGameOver();
      }
    }, thinkDelay);
  }

  function handlePass() {
    if (engine.isGameOver || isAiThinking || engine.turn !== config.playerColor) return;
    territoryEstimate = null;
    engine.pass(config.playerColor);
    soundManager.playPass();
    updateUI();

    if (engine.isGameOver) {
      onGameOver();
    } else {
      triggerAiTurn();
    }
  }

  function handleResign() {
    if (engine.isGameOver || isAiThinking) return;
    if (!confirm('정말 기권하시겠습니까? 기권 시 패배로 기록됩니다.')) return;

    engine.resign(config.playerColor);
    soundManager.playLose();
    updateUI();
    onGameOver();
  }

  function handleUndo() {
    if (engine.isGameOver || isAiThinking) return;
    if (engine.history.length < 2) {
      alert('더 이상 무를 수 없습니다.');
      return;
    }

    engine.undo();
    engine.undo();
    territoryEstimate = null;
    updateUI();
  }

  function handleEstimate() {
    if (engine.isGameOver) return;
    territoryEstimate = engine.calculateScore();
    drawBoard();

    const bTotal = territoryEstimate.black.total.toFixed(1);
    const wTotal = territoryEstimate.white.total.toFixed(1);
    const lead = territoryEstimate.winner === _BLACK ? '흑' : '백';
    const diff = territoryEstimate.diff.toFixed(1);

    alert(`[형세 분석]\n• 흑 (집: ${territoryEstimate.black.territory}, 사석: ${territoryEstimate.black.captures}) = ${bTotal}집\n• 백 (집: ${territoryEstimate.white.territory}, 사석: ${territoryEstimate.white.captures}, 덤: 6.5) = ${wTotal}집\n\n현재 ${lead}이 약 ${diff}집 앞서고 있습니다.`);
  }

  async function onGameOver() {
    const isPlayerWin = engine.winner === config.playerColor;

    const COIN_REWARDS = {
      easy: 100,
      normal: 300,
      hard: 800,
      max: 2000
    };

    if (isPlayerWin) {
      soundManager.playWin();
      resultEmoji.textContent = '🏆';
      resultTitle.textContent = '대국 승리!';
      resultTitle.style.color = '#4ade80';

      const earned = COIN_REWARDS[config.difficulty] || 300;
      resEarnedCoins.textContent = earned;
      resultCoinReward.style.display = 'block';
    } else {
      soundManager.playLose();
      resultEmoji.textContent = '😢';
      resultTitle.textContent = '대국 패배';
      resultTitle.style.color = '#f87171';
      resultCoinReward.style.display = 'none';
    }

    resultDetail.textContent = engine.winReason || '대국이 종료되었습니다.';

    if (engine.winReason && engine.winReason.includes('계가')) {
      const score = engine.calculateScore();
      resultScoreBreakdown.style.display = 'block';
      resBlackTotal.textContent = `${score.black.total.toFixed(1)}집 (집 ${score.black.territory} + 사석 ${score.black.captures})`;
      resWhiteTotal.textContent = `${score.white.total.toFixed(1)}집 (집 ${score.white.territory} + 사석 ${score.white.captures} + 덤 6.5)`;
    } else {
      resultScoreBreakdown.style.display = 'none';
    }

    openModal(modalResult);

    // Save game record to server / guest
    await authManager.recordGame({
      difficulty: config.difficulty,
      winner: engine.winner === config.playerColor ? config.playerColor : engine.getOpponent(config.playerColor),
      playerColor: config.playerColor,
      boardSize: config.boardSize,
      movesCount: engine.history.length,
      reason: engine.winReason
    });

    updateAuthDisplay();
  }

  // ----------------------------------------------------
  // Canvas Mouse Events
  // ----------------------------------------------------
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const pixelX = (e.clientX - rect.left) * scaleX;
    const pixelY = (e.clientY - rect.top) * scaleY;

    const coord = getBoardCoord(pixelX, pixelY);
    if (!hoverCoord || !coord || hoverCoord.r !== coord.r || hoverCoord.c !== coord.c) {
      hoverCoord = coord;
      drawBoard();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoverCoord = null;
    drawBoard();
  });

  canvas.addEventListener('click', () => {
    soundManager.init();
    if (hoverCoord) {
      handleHumanMove(hoverCoord.r, hoverCoord.c);
    }
  });

  // ----------------------------------------------------
  // New Game Setup
  // ----------------------------------------------------
  function startNewGame() {
    engine = new Engine(config.boardSize, 6.5);
    ai = new AI(config.difficulty);
    isAiThinking = false;
    hoverCoord = null;
    territoryEstimate = null;

    updateDimensions();
    updateUI();

    if (config.playerColor === _WHITE) {
      triggerAiTurn();
    }
  }

  function setupChoiceGroup(container, callback) {
    const cards = container.querySelectorAll('.choice-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        callback(card);
      });
    });
  }

  setupChoiceGroup(diffSelection, (card) => {
    config.difficulty = card.dataset.diff;
  });

  setupChoiceGroup(sizeSelection, (card) => {
    config.boardSize = parseInt(card.dataset.size, 10);
  });

  setupChoiceGroup(colorSelection, (card) => {
    config.playerColor = card.dataset.color === 'black' ? _BLACK : _WHITE;
  });

  btnStartGame.addEventListener('click', () => {
    closeModal(modalNewGame);
    startNewGame();
  });

  btnResultNewGame.addEventListener('click', () => {
    closeModal(modalResult);
    openModal(modalNewGame);
  });

  btnOpenNewGameModal.addEventListener('click', () => {
    openModal(modalNewGame);
  });

  // ----------------------------------------------------
  // Controls Handlers
  // ----------------------------------------------------
  btnPass.addEventListener('click', handlePass);
  btnResign.addEventListener('click', handleResign);
  btnUndo.addEventListener('click', handleUndo);
  btnEstimate.addEventListener('click', handleEstimate);

  chkShowMoveNumbers.addEventListener('change', (e) => {
    config.showMoveNumbers = e.target.checked;
    drawBoard();
  });

  chkSound.addEventListener('change', (e) => {
    config.soundEnabled = e.target.checked;
    soundManager.muted = !e.target.checked;
  });

  // ----------------------------------------------------
  // Modal Management
  // ----------------------------------------------------
  function openModal(modal) {
    modal.classList.add('active');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) closeModal(modal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // ----------------------------------------------------
  // Auth & Profile Management
  // ----------------------------------------------------
  btnOpenAuthModal.addEventListener('click', () => {
    openModal(modalAuth);
  });

  tabBtnLogin.addEventListener('click', () => {
    tabBtnLogin.classList.add('active');
    tabBtnRegister.classList.remove('active');
    formLogin.style.display = 'block';
    formRegister.style.display = 'none';
  });

  tabBtnRegister.addEventListener('click', () => {
    tabBtnRegister.classList.add('active');
    tabBtnLogin.classList.remove('active');
    formRegister.style.display = 'block';
    formLogin.style.display = 'none';
  });

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    try {
      await authManager.login(loginUsername.value.trim(), loginPassword.value);
      closeModal(modalAuth);
      loginUsername.value = '';
      loginPassword.value = '';
      updateAuthDisplay();
    } catch (err) {
      loginError.textContent = err.message;
    }
  });

  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    regError.textContent = '';
    try {
      await authManager.register(
        regUsername.value.trim(),
        regPassword.value,
        regNickname.value.trim()
      );
      closeModal(modalAuth);
      regUsername.value = '';
      regNickname.value = '';
      regPassword.value = '';
      updateAuthDisplay();
    } catch (err) {
      regError.textContent = err.message;
    }
  });

  btnLogout.addEventListener('click', async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await authManager.logout();
      updateAuthDisplay();
    }
  });

  function updateAuthDisplay() {
    const user = authManager.user;
    if (user) {
      guestSection.style.display = 'none';
      userSection.style.display = 'flex';
      headerAvatar.textContent = user.nickname ? user.nickname[0].toUpperCase() : 'U';
      headerUserName.textContent = user.nickname || user.username;

      const wins = user.stats ? user.stats.wins : 0;
      const losses = user.stats ? user.stats.losses : 0;
      headerUserRecord.textContent = `${wins}승 ${losses}패`;
    } else {
      guestSection.style.display = 'flex';
      userSection.style.display = 'none';
    }
    updateUI();
  }

  authManager.onUserChange(() => updateAuthDisplay());

  // ----------------------------------------------------
  // Skin Shop System
  // ----------------------------------------------------
  const SHOP_ITEMS_CATALOG = {
    boards: [
      { id: 'kaya', name: '전통 비자목', desc: '따뜻한 황금빛 나뭇결의 최고급 전통 바둑판', price: 0 },
      { id: 'ebony', name: '흑단목 다크우드', desc: '중후하고 세련된 블랙 우드와 골드 라인', price: 500 },
      { id: 'emerald', name: '에메랄드 옥석', desc: '신비롭고 맑은 비취색 대리석 바둑판', price: 1200 },
      { id: 'sakura', name: '벚꽃 핑크우드', desc: '화사하고 부드러운 벚꽃빛 원목 바둑판', price: 1500 },
      { id: 'neon', name: '사이버 네온', desc: '미래형 사이버펑크 감성의 발광 네온 그리드', price: 2500 }
    ],
    stones: [
      { id: 'classic', name: '전통 조개 & 오석', desc: '묵직한 흑요석과 영롱한 백조개알의 전통 바둑돌', price: 0 },
      { id: 'metal', name: '골드 & 실버 메탈', desc: '황금빛 24K 골드와 눈부신 크롬 실버 메탈릭 돌', price: 600 },
      { id: 'gemstone', name: '루비 & 사파이어', desc: '불꽃의 붉은 루비와 푸른 바다빛 사파이어 보석', price: 1500 },
      { id: 'neon', name: '네온 사이버 글로우', desc: '어둠 속에서 찬란하게 빛나는 네온 발광 돌', price: 2200 },
      { id: 'galaxy', name: '갤럭시 코스믹 별빛', desc: '우주 은하수와 별빛을 머금은 신비로운 돌', price: 3500 }
    ]
  };

  function renderShop() {
    shopMyCoins.textContent = authManager.getCoins();
    const inventory = authManager.getInventory();
    const equipped = authManager.getEquipped();

    // 1. Render Boards
    shopBoardsContainer.innerHTML = '';
    SHOP_ITEMS_CATALOG.boards.forEach(item => {
      const isOwned = inventory.boards.includes(item.id) || item.price === 0;
      const isEquipped = equipped.board === item.id;
      const card = createShopCard('board', item, isOwned, isEquipped);
      shopBoardsContainer.appendChild(card);
    });

    // 2. Render Stones
    shopStonesContainer.innerHTML = '';
    SHOP_ITEMS_CATALOG.stones.forEach(item => {
      const isOwned = inventory.stones.includes(item.id) || item.price === 0;
      const isEquipped = equipped.stone === item.id;
      const card = createShopCard('stone', item, isOwned, isEquipped);
      shopStonesContainer.appendChild(card);
    });
  }

  function createShopCard(type, item, isOwned, isEquipped) {
    const card = document.createElement('div');
    card.className = `shop-card ${isEquipped ? 'equipped' : ''}`;

    // Mini Preview Canvas
    const previewCanvas = document.createElement('canvas');
    previewCanvas.className = 'shop-preview-canvas';
    previewCanvas.width = 120;
    previewCanvas.height = 90;
    drawMiniPreview(previewCanvas, type, item.id);

    // Title & Desc
    const title = document.createElement('div');
    title.className = 'shop-item-name';
    title.textContent = item.name;

    const desc = document.createElement('div');
    desc.className = 'shop-item-desc';
    desc.textContent = item.desc;

    // Bottom Action Area
    const bottom = document.createElement('div');
    bottom.className = 'shop-item-bottom';

    const priceTag = document.createElement('div');
    priceTag.className = 'shop-item-price';
    priceTag.innerHTML = isOwned ? '<span style="color:#4ade80;">보유 중</span>' : `🪙 ${item.price}`;

    let actionBtn;
    if (isEquipped) {
      actionBtn = document.createElement('span');
      actionBtn.className = 'equipped-tag';
      actionBtn.textContent = '장착 중';
    } else if (isOwned) {
      actionBtn = document.createElement('button');
      actionBtn.className = 'btn btn-secondary shop-btn';
      actionBtn.textContent = '장착하기';
      actionBtn.addEventListener('click', async () => {
        try {
          await authManager.equipSkin(type, item.id);
          renderShop();
          drawBoard();
        } catch (e) {
          alert(e.message);
        }
      });
    } else {
      actionBtn = document.createElement('button');
      actionBtn.className = 'btn btn-primary shop-btn';
      actionBtn.textContent = '구매';
      actionBtn.addEventListener('click', async () => {
        try {
          await authManager.buySkin(type, item.id, item.price);
          alert(`${item.name} 스킨을 구매하여 장착했습니다!`);
          renderShop();
          drawBoard();
        } catch (e) {
          alert(e.message);
        }
      });
    }

    bottom.appendChild(priceTag);
    bottom.appendChild(actionBtn);

    card.appendChild(previewCanvas);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(bottom);

    return card;
  }

  function drawMiniPreview(pCanvas, type, id) {
    const pCtx = pCanvas.getContext('2d');
    const w = pCanvas.width;
    const h = pCanvas.height;

    if (type === 'board') {
      const theme = BOARD_THEMES[id] || BOARD_THEMES.kaya;
      const grad = pCtx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, theme.bgGrad[0]);
      grad.addColorStop(0.5, theme.bgGrad[1]);
      grad.addColorStop(1, theme.bgGrad[2]);
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, w, h);

      // Mini Grid
      pCtx.strokeStyle = theme.lineColor;
      pCtx.lineWidth = 1;
      for (let x = 15; x < w; x += 22) {
        pCtx.beginPath();
        pCtx.moveTo(x, 10);
        pCtx.lineTo(x, h - 10);
        pCtx.stroke();
      }
      for (let y = 15; y < h; y += 22) {
        pCtx.beginPath();
        pCtx.moveTo(10, y);
        pCtx.lineTo(w - 10, y);
        pCtx.stroke();
      }

      // 2 Demo Stones
      drawStoneWithSkin(pCtx, 45, 45, 12, _BLACK, 'classic');
      drawStoneWithSkin(pCtx, 75, 45, 12, _WHITE, 'classic');
    } else {
      // Stone preview on neutral wood background
      pCtx.fillStyle = '#caa169';
      pCtx.fillRect(0, 0, w, h);

      // Grid line
      pCtx.strokeStyle = '#432d16';
      pCtx.lineWidth = 1;
      pCtx.beginPath();
      pCtx.moveTo(20, h / 2);
      pCtx.lineTo(w - 20, h / 2);
      pCtx.moveTo(40, 15);
      pCtx.lineTo(40, h - 15);
      pCtx.moveTo(80, 15);
      pCtx.lineTo(80, h - 15);
      pCtx.stroke();

      drawStoneWithSkin(pCtx, 40, h / 2, 17, _BLACK, id);
      drawStoneWithSkin(pCtx, 80, h / 2, 17, _WHITE, id);
    }
  }

  btnOpenShopModal.addEventListener('click', () => {
    renderShop();
    openModal(modalShop);
  });

  tabShopBoards.addEventListener('click', () => {
    tabShopBoards.classList.add('active');
    tabShopStones.classList.remove('active');
    shopBoardsContainer.style.display = 'grid';
    shopStonesContainer.style.display = 'none';
  });

  tabShopStones.addEventListener('click', () => {
    tabShopStones.classList.add('active');
    tabShopBoards.classList.remove('active');
    shopStonesContainer.style.display = 'grid';
    shopBoardsContainer.style.display = 'none';
  });

  // History modal
  async function showHistoryModal() {
    const user = authManager.user;
    if (!user) {
      openModal(modalAuth);
      return;
    }

    const stats = user.stats || { total: 0, wins: 0, losses: 0, byDifficulty: {} };
    statTotalGames.textContent = stats.total;
    statWinLoss.textContent = `${stats.wins}승 ${stats.losses}패`;
    const rate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;
    statWinRate.textContent = `${rate}%`;

    const diffs = stats.byDifficulty || {};
    statDiffEasy.textContent = `${diffs.easy ? diffs.easy.wins : 0}승 ${diffs.easy ? diffs.easy.losses : 0}패`;
    statDiffNormal.textContent = `${diffs.normal ? diffs.normal.wins : 0}승 ${diffs.normal ? diffs.normal.losses : 0}패`;
    statDiffHard.textContent = `${diffs.hard ? diffs.hard.wins : 0}승 ${diffs.hard ? diffs.hard.losses : 0}패`;
    statDiffMax.textContent = `${diffs.max ? diffs.max.wins : 0}승 ${diffs.max ? diffs.max.losses : 0}패`;

    historyListContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">불러오는 중...</div>';
    const games = await authManager.getMyHistory();

    if (games.length === 0) {
      historyListContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;">대국 기록이 없습니다.</div>';
    } else {
      const diffKorean = { easy: '쉬움', normal: '보통', hard: '어려움', max: '최대' };
      historyListContainer.innerHTML = games.map(g => {
        const isWin = g.isWin;
        const resultClass = isWin ? 'history-win' : 'history-lose';
        const resultText = isWin ? '승리' : '패배';
        const colorText = g.playerColor === _BLACK ? '흑' : '백';
        const dateStr = new Date(g.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
        const coinsStr = g.earnedCoins ? ` (+${g.earnedCoins}🪙)` : '';

        return `
          <div class="history-item">
            <div>
              <span class="${resultClass}">[${resultText}]</span>
              <strong style="margin-left: 6px;">${diffKorean[g.difficulty] || g.difficulty}</strong>
              <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 4px;">(${g.boardSize}x${g.boardSize}, ${colorText})</span>
              <span style="color: #ffd700; font-size: 0.8rem; font-weight: bold;">${coinsStr}</span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">
              ${g.movesCount}수 • ${dateStr}
            </div>
          </div>
        `;
      }).join('');
    }

    openModal(modalHistory);
  }

  btnOpenProfileModal.addEventListener('click', showHistoryModal);
  btnOpenHistoryModal.addEventListener('click', showHistoryModal);

  // Initialize
  authManager.checkAuth();
  updateDimensions();
  startNewGame();
});
