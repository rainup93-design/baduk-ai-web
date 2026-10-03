// Authentication & User Profile Client Module with Shop & Coins Support
class AuthManager {
  constructor() {
    this.user = null;
    this.listeners = [];
    this.initGuestData();
  }

  initGuestData() {
    try {
      if (!localStorage.getItem('baduk_guest_data')) {
        const initial = {
          coins: 300, // Welcome gift 300 coins
          inventory: {
            boards: ['kaya'],
            stones: ['classic']
          },
          equipped: {
            board: 'kaya',
            stone: 'classic'
          }
        };
        localStorage.setItem('baduk_guest_data', JSON.stringify(initial));
      }
    } catch (e) {}
  }

  getGuestData() {
    try {
      const raw = localStorage.getItem('baduk_guest_data');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      coins: 300,
      inventory: { boards: ['kaya'], stones: ['classic'] },
      equipped: { board: 'kaya', stone: 'classic' }
    };
  }

  saveGuestData(data) {
    try {
      localStorage.setItem('baduk_guest_data', JSON.stringify(data));
    } catch (e) {}
  }

  getCoins() {
    if (this.user) return this.user.coins || 0;
    return this.getGuestData().coins;
  }

  getInventory() {
    if (this.user) return this.user.inventory || { boards: ['kaya'], stones: ['classic'] };
    return this.getGuestData().inventory;
  }

  getEquipped() {
    if (this.user) return this.user.equipped || { board: 'kaya', stone: 'classic' };
    return this.getGuestData().equipped;
  }

  onUserChange(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.user));
  }

  async checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        this.user = data.user;
      } else {
        this.user = null;
      }
    } catch (e) {
      this.user = null;
    }
    this.notify();
    return this.user;
  }

  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '로그인 실패');
    }
    this.user = data.user;
    this.notify();
    return data;
  }

  async register(username, password, nickname) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, nickname })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '회원가입 실패');
    }
    this.user = data.user;
    this.notify();
    return data;
  }

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    this.user = null;
    this.notify();
  }

  async recordGame(gameData) {
    try {
      const res = await fetch('/api/games/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData)
      });
      const data = await res.json();
      if (data.stats && this.user) {
        this.user.stats = data.stats;
      }
      if (typeof data.userCoins === 'number') {
        if (this.user) {
          this.user.coins = data.userCoins;
        } else {
          // Update guest coins
          const guest = this.getGuestData();
          guest.coins = (guest.coins || 0) + (data.earnedCoins || 0);
          this.saveGuestData(guest);
        }
      }
      this.notify();
      return data;
    } catch (e) {
      console.warn('Game record error:', e);
      return null;
    }
  }

  async getMyHistory() {
    try {
      const res = await fetch('/api/games/my-history');
      if (res.ok) {
        const data = await res.json();
        return data.games || [];
      }
    } catch (e) {}
    return [];
  }

  async getShopCatalog() {
    try {
      const res = await fetch('/api/shop/items');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
    return { boards: [], stones: [] };
  }

  async buySkin(type, itemId, price) {
    if (this.user) {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, itemId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '구매 실패');
      this.user.coins = data.coins;
      this.user.inventory = data.inventory;
      this.user.equipped = data.equipped;
      this.notify();
      return data;
    } else {
      // Guest local purchase
      const guest = this.getGuestData();
      const cat = type === 'stone' ? 'stones' : 'boards';
      if (guest.inventory[cat].includes(itemId)) {
        throw new Error('이미 보유하고 있는 스킨입니다.');
      }
      if (guest.coins < price) {
        throw new Error(`코인이 부족합니다. (필요: ${price} 코인, 보유: ${guest.coins} 코인)`);
      }
      guest.coins -= price;
      guest.inventory[cat].push(itemId);
      guest.equipped[type] = itemId;
      this.saveGuestData(guest);
      this.notify();
      return { success: true, coins: guest.coins, inventory: guest.inventory, equipped: guest.equipped };
    }
  }

  async equipSkin(type, itemId) {
    if (this.user) {
      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, itemId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '장착 실패');
      this.user.equipped = data.equipped;
      this.notify();
      return data;
    } else {
      const guest = this.getGuestData();
      const cat = type === 'stone' ? 'stones' : 'boards';
      if (!guest.inventory[cat].includes(itemId)) {
        throw new Error('보유하지 않은 스킨입니다.');
      }
      guest.equipped[type] = itemId;
      this.saveGuestData(guest);
      this.notify();
      return { success: true, equipped: guest.equipped };
    }
  }
}

window.authManager = new AuthManager();
