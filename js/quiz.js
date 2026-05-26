const Quiz = {
  bank: null,
  questions: [],
  current: 0,
  answers: [],
  mode: 'all',
  startTime: null,

  start(bank, mode = 'all') {
    this.bank = bank;
    this.mode = mode;
    this.startTime = Date.now();
    this.answers = [];

    let qs = [...bank.questions];
    if (mode === 'mc') qs = qs.filter(q => q.type === 'multiple_choice');
    if (mode === 'open') qs = qs.filter(q => q.type === 'open' || q.type === 'numerical');
    if (mode === 'shuffle') qs = qs.sort(() => Math.random() - 0.5);
    if (mode === 'mistakes') {
      const stats = Storage.getStats(bank.id);
      qs = qs.filter(q => (stats.wrongIds || []).includes(q.id));
      if (!qs.length) qs = [...bank.questions].sort(() => Math.random() - 0.5);
    }

    this.questions = qs;
    this.current = 0;
    App.showScreen('quiz');
    this.renderQuestion();
  },

  get q() { return this.questions[this.current]; },
  get total() { return this.questions.length; },

  renderQuestion() {
    if (this.current >= this.total) { this.finish(); return; }
    const q = this.q;
    const pct = (this.current / this.total) * 100;

    document.getElementById('qz-progress').style.width = pct + '%';
    document.getElementById('qz-counter').textContent = `${this.current + 1} / ${this.total}`;

    const badge = document.getElementById('qz-type-badge');
    const typeMap = { multiple_choice: ['Scelta multipla', 'badge-mc'], open: ['Risposta aperta', 'badge-open'], numerical: ['Numerica', 'badge-num'] };
    const [label, cls] = typeMap[q.type] || ['Domanda', 'badge-mc'];
    badge.textContent = label;
    badge.className = 'quiz-type-badge ' + cls;

    document.getElementById('qz-text').textContent = q.text;

    const imgEl = document.getElementById('qz-img');
    if (q.image) {
      imgEl.src = q.image;
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
    }

    const mcArea = document.getElementById('qz-mc-area');
    const openArea = document.getElementById('qz-open-area');
    const numArea = document.getElementById('qz-num-area');
    const feedback = document.getElementById('qz-feedback');

    mcArea.style.display = 'none';
    openArea.style.display = 'none';
    numArea.style.display = 'none';
    feedback.className = 'feedback-box';
    feedback.innerHTML = '';

    document.getElementById('qz-footer').innerHTML = '';

    if (q.type === 'multiple_choice') this.renderMC(q);
    else if (q.type === 'open') this.renderOpen(q);
    else if (q.type === 'numerical') this.renderNumerical(q);

    this._renderMath(document.getElementById('quiz'));
  },

  _renderMath(el) {
    if (!window._katexReady || !window.renderMathInElement) return;
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  },

  renderMC(q) {
    const area = document.getElementById('qz-mc-area');
    area.style.display = 'block';
    const list = document.getElementById('qz-options');
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    list.innerHTML = q.options.map((opt, i) => `
      <button class="option-btn" data-i="${i}" onclick="Quiz.selectMC(${i})">
        <span class="opt-letter">${letters[i]}</span>
        <span>${opt}</span>
      </button>
    `).join('');
    this.setFooter([{ label: 'Salta', cls: 'btn-secondary', action: 'Quiz.skip()' }]);
  },

  selectMC(i) {
    const q = this.q;
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => b.classList.add('answered'));

    const isCorrect = i === q.correct;
    btns[i].classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) btns[q.correct].classList.add('revealed');

    const feedback = document.getElementById('qz-feedback');
    feedback.className = 'feedback-box show ' + (isCorrect ? 'correct' : 'wrong');
    feedback.innerHTML = isCorrect
      ? `<div class="feedback-title">✓ Corretto!</div>${q.explanation ? q.explanation : ''}`
      : `<div class="feedback-title">✗ Sbagliato</div>${q.explanation ? q.explanation : ''}`;

    this._renderMath(feedback);
    this.answers.push({ id: q.id, type: q.type, result: isCorrect ? 'correct' : 'wrong', chosen: i });
    this.setFooter([{ label: 'Prossima →', cls: 'btn-primary', action: 'Quiz.next()' }]);
  },

  renderOpen(q) {
    const area = document.getElementById('qz-open-area');
    area.style.display = 'block';
    document.getElementById('qz-open-textarea').value = '';
    document.getElementById('qz-open-solution').style.display = 'none';
    document.getElementById('qz-open-solution').querySelector('.sol-text').textContent = '';
    document.getElementById('qz-self-assess').className = 'self-assess';
    this.setFooter([
      { label: 'Salta', cls: 'btn-secondary', action: 'Quiz.skip()' },
      { label: 'Vedi risposta', cls: 'btn-primary', action: 'Quiz.revealOpen()' }
    ]);
  },

  revealOpen() {
    const q = this.q;
    const sol = document.getElementById('qz-open-solution');
    sol.style.display = 'block';
    sol.querySelector('.sol-text').textContent = q.answer;
    this._renderMath(sol);
    document.getElementById('qz-self-assess').className = 'self-assess show';
    this.setFooter([]);
  },

  renderNumerical(q) {
    const area = document.getElementById('qz-num-area');
    area.style.display = 'block';
    document.getElementById('qz-num-input').value = '';
    document.getElementById('qz-num-solution').style.display = 'none';
    document.getElementById('qz-num-feedback').className = 'feedback-box';
    this.setFooter([
      { label: 'Salta', cls: 'btn-secondary', action: 'Quiz.skip()' },
      { label: 'Controlla', cls: 'btn-primary', action: 'Quiz.checkNum()' }
    ]);
  },

  checkNum() {
    const q = this.q;
    const val = document.getElementById('qz-num-input').value.trim();
    if (!val) { App.toast('Inserisci una risposta'); return; }

    const normalize = s => s.toLowerCase().replace(/\s+/g, '').replace(',', '.');
    const isCorrect = normalize(val) === normalize(q.answer);

    const sol = document.getElementById('qz-num-solution');
    sol.style.display = 'block';
    sol.querySelector('.sol-text').textContent = (q.solution || q.answer);
    this._renderMath(sol);

    const fb = document.getElementById('qz-num-feedback');
    fb.className = 'feedback-box show ' + (isCorrect ? 'correct' : 'wrong');
    fb.innerHTML = isCorrect ? `<div class="feedback-title">✓ Corretto!</div>` : `<div class="feedback-title">✗ Sbagliato — risposta: ${q.answer}</div>`;

    this.answers.push({ id: q.id, type: q.type, result: isCorrect ? 'correct' : 'wrong', given: val });
    this.setFooter([{ label: 'Prossima →', cls: 'btn-primary', action: 'Quiz.next()' }]);
  },

  selfAssess(result) {
    const q = this.q;
    this.answers.push({ id: q.id, type: q.type, result });
    this.next();
  },

  skip() {
    const q = this.q;
    this.answers.push({ id: q.id, type: q.type, result: 'skip' });
    this.next();
  },

  next() {
    this.current++;
    this.renderQuestion();
  },

  setFooter(btns) {
    const footer = document.getElementById('qz-footer');
    if (!btns.length) { footer.innerHTML = ''; return; }
    footer.innerHTML = `<div style="display:flex;gap:8px">${btns.map(b => `<button class="btn ${b.cls}" onclick="${b.action}">${b.label}</button>`).join('')}</div>`;
  },

  finish() {
    const correct = this.answers.filter(a => a.result === 'correct').length;
    const wrong = this.answers.filter(a => a.result === 'wrong').length;
    const skipped = this.answers.filter(a => a.result === 'skip').length;
    const answered = correct + wrong;
    const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    Storage.saveStats(this.bank.id, { session: true, correct, wrong, skipped });

    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const mins = Math.floor(elapsed / 60), secs = elapsed % 60;

    document.getElementById('res-pct').textContent = pct + '%';
    document.getElementById('res-title').textContent = pct >= 80 ? 'Ottimo lavoro!' : pct >= 60 ? 'Quasi!' : 'Continua a esercitarti';
    document.getElementById('res-sub').textContent = `${mins}m ${secs}s · ${this.total} domande`;
    document.getElementById('res-correct').textContent = correct;
    document.getElementById('res-wrong').textContent = wrong;
    document.getElementById('res-skip').textContent = skipped;
    document.getElementById('res-circle').style.borderColor = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--error)';

    this._lastAnswers = this.answers;
    this._lastQuestions = this.questions;
    App.showScreen('results');
  },

  reviewAnswers() {
    const list = document.getElementById('review-list');
    list.innerHTML = this._lastQuestions.map((q, i) => {
      const ans = this._lastAnswers[i];
      const cls = ans ? (ans.result === 'correct' ? 'r-correct' : ans.result === 'wrong' ? 'r-wrong' : 'r-skip') : 'r-skip';
      return `<div class="review-item ${cls}"><div class="review-dot"></div><div class="review-q">${i+1}. ${q.text}</div></div>`;
    }).join('');
    App.showScreen('review');
  }
};
