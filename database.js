const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadData(filePath, defaultData) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading data from ${filePath}:`, err);
    return defaultData;
  }
}

function saveData(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error saving data to ${filePath}:`, err);
  }
}

class Database {
  constructor() {
    this.users = loadData(USERS_FILE, []);
    this.games = loadData(GAMES_FILE, []);
  }

  // Ensure user has inventory and coins
  ensureUserFields(user) {
    if (!user) return user;
    if (typeof user.coins !== 'number') user.coins = 300; // Starting bonus
    if (!user.inventory) {
      user.inventory = { boards: ['kaya'], stones: ['classic'] };
    }
    if (!user.inventory.boards) user.inventory.boards = ['kaya'];
    if (!user.inventory.stones) user.inventory.stones = ['classic'];
    if (!user.equipped) {
      user.equipped = { board: 'kaya', stone: 'classic' };
    }
    return user;
  }

  // Users
  findUserByUsername(username) {
    const user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    return this.ensureUserFields(user);
  }

  findUserById(id) {
    const user = this.users.find(u => u.id === id);
    return this.ensureUserFields(user);
  }

  createUser({ id, username, passwordHash, nickname }) {
    const newUser = {
      id,
      username,
      nickname: nickname || username,
      passwordHash,
      createdAt: new Date().toISOString(),
      coins: 300, // 300 welcome coins!
      inventory: {
        boards: ['kaya'],
        stones: ['classic']
      },
      equipped: {
        board: 'kaya',
        stone: 'classic'
      },
      stats: {
        total: 0,
        wins: 0,
        losses: 0,
        byDifficulty: {
          easy: { wins: 0, losses: 0 },
          normal: { wins: 0, losses: 0 },
          hard: { wins: 0, losses: 0 },
          max: { wins: 0, losses: 0 }
        }
      }
    };
    this.users.push(newUser);
    saveData(USERS_FILE, this.users);
    return newUser;
  }

  recordGameResult(userId, { gameType = 'baduk', difficulty, winner, playerColor, boardSize, movesCount, moves, reason, result: explicitResult }) {
    const user = this.findUserById(userId);
    const isWin = explicitResult === 'win' || (winner !== undefined && playerColor !== undefined && winner === playerColor);
    const diffKey = ['easy', 'normal', 'hard', 'max'].includes(difficulty) ? difficulty : 'normal';

    const COIN_REWARDS = {
      easy: 100,
      normal: 300,
      hard: 800,
      max: 2000
    };

    let earnedCoins = 0;
    if (isWin) {
      earnedCoins = COIN_REWARDS[diffKey] || 300;
    }

    if (user) {
      this.ensureUserFields(user);
      user.stats.total += 1;
      if (isWin) {
        user.stats.wins += 1;
        user.coins = (user.coins || 0) + earnedCoins;
      } else {
        user.stats.losses += 1;
      }

      if (!user.stats.byDifficulty) {
        user.stats.byDifficulty = {
          easy: { wins: 0, losses: 0 },
          normal: { wins: 0, losses: 0 },
          hard: { wins: 0, losses: 0 },
          max: { wins: 0, losses: 0 }
        };
      }
      if (!user.stats.byDifficulty[diffKey]) {
        user.stats.byDifficulty[diffKey] = { wins: 0, losses: 0 };
      }

      if (isWin) {
        user.stats.byDifficulty[diffKey].wins += 1;
      } else {
        user.stats.byDifficulty[diffKey].losses += 1;
      }

      saveData(USERS_FILE, this.users);
    }

    const gameRecord = {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      gameType,
      userId: userId || 'guest',
      username: user ? user.username : '게스트',
      nickname: user ? user.nickname : '게스트',
      difficulty,
      playerColor,
      winner,
      isWin,
      earnedCoins,
      reason, // 'resign', 'score', 'no_moves', etc.
      boardSize,
      movesCount,
      moves: moves || [],
      createdAt: new Date().toISOString()
    };

    this.games.unshift(gameRecord);
    if (this.games.length > 200) {
      this.games = this.games.slice(0, 200);
    }
    saveData(GAMES_FILE, this.games);

    return {
      gameRecord,
      earnedCoins,
      userCoins: user ? user.coins : earnedCoins,
      userStats: user ? user.stats : null
    };
  }

  buySkin(userId, { type, itemId, price }) {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    this.ensureUserFields(user);

    const category = type === 'stone' ? 'stones' : 'boards';
    if (user.inventory[category].includes(itemId)) {
      throw new Error('이미 보유하고 있는 스킨입니다.');
    }

    if (user.coins < price) {
      throw new Error(`코인이 부족합니다. (필요: ${price} 코인, 보유: ${user.coins} 코인)`);
    }

    user.coins -= price;
    user.inventory[category].push(itemId);
    // Auto equip upon purchase
    user.equipped[type] = itemId;

    saveData(USERS_FILE, this.users);

    return {
      coins: user.coins,
      inventory: user.inventory,
      equipped: user.equipped
    };
  }

  equipSkin(userId, { type, itemId }) {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    this.ensureUserFields(user);

    const category = type === 'stone' ? 'stones' : 'boards';
    if (!user.inventory[category].includes(itemId)) {
      throw new Error('보유하지 않은 스킨입니다.');
    }

    user.equipped[type] = itemId;
    saveData(USERS_FILE, this.users);

    return {
      equipped: user.equipped
    };
  }

  getUserGames(userId, limit = 10) {
    return this.games
      .filter(g => g.userId === userId)
      .slice(0, limit);
  }
}

module.exports = new Database();
