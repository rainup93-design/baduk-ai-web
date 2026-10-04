// ======================================================
// GAME HUB - Multi-game launcher for the board game site
// Games: 바둑, 오목, 장기, 체스
// ======================================================

const GAMES = {
  baduk: {
    id: 'baduk',
    name: '바둑',
    emoji: '⚫',
    desc: 'AI와 함께 즐기는 전통 바둑 대국',
    color: '#e5a93c',
    gradient: 'linear-gradient(135deg, #c0843e, #e4ab65)',
    engine: 'baduk-engine.js',
    ai: 'baduk-ai.js',
    app: 'baduk-app.js'
  },
  omok: {
    id: 'omok',
    name: '오목',
    emoji: '⭕',
    desc: '5개를 먼저 연결하면 승리! 빠른 두뇌 싸움',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #15803d, #4ade80)',
    engine: 'omok-engine.js',
    app: 'omok-app.js'
  },
  janggi: {
    id: 'janggi',
    name: '장기',
    emoji: '🀄',
    desc: '한국 전통 장기로 상대 궁을 잡아라!',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #b91c1c, #f87171)',
    engine: 'janggi-engine.js',
    app: 'janggi-app.js'
  },
  chess: {
    id: 'chess',
    name: '체스',
    emoji: '♟️',
    desc: '세계 최고 두뇌 게임, 체스 AI에 도전!',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #5b21b6, #a78bfa)',
    engine: 'chess-engine.js',
    app: 'chess-app.js'
  }
};

window.GAMES = GAMES;
