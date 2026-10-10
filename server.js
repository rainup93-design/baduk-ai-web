const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'baduk_secret_key_2026_super_secure';

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Auth Helper
function getUserFromToken(req) {
  try {
    const token = req.cookies.baduk_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return db.findUserById(decoded.id);
  } catch (err) {
    return null;
  }
}

function formatUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    coins: user.coins || 0,
    inventory: user.inventory || { boards: ['kaya'], stones: ['classic'] },
    equipped: user.equipped || { board: 'kaya', stone: 'classic' },
    stats: user.stats
  };
}

// Routes
// 1. Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '아이디는 3자 이상 20자 이하로 입력해주세요.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: '비밀번호는 최소 4자 이상이어야 합니다.' });
    }

    const existingUser = db.findUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: '이미 존재하는 아이디입니다.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const user = db.createUser({
      id,
      username,
      passwordHash,
      nickname: (nickname && nickname.trim()) || username
    });

    // Auto login
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('baduk_token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      user: formatUser(user),
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    const user = db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('baduk_token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });

    res.json({
      message: '로그인 성공',
      user: formatUser(user),
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 3. Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('baduk_token');
  res.json({ message: '로그아웃되었습니다.' });
});

// Shop Catalog
const SHOP_ITEMS = {
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

// 1. Register
// 2. Login
// 3. Logout
// 4. Me
app.get('/api/auth/me', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: formatUser(user)
  });
});

// 5. Record game result
app.post('/api/games/record', (req, res) => {
  try {
    const user = getUserFromToken(req);
    const result = db.recordGameResult(user ? user.id : null, req.body);

    res.json({
      success: true,
      game: result.gameRecord,
      earnedCoins: result.earnedCoins,
      userCoins: result.userCoins,
      stats: result.userStats
    });
  } catch (err) {
    console.error('Record game error:', err);
    res.status(500).json({ error: '대국 기록 저장 중 오류가 발생했습니다.' });
  }
});

// 6. Shop Catalog
app.get('/api/shop/items', (req, res) => {
  res.json(SHOP_ITEMS);
});

// 7. Buy Skin
app.post('/api/shop/buy', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    const { type, itemId } = req.body;
    const cat = type === 'stone' ? SHOP_ITEMS.stones : SHOP_ITEMS.boards;
    const item = cat.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: '존재하지 않는 아이템입니다.' });
    }

    const buyRes = db.buySkin(user.id, { type, itemId, price: item.price });
    res.json({
      success: true,
      message: `${item.name} 스킨을 구매했습니다!`,
      ...buyRes
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Equip Skin
app.post('/api/shop/equip', (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    const { type, itemId } = req.body;
    const equipRes = db.equipSkin(user.id, { type, itemId });
    res.json({
      success: true,
      ...equipRes
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6. User game history
app.get('/api/games/my-history', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) {
    return res.json({ games: [] });
  }
  const games = db.getUserGames(user.id, 15);
  res.json({ games });
});

// Serve frontend fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Baduk AI Game Server running at http://localhost:${PORT}`);
  console.log(`===============================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n[알림] 포트 ${PORT}번이 이미 사용 중입니다.`);
    console.log(`서버가 이미 백그라운드에서 정상 실행 중이므로 웹 브라우저(http://localhost:${PORT})로 바로 접속하시면 됩니다.\n`);
  } else {
    console.error('서버 오류:', err);
  }
});
