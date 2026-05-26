const App = {
  currentBank: null,

  init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/quizapp/sw.js').catch(() => {});
    }
    this.renderHome();
    this.showScreen('home');

    // Import file input
    document.getElementById('import-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) Editor.importJSON(file);
      e.target.value = '';
    });
  },

  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(name);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  },

  renderHome() {
    const banks = Storage.getBanks();
    const list = document.getElementById('bank-list');
    if (!banks.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><p>Nessun banco domande ancora.<br>Importa un JSON o creane uno nuovo.</p></div>`;
      return;
    }
    list.innerHTML = banks.map(b => {
      const stats = Storage.getStats(b.id);
      return `
        <div class="bank-card" onclick="App.openBank('${b.id}')">
          <span class="bank-icon">📖</span>
          <div class="bank-info">
            <div class="bank-name">${b.title}</div>
            <div class="bank-meta">${b.subject ? b.subject + ' · ' : ''}${b.questions.length} domande${stats.sessions ? ' · ' + stats.sessions + ' sessioni' : ''}</div>
          </div>
          <span class="bank-arrow">›</span>
        </div>
      `;
    }).join('');
  },

  openBank(id) {
    const bank = Storage.getBank(id);
    if (!bank) return;
    this.currentBank = bank;

    document.getElementById('bd-title').textContent = bank.title;
    const stats = Storage.getStats(id);
    document.getElementById('bd-count').textContent = bank.questions.length;
    document.getElementById('bd-sessions').textContent = stats.sessions;
    const answered = stats.correct + stats.wrong;
    document.getElementById('bd-score').textContent = answered ? Math.round(stats.correct / answered * 100) + '%' : '—';

    this.showScreen('bank-detail');
  },

  startQuiz(mode) {
    if (!this.currentBank) return;
    Quiz.start(this.currentBank, mode);
  },

  openModal(id) {
    document.getElementById(id).classList.add('open');
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('open');
  },

  toast(msg, duration = 2200) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), duration);
  },

  openLightbox(src) {
    const lb = document.getElementById('lightbox');
    lb.querySelector('img').src = src;
    lb.classList.add('open');
  },

  closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
