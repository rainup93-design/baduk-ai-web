// ===================================================================
// Skin System & Shop Module for Board Games (Baduk, Omok, Lobby)
// Features: Board Skins, Stone Skins, Live Interactive Studio Preview,
// Real-time Equip & Purchase with Sound, Cross-page support
// ===================================================================

(function() {
  const BOARD_THEMES = {
    kaya: {
      id: 'kaya',
      name: '전통 비자목',
      tag: '기본',
      price: 0,
      desc: '따뜻한 황금빛 나뭇결의 최고급 전통 바둑판',
      bgGrad: ['#e4ab65', '#d39850', '#c0843e'],
      grainColor: 'rgba(150, 80, 20, 0.09)',
      lineColor: '#432d16',
      starColor: '#3e2a14',
      borderColor: '#3e2a14'
    },
    ebony: {
      id: 'ebony',
      name: '흑단목 다크우드',
      tag: '인기',
      price: 500,
      desc: '중후하고 세련된 블랙 우드와 골드 라인',
      bgGrad: ['#252422', '#1a1917', '#121110'],
      grainColor: 'rgba(255, 215, 0, 0.04)',
      lineColor: '#c5a059',
      starColor: '#ffd700',
      borderColor: '#d4af37'
    },
    emerald: {
      id: 'emerald',
      name: '에메랄드 옥석',
      tag: '고급',
      price: 1200,
      desc: '신비롭고 맑은 비취색 대리석 바둑판',
      bgGrad: ['#164e3f', '#0f382d', '#08231c'],
      grainColor: 'rgba(255, 255, 255, 0.06)',
      lineColor: '#7fe3c5',
      starColor: '#e0faf2',
      borderColor: '#60d9b5'
    },
    sakura: {
      id: 'sakura',
      name: '벚꽃 핑크우드',
      tag: '스페셜',
      price: 1500,
      desc: '화사하고 부드러운 벚꽃빛 원목 바둑판',
      bgGrad: ['#f2c2c6', '#e09ea5', '#ce828b'],
      grainColor: 'rgba(255, 245, 245, 0.15)',
      lineColor: '#632c32',
      starColor: '#521d23',
      borderColor: '#6e3137'
    },
    neon: {
      id: 'neon',
      name: '사이버 네온',
      tag: '사이버',
      price: 2500,
      desc: '미래형 사이버펑크 감성의 발광 네온 그리드',
      bgGrad: ['#140e36', '#090620', '#03020c'],
      grainColor: 'rgba(0, 242, 254, 0.05)',
      lineColor: '#00f2fe',
      starColor: '#ff0844',
      borderColor: '#4facfe'
    },
    galaxy: {
      id: 'galaxy',
      name: '은하수 코스믹',
      tag: '레전드',
      price: 3500,
      desc: '우주의 신비로운 성운과 반짝이는 별빛 바둑판',
      bgGrad: ['#1a0933', '#100522', '#080112'],
      grainColor: 'rgba(235, 130, 255, 0.06)',
      lineColor: '#c084fc',
      starColor: '#f43f5e',
      borderColor: '#a855f7'
    }
  };

  const STONE_THEMES = {
    classic: {
      id: 'classic',
      name: '전통 조개 & 오석',
      tag: '기본',
      price: 0,
      desc: '묵직한 흑요석과 영롱한 백조개알의 전통 바둑돌'
    },
    metal: {
      id: 'metal',
      name: '골드 & 실버 메탈',
      tag: '인기',
      price: 600,
      desc: '황금빛 24K 골드와 눈부신 크롬 실버 메탈릭 돌'
    },
    gemstone: {
      id: 'gemstone',
      name: '루비 & 사파이어',
      tag: '보석',
      price: 1500,
      desc: '불꽃의 붉은 루비와 푸른 바다빛 사파이어 보석'
    },
    neon: {
      id: 'neon',
      name: '네온 사이버 글로우',
      tag: '사이버',
      price: 2200,
      desc: '어둠 속에서 찬란하게 빛나는 네온 발광 돌'
    },
    galaxy: {
      id: 'galaxy',
      name: '갤럭시 코스믹 별빛',
      tag: '레전드',
      price: 3500,
      desc: '우주 은하수와 별빛을 머금은 신비로운 돌'
    },
    crystal: {
      id: 'crystal',
      name: '크리스탈 다이아몬드',
      tag: '미스틱',
      price: 4500,
      desc: '영롱하게 투과되는 다이아몬드 & 흑요석 결정체'
    }
  };

  const listeners = [];

  // Studio Interactive Preview State
  let previewBoardKey = 'kaya';
  let previewStoneKey = 'classic';
  let previewStones = []; // { r, c, color }
  let activeTab = 'boards'; // 'boards' | 'stones'

  // ----------------------------------------------------
  // Drawing Helpers
  // ----------------------------------------------------
  function drawBoardBackground(ctx, w, h, boardKey) {
    const theme = BOARD_THEMES[boardKey] || BOARD_THEMES.kaya;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, theme.bgGrad[0]);
    grad.addColorStop(0.5, theme.bgGrad[1]);
    grad.addColorStop(1, theme.bgGrad[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle grain or star effects
    if (boardKey === 'galaxy') {
      // Cosmic stardust
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      const seed = 17;
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 73 + seed) % 100) / 100 * w;
        const sy = ((i * 127 + seed) % 100) / 100 * h;
        const sr = (i % 3 === 0) ? 1.5 : 1;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = theme.grainColor;
      ctx.lineWidth = 1;
      for (let i = 0; i < h; i += 6) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i + Math.sin(i * 0.1) * 3);
        ctx.stroke();
      }
    }
    return theme;
  }

  function drawStone(targetCtx, x, y, radius, color, skinKey) {
    targetCtx.save();
    const isBlack = (color === 1 || color === 'black' || color === 'b');

    // Shadow
    targetCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    targetCtx.shadowBlur = Math.max(4, radius * 0.4);
    targetCtx.shadowOffsetX = Math.max(1.5, radius * 0.15);
    targetCtx.shadowOffsetY = Math.max(2, radius * 0.2);

    targetCtx.beginPath();
    targetCtx.arc(x, y, radius, 0, Math.PI * 2);

    if (skinKey === 'metal') {
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
      if (isBlack) {
        // Ruby
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        radGrad.addColorStop(0, '#ff758f');
        radGrad.addColorStop(0.4, '#c9184a');
        radGrad.addColorStop(0.8, '#800f2f');
        radGrad.addColorStop(1, '#3b0413');
        targetCtx.fillStyle = radGrad;
      } else {
        // Sapphire
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        radGrad.addColorStop(0, '#caf0f8');
        radGrad.addColorStop(0.3, '#0096c7');
        radGrad.addColorStop(0.7, '#023e8a');
        radGrad.addColorStop(1, '#03045e');
        targetCtx.fillStyle = radGrad;
      }
    } else if (skinKey === 'neon') {
      if (isBlack) {
        // Neon Pink
        targetCtx.shadowColor = '#ff007f';
        targetCtx.shadowBlur = Math.max(8, radius * 0.8);
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        radGrad.addColorStop(0, '#ffb3d9');
        radGrad.addColorStop(0.5, '#ff007f');
        radGrad.addColorStop(1, '#660033');
        targetCtx.fillStyle = radGrad;
      } else {
        // Electric Cyan
        targetCtx.shadowColor = '#00f2fe';
        targetCtx.shadowBlur = Math.max(8, radius * 0.8);
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        radGrad.addColorStop(0, '#e6ffff');
        radGrad.addColorStop(0.5, '#00f2fe');
        radGrad.addColorStop(1, '#004d66');
        targetCtx.fillStyle = radGrad;
      }
    } else if (skinKey === 'galaxy') {
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
    } else if (skinKey === 'crystal') {
      if (isBlack) {
        // Smokey Obsidian Crystal
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.05, x, y, radius);
        radGrad.addColorStop(0, '#94a3b8');
        radGrad.addColorStop(0.3, '#334155');
        radGrad.addColorStop(0.7, '#1e293b');
        radGrad.addColorStop(1, '#020617');
        targetCtx.fillStyle = radGrad;
      } else {
        // Prism Diamond
        targetCtx.shadowColor = '#67e8f9';
        targetCtx.shadowBlur = Math.max(6, radius * 0.5);
        const radGrad = targetCtx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.05, x, y, radius);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.3, '#ecfeff');
        radGrad.addColorStop(0.7, '#a5f3fc');
        radGrad.addColorStop(1, '#06b6d4');
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
        radGrad.addColorStop(0.2, '#f8f8f8');
        radGrad.addColorStop(0.65, '#dedede');
        radGrad.addColorStop(1, '#c0c0c0');
        targetCtx.fillStyle = radGrad;
      }
    }

    targetCtx.fill();
    targetCtx.restore();
  }

  // ----------------------------------------------------
  // Mini Item Preview
  // ----------------------------------------------------
  function drawMiniPreview(pCanvas, type, id) {
    const pCtx = pCanvas.getContext('2d');
    const w = pCanvas.width;
    const h = pCanvas.height;

    pCtx.clearRect(0, 0, w, h);

    if (type === 'board') {
      const theme = drawBoardBackground(pCtx, w, h, id);
      pCtx.strokeStyle = theme.lineColor;
      pCtx.lineWidth = 1;
      for (let x = 16; x < w; x += 22) {
        pCtx.beginPath();
        pCtx.moveTo(x, 10);
        pCtx.lineTo(x, h - 10);
        pCtx.stroke();
      }
      for (let y = 16; y < h; y += 22) {
        pCtx.beginPath();
        pCtx.moveTo(10, y);
        pCtx.lineTo(w - 10, y);
        pCtx.stroke();
      }
      // Demo stones with currently selected or classic stone
      drawStone(pCtx, 46, h / 2, 13, 1, previewStoneKey);
      drawStone(pCtx, 76, h / 2, 13, 2, previewStoneKey);
    } else {
      // Stone preview on currently selected or classic board
      const theme = drawBoardBackground(pCtx, w, h, previewBoardKey);
      pCtx.strokeStyle = theme.lineColor;
      pCtx.lineWidth = 1;
      pCtx.beginPath();
      pCtx.moveTo(20, h / 2);
      pCtx.lineTo(w - 20, h / 2);
      pCtx.moveTo(40, 12);
      pCtx.lineTo(40, h - 12);
      pCtx.moveTo(80, 12);
      pCtx.lineTo(80, h - 12);
      pCtx.stroke();

      drawStone(pCtx, 40, h / 2, 16, 1, id);
      drawStone(pCtx, 80, h / 2, 16, 2, id);
    }
  }

  // ----------------------------------------------------
  // Interactive Studio Board (Inside Shop Modal)
  // ----------------------------------------------------
  function resetStudioStones() {
    previewStones = [
      { r: 2, c: 2, color: 1 },
      { r: 2, c: 4, color: 2 },
      { r: 4, c: 2, color: 2 },
      { r: 4, c: 4, color: 1 }
    ];
  }

  function drawStudioPreview() {
    const canvas = document.getElementById('skinStudioCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const theme = drawBoardBackground(ctx, w, h, previewBoardKey);

    const gridN = 7;
    const margin = 28;
    const cell = (w - margin * 2) / (gridN - 1);

    // Border
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);

    // Lines
    ctx.strokeStyle = theme.lineColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < gridN; i++) {
      ctx.beginPath();
      ctx.moveTo(margin, margin + i * cell);
      ctx.lineTo(w - margin, margin + i * cell);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(margin + i * cell, margin);
      ctx.lineTo(margin + i * cell, h - margin);
      ctx.stroke();
    }

    // Star points
    ctx.fillStyle = theme.starColor;
    const stars = [3];
    for (const sr of stars) {
      for (const sc of stars) {
        ctx.beginPath();
        ctx.arc(margin + sc * cell, margin + sr * cell, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Placed stones
    const radius = cell * 0.44;
    for (const s of previewStones) {
      const px = margin + s.c * cell;
      const py = margin + s.r * cell;
      drawStone(ctx, px, py, radius, s.color, previewStoneKey);
    }

    // Update studio labels
    const boardMeta = BOARD_THEMES[previewBoardKey] || BOARD_THEMES.kaya;
    const stoneMeta = STONE_THEMES[previewStoneKey] || STONE_THEMES.classic;
    const labelBoard = document.getElementById('studioPreviewBoardName');
    const labelStone = document.getElementById('studioPreviewStoneName');
    if (labelBoard) labelBoard.textContent = boardMeta.name;
    if (labelStone) labelStone.textContent = stoneMeta.name;
  }

  function handleStudioCanvasClick(e) {
    const canvas = document.getElementById('skinStudioCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const gridN = 7;
    const margin = 28;
    const cell = (canvas.width - margin * 2) / (gridN - 1);

    const c = Math.round((clickX - margin) / cell);
    const r = Math.round((clickY - margin) / cell);

    if (r >= 0 && r < gridN && c >= 0 && c < gridN) {
      const existingIdx = previewStones.findIndex(s => s.r === r && s.c === c);
      if (existingIdx !== -1) {
        previewStones.splice(existingIdx, 1);
      } else {
        const lastColor = previewStones.length > 0 ? previewStones[previewStones.length - 1].color : 2;
        const nextColor = (lastColor === 1) ? 2 : 1;
        previewStones.push({ r, c, color: nextColor });
      }

      if (typeof soundManager !== 'undefined') {
        soundManager.playStoneSound();
      }
      drawStudioPreview();
    }
  }

  // ----------------------------------------------------
  // Shop Modal HTML Injection
  // ----------------------------------------------------
  function ensureShopModalExists() {
    if (document.getElementById('modalSkinShop')) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalSkinShop';
    modal.innerHTML = `
      <div class="modal-card skin-shop-modal-card">
        <!-- Header -->
        <div class="modal-header" style="margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">🛍️</span>
            <div>
              <h3 class="modal-title" style="margin: 0;">프리미엄 스킨 상점</h3>
              <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">
                승리 코인으로 다양한 보드판과 돌 스킨을 획득하세요!
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="coin-badge-header" title="보유 코인" style="padding: 6px 14px; font-size: 0.95rem;">
              <span>🪙</span>
              <strong id="shopCoinsVal">0</strong>
            </div>
            <button class="modal-close" id="btnCloseSkinShop" title="닫기">&times;</button>
          </div>
        </div>

        <!-- Studio Live Preview Area -->
        <div class="skin-studio-box">
          <div class="skin-studio-left">
            <canvas id="skinStudioCanvas" width="220" height="220" class="skin-studio-canvas" title="클릭하여 바둑알을 놓아보세요!"></canvas>
            <div class="skin-studio-hint">👆 판을 클릭하여 돌을 놓아보세요</div>
          </div>
          <div class="skin-studio-right">
            <div class="skin-studio-title">실시간 조합 미리보기</div>
            <div class="skin-studio-combos">
              <div class="skin-studio-combo-row">
                <span class="combo-label">🪵 판 스킨:</span>
                <span class="combo-val" id="studioPreviewBoardName">전통 비자목</span>
              </div>
              <div class="skin-studio-combo-row">
                <span class="combo-label">⚪⚫ 돌 스킨:</span>
                <span class="combo-val" id="studioPreviewStoneName">전통 조개 & 오석</span>
              </div>
            </div>
            <div class="skin-studio-actions">
              <button class="btn btn-secondary btn-sm" id="btnStudioResetStones">돌 비우기</button>
              <button class="btn btn-secondary btn-sm" id="btnStudioResetCombo">장착 스킨으로 초기화</button>
            </div>
          </div>
        </div>

        <!-- Category Tabs -->
        <div class="tab-headers" style="margin: 14px 0 12px 0;">
          <button class="tab-btn active" id="tabSkinShopBoards">
            🪵 바둑판 / 보드판 스킨
          </button>
          <button class="tab-btn" id="tabSkinShopStones">
            ⚪⚫ 바둑알 / 돌 스킨
          </button>
        </div>

        <!-- Cards Grids -->
        <div id="skinShopBoardsGrid" class="shop-grid"></div>
        <div id="skinShopStonesGrid" class="shop-grid" style="display: none;"></div>

        <!-- Footer / Coin Info Guide -->
        <div class="shop-footer-info">
          <span>💡 <strong>코인 획득 팁:</strong> AI 대국 승리 시 보통 +300🪙, 어려움 +800🪙, 최대 +2000🪙 획득!</span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('btnCloseSkinShop').addEventListener('click', closeShopModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeShopModal();
    });

    const tabBoards = document.getElementById('tabSkinShopBoards');
    const tabStones = document.getElementById('tabSkinShopStones');
    const gridBoards = document.getElementById('skinShopBoardsGrid');
    const gridStones = document.getElementById('skinShopStonesGrid');

    tabBoards.addEventListener('click', () => {
      activeTab = 'boards';
      tabBoards.classList.add('active');
      tabStones.classList.remove('active');
      gridBoards.style.display = 'grid';
      gridStones.style.display = 'none';
    });

    tabStones.addEventListener('click', () => {
      activeTab = 'stones';
      tabStones.classList.add('active');
      tabBoards.classList.remove('active');
      gridStones.style.display = 'grid';
      gridBoards.style.display = 'none';
    });

    const studioCanvas = document.getElementById('skinStudioCanvas');
    studioCanvas.addEventListener('click', handleStudioCanvasClick);

    document.getElementById('btnStudioResetStones').addEventListener('click', () => {
      previewStones = [];
      drawStudioPreview();
    });

    document.getElementById('btnStudioResetCombo').addEventListener('click', () => {
      const equipped = (typeof authManager !== 'undefined') ? authManager.getEquipped() : { board: 'kaya', stone: 'classic' };
      previewBoardKey = equipped.board || 'kaya';
      previewStoneKey = equipped.stone || 'classic';
      resetStudioStones();
      drawStudioPreview();
      renderShop();
    });
  }

  // ----------------------------------------------------
  // Render Cards in Shop
  // ----------------------------------------------------
  function renderShop() {
    ensureShopModalExists();

    const coins = (typeof authManager !== 'undefined') ? authManager.getCoins() : 0;
    const inventory = (typeof authManager !== 'undefined') ? authManager.getInventory() : { boards: ['kaya'], stones: ['classic'] };
    const equipped = (typeof authManager !== 'undefined') ? authManager.getEquipped() : { board: 'kaya', stone: 'classic' };

    const shopCoinsVal = document.getElementById('shopCoinsVal');
    if (shopCoinsVal) shopCoinsVal.textContent = coins.toLocaleString();

    // 1. Boards
    const gridBoards = document.getElementById('skinShopBoardsGrid');
    gridBoards.innerHTML = '';
    Object.values(BOARD_THEMES).forEach(item => {
      const isOwned = inventory.boards.includes(item.id) || item.price === 0;
      const isEquipped = equipped.board === item.id;
      const isPreviewing = previewBoardKey === item.id;
      const card = createShopCard('board', item, isOwned, isEquipped, isPreviewing, coins);
      gridBoards.appendChild(card);
    });

    // 2. Stones
    const gridStones = document.getElementById('skinShopStonesGrid');
    gridStones.innerHTML = '';
    Object.values(STONE_THEMES).forEach(item => {
      const isOwned = inventory.stones.includes(item.id) || item.price === 0;
      const isEquipped = equipped.stone === item.id;
      const isPreviewing = previewStoneKey === item.id;
      const card = createShopCard('stone', item, isOwned, isEquipped, isPreviewing, coins);
      gridStones.appendChild(card);
    });

    drawStudioPreview();
  }

  function createShopCard(type, item, isOwned, isEquipped, isPreviewing, myCoins) {
    const card = document.createElement('div');
    card.className = `shop-card ${isEquipped ? 'equipped' : ''} ${isPreviewing ? 'previewing' : ''}`;

    // Tag badge
    const tagEl = document.createElement('div');
    tagEl.className = `shop-card-tag tag-${item.tag || '기본'}`;
    tagEl.textContent = item.tag || '스킨';
    card.appendChild(tagEl);

    // Mini Preview Canvas
    const previewCanvas = document.createElement('canvas');
    previewCanvas.className = 'shop-preview-canvas';
    previewCanvas.width = 130;
    previewCanvas.height = 95;
    drawMiniPreview(previewCanvas, type, item.id);
    previewCanvas.addEventListener('click', () => {
      if (type === 'board') previewBoardKey = item.id;
      else previewStoneKey = item.id;
      drawStudioPreview();
      renderShop();
    });
    card.appendChild(previewCanvas);

    // Title
    const title = document.createElement('div');
    title.className = 'shop-item-name';
    title.textContent = item.name;
    card.appendChild(title);

    // Desc
    const desc = document.createElement('div');
    desc.className = 'shop-item-desc';
    desc.textContent = item.desc;
    card.appendChild(desc);

    // Bottom
    const bottom = document.createElement('div');
    bottom.className = 'shop-item-bottom';

    const priceTag = document.createElement('div');
    priceTag.className = 'shop-item-price';
    priceTag.innerHTML = isOwned
      ? '<span style="color:#4ade80;font-weight:700;">보유 중</span>'
      : `🪙 <span>${item.price.toLocaleString()}</span>`;
    bottom.appendChild(priceTag);

    // Buttons
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '6px';
    btnContainer.style.alignItems = 'center';

    // Preview button
    const btnPreview = document.createElement('button');
    btnPreview.className = `btn btn-sm ${isPreviewing ? 'btn-primary' : 'btn-secondary'}`;
    btnPreview.style.padding = '4px 8px';
    btnPreview.style.fontSize = '0.72rem';
    btnPreview.textContent = isPreviewing ? '미리보기 중' : '미리보기';
    btnPreview.addEventListener('click', (e) => {
      e.stopPropagation();
      if (type === 'board') previewBoardKey = item.id;
      else previewStoneKey = item.id;
      drawStudioPreview();
      renderShop();
    });
    btnContainer.appendChild(btnPreview);

    if (isEquipped) {
      const equippedTag = document.createElement('span');
      equippedTag.className = 'equipped-tag';
      equippedTag.textContent = '장착 중';
      btnContainer.appendChild(equippedTag);
    } else if (isOwned) {
      const btnEquip = document.createElement('button');
      btnEquip.className = 'btn btn-secondary shop-btn';
      btnEquip.textContent = '장착';
      btnEquip.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          if (typeof authManager !== 'undefined') {
            await authManager.equipSkin(type, item.id);
          }
          if (typeof soundManager !== 'undefined') {
            soundManager.playEquip();
          }
          if (type === 'board') previewBoardKey = item.id;
          else previewStoneKey = item.id;

          showShopToast(`✨ [${item.name}] 스킨을 장착했습니다!`);
          renderShop();
          notifySkinChange();
        } catch (err) {
          alert(err.message);
        }
      });
      btnContainer.appendChild(btnEquip);
    } else {
      const btnBuy = document.createElement('button');
      btnBuy.className = 'btn btn-primary shop-btn';
      btnBuy.textContent = '구매';
      btnBuy.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (myCoins < item.price) {
          alert(`코인이 부족합니다!\n필요: ${item.price.toLocaleString()} 코인\n현재 보유: ${myCoins.toLocaleString()} 코인\n\nAI 대국에서 승리하여 코인을 모아보세요!`);
          return;
        }

        if (!confirm(`[${item.name}] 스킨을 ${item.price.toLocaleString()} 코인에 구매하시겠습니까?`)) {
          return;
        }

        try {
          if (typeof authManager !== 'undefined') {
            await authManager.buySkin(type, item.id, item.price);
          }
          if (typeof soundManager !== 'undefined') {
            soundManager.playPurchase();
          }
          if (type === 'board') previewBoardKey = item.id;
          else previewStoneKey = item.id;

          showShopToast(`🎉 축하합니다! [${item.name}] 스킨을 구매하여 바로 장착했습니다!`);
          renderShop();
          notifySkinChange();
        } catch (err) {
          alert(err.message);
        }
      });
      btnContainer.appendChild(btnBuy);
    }

    bottom.appendChild(btnContainer);
    card.appendChild(bottom);

    return card;
  }

  function showShopToast(message) {
    const existing = document.getElementById('skinShopToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'skinShopToast';
    toast.className = 'skin-shop-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // ----------------------------------------------------
  // Open / Close Modal
  // ----------------------------------------------------
  function openShopModal() {
    ensureShopModalExists();
    const equipped = (typeof authManager !== 'undefined') ? authManager.getEquipped() : { board: 'kaya', stone: 'classic' };
    previewBoardKey = equipped.board || 'kaya';
    previewStoneKey = equipped.stone || 'classic';
    resetStudioStones();
    renderShop();
    const modal = document.getElementById('modalSkinShop');
    if (modal) modal.classList.add('active');
  }

  function closeShopModal() {
    const modal = document.getElementById('modalSkinShop');
    if (modal) modal.classList.remove('active');
  }

  // ----------------------------------------------------
  // Listener Notifications
  // ----------------------------------------------------
  function onSkinChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function notifySkinChange() {
    const equipped = (typeof authManager !== 'undefined') ? authManager.getEquipped() : { board: 'kaya', stone: 'classic' };
    listeners.forEach(fn => {
      try { fn(equipped); } catch (e) { console.error(e); }
    });
  }

  // ----------------------------------------------------
  // Bind Header Buttons on Loaded Page
  // ----------------------------------------------------
  function autoBindShopButtons() {
    // Look for all elements with class or id requesting skin shop
    const targets = document.querySelectorAll('.btn-open-shop, #btnOpenShop, #btnOpenShopModal, #btnHubOpenShop');
    targets.forEach(btn => {
      btn.removeEventListener('click', openShopModal);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openShopModal();
      });
    });
  }

  // Auto init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoBindShopButtons();
      if (typeof authManager !== 'undefined') {
        authManager.onUserChange(() => {
          const modal = document.getElementById('modalSkinShop');
          if (modal && modal.classList.contains('active')) {
            renderShop();
          }
        });
      }
    });
  } else {
    autoBindShopButtons();
    if (typeof authManager !== 'undefined') {
      authManager.onUserChange(() => {
        const modal = document.getElementById('modalSkinShop');
        if (modal && modal.classList.contains('active')) {
          renderShop();
        }
      });
    }
  }

  // Public Export
  window.SkinSystem = {
    BOARD_THEMES,
    STONE_THEMES,
    drawBoardBackground,
    drawStone,
    drawMiniPreview,
    openShopModal,
    closeShopModal,
    renderShop,
    onSkinChange,
    notifySkinChange,
    autoBindShopButtons
  };
})();
