const Editor = {
  bank: null,
  editingQuestionIdx: null,
  _pendingImage: null,

  openNew() {
    this.bank = { id: Storage.generateId(), title: '', subject: '', questions: [] };
    this.editingQuestionIdx = null;
    document.getElementById('ed-bank-title').value = '';
    document.getElementById('ed-bank-subject').value = '';
    document.getElementById('ed-q-list').innerHTML = '';
    App.showScreen('editor');
  },

  openEdit(bank) {
    this.bank = JSON.parse(JSON.stringify(bank));
    document.getElementById('ed-bank-title').value = bank.title;
    document.getElementById('ed-bank-subject').value = bank.subject || '';
    this.renderQList();
    App.showScreen('editor');
  },

  renderQList() {
    const list = document.getElementById('ed-q-list');
    if (!this.bank.questions.length) {
      list.innerHTML = '<p class="text-muted text-sm text-center">Nessuna domanda ancora</p>';
      return;
    }
    const typeIcon = { multiple_choice: '◉', open: '✎', numerical: '∑' };
    list.innerHTML = this.bank.questions.map((q, i) => `
      <div class="review-item" style="cursor:default">
        <div class="review-dot" style="background:var(--accent)"></div>
        <div class="review-q" style="flex:1">${i+1}. ${q.text.slice(0, 60)}${q.text.length > 60 ? '…' : ''}</div>
        <span style="color:var(--text2);font-size:1rem;margin-right:4px">${typeIcon[q.type] || '?'}</span>
        <button class="btn btn-sm btn-secondary" style="margin-right:4px" onclick="Editor.editQuestion(${i})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="Editor.deleteQuestion(${i})">🗑</button>
      </div>
    `).join('');
  },

  openQuestionModal(idx) {
    this.editingQuestionIdx = idx;
    const q = idx !== null ? this.bank.questions[idx] : { type: 'multiple_choice', text: '', options: ['', '', '', ''], correct: 0, explanation: '', image: null };
    document.getElementById('qm-type').value = q.type;
    document.getElementById('qm-text').value = q.text;
    document.getElementById('qm-explanation').value = q.explanation || '';

    this._pendingImage = null;
    const preview = document.getElementById('qm-image-preview');
    const thumb = document.getElementById('qm-img-thumb');
    if (q.image && q.image.startsWith('data:')) {
      this._pendingImage = q.image;
      thumb.src = q.image;
      preview.style.display = 'flex';
      document.getElementById('qm-image').value = '';
    } else {
      document.getElementById('qm-image').value = q.image || '';
      thumb.src = '';
      preview.style.display = 'none';
    }

    this.onTypeChange(q.type, q);
    App.openModal('question-modal');
  },

  editQuestion(i) { this.openQuestionModal(i); },

  deleteQuestion(i) {
    if (!confirm('Eliminare questa domanda?')) return;
    this.bank.questions.splice(i, 1);
    this.bank.questions.forEach((q, j) => q.id = j + 1);
    this.renderQList();
  },

  onTypeChange(type, q) {
    const mc = document.getElementById('qm-mc-fields');
    const open = document.getElementById('qm-open-fields');
    const num = document.getElementById('qm-num-fields');
    mc.style.display = type === 'multiple_choice' ? 'flex' : 'none';
    open.style.display = type === 'open' ? 'flex' : 'none';
    num.style.display = type === 'numerical' ? 'flex' : 'none';

    if (type === 'multiple_choice') {
      const opts = q?.options || ['', '', '', ''];
      const correct = q?.correct ?? 0;
      document.getElementById('qm-options-container').innerHTML = opts.map((o, i) => `
        <div class="option-row">
          <input type="radio" class="radio-correct" name="correct" value="${i}" ${correct === i ? 'checked' : ''}>
          <input class="field-input" style="flex:1" placeholder="Opzione ${String.fromCharCode(65+i)}" value="${o}" oninput="Editor.updateOption(${i}, this.value)">
        </div>
      `).join('') + `<p class="correct-hint">Il pallino seleziona la risposta corretta</p>`;
    }
    if (type === 'open') {
      document.getElementById('qm-open-answer').value = q?.answer || '';
    }
    if (type === 'numerical') {
      document.getElementById('qm-num-answer').value = q?.answer || '';
      document.getElementById('qm-num-solution').value = q?.solution || '';
    }
  },

  updateOption(i, val) {
    // live update handled on save
  },

  saveQuestion() {
    const type = document.getElementById('qm-type').value;
    const text = document.getElementById('qm-text').value.trim();
    if (!text) { App.toast('Inserisci il testo della domanda'); return; }

    const q = {
      id: this.editingQuestionIdx !== null ? this.bank.questions[this.editingQuestionIdx].id : (this.bank.questions.length + 1),
      type,
      text,
      explanation: document.getElementById('qm-explanation').value.trim() || null,
      image: this._pendingImage || document.getElementById('qm-image').value.trim() || null
    };

    if (type === 'multiple_choice') {
      const inputs = document.querySelectorAll('#qm-options-container .option-row input[type=text], #qm-options-container .option-row input:not([type=radio])');
      const opts = [];
      document.querySelectorAll('#qm-options-container .option-row').forEach(row => {
        const inp = row.querySelector('input:not([type=radio])');
        if (inp) opts.push(inp.value.trim());
      });
      const correctRadio = document.querySelector('input[name=correct]:checked');
      q.options = opts;
      q.correct = correctRadio ? parseInt(correctRadio.value) : 0;
    } else if (type === 'open') {
      q.answer = document.getElementById('qm-open-answer').value.trim();
    } else if (type === 'numerical') {
      q.answer = document.getElementById('qm-num-answer').value.trim();
      q.solution = document.getElementById('qm-num-solution').value.trim();
    }

    if (this.editingQuestionIdx !== null) {
      this.bank.questions[this.editingQuestionIdx] = q;
    } else {
      this.bank.questions.push(q);
    }
    this.renderQList();
    App.closeModal('question-modal');
    App.toast('Domanda salvata');
  },

  pickImage() {
    document.getElementById('qm-image-file').click();
  },

  onImageFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this._pendingImage = e.target.result;
      document.getElementById('qm-image').value = '';
      document.getElementById('qm-img-thumb').src = e.target.result;
      document.getElementById('qm-image-preview').style.display = 'flex';
      input.value = '';
    };
    reader.readAsDataURL(file);
  },

  clearImage() {
    this._pendingImage = null;
    document.getElementById('qm-image').value = '';
    document.getElementById('qm-img-thumb').src = '';
    document.getElementById('qm-image-preview').style.display = 'none';
  },

  saveBank() {
    const title = document.getElementById('ed-bank-title').value.trim();
    if (!title) { App.toast('Inserisci un titolo'); return; }
    if (!this.bank.questions.length) { App.toast('Aggiungi almeno una domanda'); return; }
    this.bank.title = title;
    this.bank.subject = document.getElementById('ed-bank-subject').value.trim();
    Storage.saveBank(this.bank);
    App.toast('Banco domande salvato!');
    App.showScreen('home');
    App.renderHome();
  },

  importJSON(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.questions || !Array.isArray(data.questions)) throw new Error('Formato non valido');
        const bank = {
          id: Storage.generateId(),
          title: data.title || file.name.replace('.json', ''),
          subject: data.subject || '',
          questions: data.questions.map((q, i) => ({ id: i + 1, ...q }))
        };
        Storage.saveBank(bank);
        App.toast(`Importato: ${bank.questions.length} domande`);
        App.renderHome();
        App.showScreen('home');
      } catch (err) {
        App.toast('Errore nel file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  exportBank(id) {
    const bank = Storage.getBank(id);
    if (!bank) return;
    const blob = new Blob([JSON.stringify(bank, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (bank.title || 'domande').replace(/\s+/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
};
