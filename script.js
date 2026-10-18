(() => {
  const $ = (s) => document.querySelector(s);

  // اسم الطالبة من config.js
  const nm = document.querySelector('.hero-name .nm');
  if (nm) nm.textContent = window.STUDENT_NAME || '';

  const SCI = [
    { l: 'SHIFT', a: 'shift', c: 'shift' }, { l: 'DEG', a: 'mode', c: 'fn' },
    { l: 'S⇔D', a: 'sd', c: 'fn' }, { l: '◀', a: 'left', c: 'fn' },
    { l: '▶', a: 'right', c: 'fn' }, { l: 'x', v: 'x' },

    { l: 'x²', v: '^2', s: 'x³', sv: '^3' }, { l: 'xʸ', v: '^(', s: 'ʸ√x', sv: 'root(' },
    { l: '√', v: '√(', s: '∛', sv: '∛(' }, { l: 'x⁻¹', v: '^(-1)', s: 'x!', sv: 'fact(' },
    { l: 'log', v: 'log(', s: '10ˣ', sv: '10^(' }, { l: 'ln', v: 'ln(', s: 'eˣ', sv: 'e^(' },

    { l: 'sin', v: 'sin(', s: 'sin⁻¹', sv: 'sin⁻¹(' }, { l: 'cos', v: 'cos(', s: 'cos⁻¹', sv: 'cos⁻¹(' },
    { l: 'tan', v: 'tan(', s: 'tan⁻¹', sv: 'tan⁻¹(' }, { l: 'π', v: 'π', s: 'e', sv: 'e' },
    { l: '(', v: '(' }, { l: ')', v: ')' },

    { l: '|x|', v: 'abs(', s: 'conj', sv: 'conj(' }, { l: 'nPr', v: 'npr(', s: 'nCr', sv: 'ncr(' },
    { l: ',', v: ',', s: 'logₐ', sv: 'logb(' }, { l: 'i', v: 'i' },
    { l: 'y', v: 'y' }, { l: '%', v: '%' },
  ];

  const NUM = [
    { l: '7', v: '7' }, { l: '8', v: '8' }, { l: '9', v: '9' },
    { l: 'DEL', a: 'del', c: 'del' }, { l: 'AC', a: 'ac', c: 'ac' },
    { l: '4', v: '4' }, { l: '5', v: '5' }, { l: '6', v: '6' },
    { l: '×', v: '×', c: 'op' }, { l: '÷', v: '÷', c: 'op' },
    { l: '1', v: '1' }, { l: '2', v: '2' }, { l: '3', v: '3' },
    { l: '+', v: '+', c: 'op' }, { l: '−', v: '−', c: 'op' },
    { l: '0', v: '0' }, { l: '.', v: '.' }, { l: '×10ˣ', v: '×10^(' },
    { l: 'Ans', v: 'Ans' }, { l: '=', a: 'eq', c: 'eq' },
  ];

  const state = {
    shift: false,
    mode: localStorage.getItem('mode') || 'deg',
    done: false, last: null, showDec: false,
  };
  const expr = $('#expr'), resEl = $('#result'), calc = $('#calc');
  const indShift = $('#indShift'), indMode = $('#indMode'), indSD = $('#indSD');
  const OP_START = /^[+\-−×÷*\/^%]/;

  function build(container, keys) {
    keys.forEach((k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'key ' + (k.c || '');
      if (k.s) {
        b.classList.add('has-sl');
        const sl = document.createElement('span');
        sl.className = 'sl'; sl.textContent = k.s; b.append(sl);
      }
      const ml = document.createElement('span');
      ml.className = 'ml'; ml.textContent = k.l; b.append(ml);
      if (k.a === 'mode') b.id = 'btnMode';
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => press(k));
      container.append(b);
    });
  }
  build($('#sciKeys'), SCI);
  build($('#numKeys'), NUM);

  function setShift(on) {
    state.shift = on;
    calc.classList.toggle('shift-on', on);
    indShift.textContent = on ? 'SHIFT' : '';
  }
  function updateMode() {
    $('#btnMode .ml').textContent = state.mode.toUpperCase();
    indMode.textContent = state.mode === 'deg' ? 'D' : 'R';
    localStorage.setItem('mode', state.mode);
  }

  function press(k) {
    if (k.a) return action(k.a);
    const t = state.shift && k.sv ? k.sv : k.v;
    setShift(false);
    insert(t);
  }

  function insert(text) {
    if (state.done) {
      expr.value = OP_START.test(text) ? 'Ans' : '';
      state.done = false;
      expr.setSelectionRange(expr.value.length, expr.value.length);
    }
    const s = expr.selectionStart ?? expr.value.length;
    const e = expr.selectionEnd ?? s;
    expr.value = expr.value.slice(0, s) + text + expr.value.slice(e);
    const p = s + text.length;
    expr.focus();
    expr.setSelectionRange(p, p);
  }

  function del() {
    state.done = false;
    const s = expr.selectionStart, e = expr.selectionEnd;
    let from = s;
    if (s !== e) from = s;
    else if (s > 0) {
      const m = expr.value.slice(0, s).match(/(sin⁻¹\(|cos⁻¹\(|tan⁻¹\(|[a-z]{2,}\(|Ans)$/);
      from = s - (m ? m[0].length : 1);
    }
    expr.value = expr.value.slice(0, from) + expr.value.slice(e);
    expr.focus();
    expr.setSelectionRange(from, from);
  }

  function move(d) {
    state.done = false;
    const p = Math.max(0, Math.min(expr.value.length, (expr.selectionStart ?? 0) + d));
    expr.focus();
    expr.setSelectionRange(p, p);
  }

  function action(a) {
    switch (a) {
      case 'shift': setShift(!state.shift); break;
      case 'mode': state.mode = state.mode === 'deg' ? 'rad' : 'deg'; updateMode(); break;
      case 'sd':
        if (state.last && state.last.ok && state.last.differs) {
          state.showDec = !state.showDec; renderResult();
        }
        break;
      case 'left': move(-1); break;
      case 'right': move(1); break;
      case 'del': del(); break;
      case 'ac':
        expr.value = ''; state.last = null; state.done = false; renderResult(); expr.focus(); break;
      case 'eq': calculate(); break;
    }
  }

  // ------------------------------------------------ الحساب (محلي في المتصفح)
  function calculate() {
    const q = expr.value.trim();
    if (!q) return;
    let r;
    try { r = Engine.calc(q, state.mode); }
    catch { r = { ok: false, error: 'Syntax ERROR' }; }
    state.last = r;
    state.done = r.ok;
    state.showDec = r.ok && r.hasFloat;
    renderResult();
    if (r.ok) addHistory(q, r.decimal && (r.hasFloat || !r.differs) ? r.decimal : r.text);
  }

  function renderResult() {
    const r = state.last;
    resEl.innerHTML = '';
    indSD.textContent = '';
    if (!r) return;
    if (!r.ok) {
      const s = document.createElement('span');
      s.className = 'err'; s.textContent = r.error; resEl.append(s);
      return;
    }
    indSD.textContent = r.differs ? 'S⇔D' : '';
    if (state.showDec && r.decimal !== null) resEl.textContent = r.decimal;
    else if (window.katex) {
      try { katex.render(r.latex, resEl, { throwOnError: false }); }
      catch { resEl.textContent = r.text; }
    } else resEl.textContent = r.text;
  }

  expr.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); calculate(); return; }
    if (state.done && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); insert(e.key);
    }
  });

  // ------------------------------------------------ السجل
  let hist = JSON.parse(localStorage.getItem('hist') || '[]');
  function addHistory(q, r) {
    hist.unshift({ q, r });
    hist = hist.slice(0, 30);
    localStorage.setItem('hist', JSON.stringify(hist));
    renderHistory();
  }
  function renderHistory() {
    const ul = $('#histList');
    ul.innerHTML = '';
    if (!hist.length) {
      const li = document.createElement('div');
      li.className = 'empty'; li.textContent = 'لا توجد عمليات بعد';
      ul.append(li); return;
    }
    hist.forEach((h) => {
      const li = document.createElement('li');
      const q = document.createElement('div'); q.className = 'q'; q.textContent = h.q;
      const r = document.createElement('div'); r.className = 'r'; r.textContent = '= ' + h.r;
      li.append(q, r);
      li.addEventListener('click', () => {
        expr.value = h.q; state.done = false; expr.focus();
      });
      ul.append(li);
    });
  }
  $('#clearHist').addEventListener('click', () => {
    hist = []; localStorage.removeItem('hist'); renderHistory();
  });

  // ------------------------------------------------ التبويبات
  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
      $('#calc-panel').classList.toggle('active', t.dataset.tab === 'calc');
      $('#tools-panel').classList.toggle('active', t.dataset.tab === 'tools');
    })
  );

  // ------------------------------------------------ الأدوات المتقدمة
  function renderItems(box, items) {
    box.innerHTML = '';
    items.forEach((it) => {
      const row = document.createElement('div'); row.className = 'res-row';
      const lab = document.createElement('div'); lab.className = 'res-label'; lab.textContent = it.label;
      const val = document.createElement('div'); val.className = 'res-val'; val.dir = 'ltr';
      if (it.latex && window.katex) {
        try { katex.render(it.latex, val, { throwOnError: false }); }
        catch { val.textContent = it.text; }
      } else val.textContent = it.text;
      row.append(lab, val);
      if (it.approx) {
        const ap = document.createElement('div');
        ap.className = 'res-approx'; ap.dir = 'ltr'; ap.textContent = '≈ ' + it.approx;
        row.append(ap);
      }
      box.append(row);
    });
  }

  document.querySelectorAll('form.tool').forEach((f) => {
    f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const box = f.querySelector('.out');
      const body = Object.fromEntries(new FormData(f));
      body.tool = f.dataset.tool;
      let r;
      try { r = Engine.tool(body); }
      catch { r = { ok: false, error: 'Math ERROR' }; }
      if (r.ok) renderItems(box, r.items);
      else {
        box.innerHTML = '';
        const d = document.createElement('div');
        d.className = 'err'; d.textContent = r.error; box.append(d);
      }
    });
  });

  updateMode();
  renderHistory();
  expr.focus();
})();