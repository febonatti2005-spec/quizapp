const Storage = {
  KEY_BANKS: 'qz_banks',
  KEY_STATS: 'qz_stats',

  getBanks() {
    try { return JSON.parse(localStorage.getItem(this.KEY_BANKS) || '[]'); }
    catch { return []; }
  },

  saveBank(bank) {
    const banks = this.getBanks();
    const idx = banks.findIndex(b => b.id === bank.id);
    if (idx >= 0) banks[idx] = bank;
    else banks.push(bank);
    localStorage.setItem(this.KEY_BANKS, JSON.stringify(banks));
  },

  deleteBank(id) {
    const banks = this.getBanks().filter(b => b.id !== id);
    localStorage.setItem(this.KEY_BANKS, JSON.stringify(banks));
    const stats = this.getAllStats();
    delete stats[id];
    localStorage.setItem(this.KEY_STATS, JSON.stringify(stats));
  },

  getBank(id) {
    return this.getBanks().find(b => b.id === id) || null;
  },

  getAllStats() {
    try { return JSON.parse(localStorage.getItem(this.KEY_STATS) || '{}'); }
    catch { return {}; }
  },

  getStats(bankId) {
    return this.getAllStats()[bankId] || { sessions: 0, correct: 0, wrong: 0, skipped: 0 };
  },

  saveStats(bankId, delta) {
    const all = this.getAllStats();
    const cur = all[bankId] || { sessions: 0, correct: 0, wrong: 0, skipped: 0 };
    all[bankId] = {
      sessions: cur.sessions + (delta.session ? 1 : 0),
      correct: cur.correct + (delta.correct || 0),
      wrong: cur.wrong + (delta.wrong || 0),
      skipped: cur.skipped + (delta.skipped || 0)
    };
    localStorage.setItem(this.KEY_STATS, JSON.stringify(all));
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
};
