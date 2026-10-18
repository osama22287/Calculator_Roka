(() => {
  'use strict';

  class CalcError extends Error {}

  const MAX_LEN = 300;
  const ALLOWED = new Set([
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'logb',
    'sqrt', 'cbrt', 'root', 'abs', 'fact', 'npr', 'ncr', 'conj', 'exp',
    'pi', 'e', 'i', 'x', 'y', 'z', 't', 'ANS', 'oo',
  ]);
  let ANS = '0';

  const lib = () => {
    if (typeof nerdamer === 'undefined')
      throw new CalcError('تعذر تحميل مكتبة الحساب - تأكدي من الإنترنت');
    return nerdamer;
  };

  // ------------------------------------------------ دوال مساعدة
  function fmtReal(f) {
    if (!isFinite(f)) throw new CalcError('Math ERROR');
    if (Number.isInteger(f) && Math.abs(f) < 1e15) return String(f);
    const s = Number(f.toPrecision(10)).toString();
    if (s.includes('e')) {
      const [m, ex] = s.split('e');
      return `${m}×10^${parseInt(ex, 10)}`;
    }
    return s;
  }

  function toFrac(x) {
    if (Number.isInteger(x)) return String(x);
    for (let d = 2; d <= 1000; d++) {
      const n = Math.round(x * d);
      if (Math.abs(x - n / d) < 1e-9) return `${n}/${d}`;
    }
    return String(x);
  }

  function splitTop(str) {
    const out = []; let depth = 0, start = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (c === ',' && depth === 0) { out.push(str.slice(start, i).trim()); start = i + 1; }
    }
    const last = str.slice(start).trim();
    if (last) out.push(last);
    return out;
  }

  // يستبدل استدعاء دالة بصيغة أخرى مع مراعاة الأقواس المتداخلة
  function replaceCall(s, name, fn, argc) {
    const re = new RegExp('\\b' + name + '\\s*\\(');
    for (let guard = 0; guard < 60; guard++) {
      const m = re.exec(s);
      if (!m) break;
      const open = m.index + m[0].length - 1;
      let depth = 0, i = open, start = open + 1;
      const args = [];
      for (; i < s.length; i++) {
        const c = s[i];
        if (c === '(') depth++;
        else if (c === ')') { depth--; if (depth === 0) break; }
        else if (c === ',' && depth === 1) { args.push(s.slice(start, i)); start = i + 1; }
      }
      if (depth !== 0) throw new CalcError('Syntax ERROR');
      args.push(s.slice(start, i));
      if (args.length !== argc || args.some((a) => !a.trim())) throw new CalcError('Syntax ERROR');
      s = s.slice(0, m.index) + fn(args) + s.slice(i + 1);
    }
    return s;
  }

  function normalize(text) {
    let s = text.trim();
    s = s.replace(/ans/gi, 'ANS');
    s = s.replace(/√\s*(\d+(?:\.\d+)?|[xyztXYZT]|π)/g, 'sqrt($1)');
    const pairs = [
      ['sin⁻¹', 'asin'], ['cos⁻¹', 'acos'], ['tan⁻¹', 'atan'],
      ['×', '*'], ['÷', '/'], ['−', '-'], ['–', '-'], ['·', '*'],
      ['√', 'sqrt'], ['∛', 'cbrt'], ['π', 'pi'], ['∞', 'oo'],
      ['%', '/100'], ['[', '('], [']', ')'], ['{', '('], ['}', ')'],
    ];
    for (const [a, b] of pairs) s = s.split(a).join(b);
    s = s.replace(/[A-Za-z_][A-Za-z_0-9]*/g, (m) => (m === 'ANS' ? m : m.toLowerCase()));
    s = s.replace(/\b(x|y|z|t|pi|e|i|ANS)\s*\(/g, '$1*(');
    return s;
  }

  // يحوّل ما كتبته الطالبة إلى صيغة تفهمها مكتبة Nerdamer
  function prepare(raw, mode) {
    let s = normalize(String(raw));
    if (!s) throw new CalcError('Syntax ERROR');
    if (s.length > MAX_LEN || !/^[0-9A-Za-z_+\-*/^().,\s]*$/.test(s)) throw new CalcError('Syntax ERROR');
    for (const n of s.match(/[A-Za-z_][A-Za-z_0-9]*/g) || [])
      if (!ALLOWED.has(n)) throw new CalcError('Syntax ERROR');
    if (/\^\s*\(?\s*\d{5,}/.test(s) || (s.match(/\^/g) || []).length > 8) throw new CalcError('Math ERROR');

    // الضرب الضمني: 2x ، 3(x+1) ، (a)(b)
    s = s.replace(/(\d|\))\s*(?=[A-Za-z(])/g, '$1*');

    const R = replaceCall;
    s = R(s, 'fact', (a) => `((${a[0]})!)`, 1);
    s = R(s, 'npr', (a) => `(((${a[0]})!)/(((${a[0]})-(${a[1]}))!))`, 2);
    s = R(s, 'ncr', (a) => `(((${a[0]})!)/(((${a[1]})!)*(((${a[0]})-(${a[1]}))!)))`, 2);
    s = R(s, 'root', (a) => `((${a[1]})^(1/(${a[0]})))`, 2);
    s = R(s, 'logb', (a) => `(ln(${a[1]})/ln(${a[0]}))`, 2);
    s = R(s, 'cbrt', (a) => `((${a[0]})^(1/3))`, 1);
    s = R(s, 'log', (a) => `log10(${a[0]})`, 1);
    s = R(s, 'ln', (a) => `log(${a[0]})`, 1);   // log في Nerdamer = اللوغاريتم الطبيعي

    if (mode === 'deg') {
      for (const f of ['sin', 'cos', 'tan'])
        s = R(s, f, (a) => `${f.toUpperCase()}((${a[0]})*pi/180)`, 1);
      for (const f of ['asin', 'acos', 'atan'])
        s = R(s, f, (a) => `(${f.toUpperCase()}(${a[0]})*180/pi)`, 1);
      s = s.replace(/\b(ASIN|ACOS|ATAN|SIN|COS|TAN)\(/g, (m) => m.toLowerCase());
    }

    s = R(s, 'conj', (a) => `conjugate(${a[0]})`, 1);
    s = s.replace(/\boo\b/g, 'Infinity');
    s = s.replace(/\bANS\b/g, `(${ANS})`);
    return s;
  }

  function pretty(s) {
    return s.replace(/sqrt\(/g, '√(').replace(/\bpi\b/g, 'π')
            .replace(/Infinity/g, '∞').replace(/\*/g, '·');
  }

  function decimalOf(r) {
    const t = r.evaluate().text('decimals');
    if (/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return fmtReal(Number(t));
    if (/^[\d.+\-*ei\s]+$/i.test(t) && /i/.test(t)) return t.replace(/\*/g, '').replace(/\+/g, ' + ');
    return null;
  }

  function numVal(s) {
    const v = Number(lib()(s).evaluate().text('decimals'));
    if (Number.isNaN(v)) throw new CalcError('Math ERROR');
    return v;
  }

  const hasVars = (r) => r.variables().length > 0;

  function item(label, src, approx = true) {
    const N = lib();
    const r = typeof src === 'string' ? N(src) : src;
    const text = r.toString();
    if (/NaN|undefined/.test(text)) throw new CalcError('Math ERROR');
    const out = {
      label,
      text: pretty(text),
      latex: /Infinity/.test(text) ? text.replace(/Infinity/g, '\\infty') : r.toTeX(),
    };
    if (approx && !hasVars(r) && !/^-?\d+$/.test(text) && !/Infinity/.test(text)) {
      try { const d = decimalOf(r); if (d !== null) out.approx = d; } catch (_) { /* تجاهل */ }
    }
    return out;
  }

  function fail(e) {
    if (e instanceof CalcError) return { ok: false, error: e.message };
    const msg = String((e && e.message) || e);
    return { ok: false, error: /division|zero|infinity|undefined|domain/i.test(msg) ? 'Math ERROR' : 'Syntax ERROR' };
  }

  // ------------------------------------------------ الآلة الحاسبة
  function calc(raw, mode) {
    try {
      const N = lib();
      const s = prepare(raw, mode === 'rad' ? 'rad' : 'deg');
      const r = N(s);
      const text = r.toString();
      if (/Infinity|NaN|undefined/.test(text)) throw new CalcError('Math ERROR');
      const hasFloat = /\d*\.\d+/.test(String(raw));
      const dec = hasVars(r) ? null : decimalOf(r);
      const differs = dec !== null && !/^-?\d+$/.test(text) && !hasFloat;
      ANS = text;
      return { ok: true, latex: r.toTeX(), text: pretty(text), decimal: dec, hasFloat, differs };
    } catch (e) { return fail(e); }
  }

  // ------------------------------------------------ نهاية عددية احتياطية
  function evalAt(f, v, x) {
    const t = lib()(f, { [v]: x.toFixed(12) }).evaluate().text('decimals');
    return Number(t);
  }
  function close(a, b) { return Math.abs(a - b) <= 1e-3 * Math.max(1, Math.abs(a), Math.abs(b)); }

  function sideLimit(f, v, p, sgn) {
    const a = evalAt(f, v, p + sgn * 1e-4);
    const b = evalAt(f, v, p + sgn * 1e-6);
    if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
    if (Math.abs(b) > 1e6 && Math.abs(b) > Math.abs(a)) return b > 0 ? Infinity : -Infinity;
    return close(a, b) ? b : NaN;
  }

  function numericLimit(f, v, pt, dir) {
    let val;
    if (/^-?Infinity$/.test(pt)) {
      const sgn = pt.startsWith('-') ? -1 : 1;
      const a = evalAt(f, v, sgn * 1e6), b = evalAt(f, v, sgn * 1e8);
      if (close(a, b)) val = b;
      else if (Math.abs(b) > Math.abs(a) && Math.abs(b) > 1e4) val = b > 0 ? Infinity : -Infinity;
      else val = NaN;
    } else {
      const p = numVal(pt);
      const right = sideLimit(f, v, p, 1), left = sideLimit(f, v, p, -1);
      if (dir === '+') val = right;
      else if (dir === '-') val = left;
      else if (Object.is(right, left) || (Number.isFinite(right) && Number.isFinite(left) && close(right, left))) val = right;
      else {
        return [{ label: 'النهاية', text: 'غير موجودة (النهايتان من الجهتين مختلفتان)' },
                { label: 'من اليمين / من اليسار', text: `${fmtShow(right)}  /  ${fmtShow(left)}` }];
      }
    }
    if (Number.isNaN(val)) return [{ label: 'النهاية', text: 'تعذر تقدير النهاية' }];
    return [
      { label: 'النهاية (تقدير عددي)', text: fmtShow(val) },
      { label: 'تنبيه', text: 'النتيجة تقريبية، تأكدي منها بالطريقة المعتادة' },
    ];
  }
  function fmtShow(x) {
    if (x === Infinity) return '∞';
    if (x === -Infinity) return '−∞';
    if (Number.isNaN(x)) return '؟';
    const r = Number(x.toPrecision(6));
    return fmtReal(Math.abs(r - Math.round(r)) < 1e-4 ? Math.round(r) : r);
  }

  // ------------------------------------------------ الأدوات المتقدمة
  function runTool(d) {
    const N = lib();
    const P = (key) => prepare(String(d[key] ?? ''), 'rad');
    const v = ['x', 'y', 'z', 't'].includes(d.var) ? d.var : 'x';
    const bad = (t) => /integrate\(|defint\(|limit\(|Infinity|NaN|undefined/.test(t);
    const out = [];

    switch (d.tool) {
      case 'derivative': {
        const f = P('expr');
        const n = Math.max(1, Math.min(parseInt(d.order, 10) || 1, 5));
        const res = N(`diff(${f},${v},${n})`);
        out.push(item(n === 1 ? 'المشتقة' : `المشتقة رقم ${n}`, res));
        if (String(d.point || '').trim()) {
          const pt = P('point');
          out.push(item(`قيمتها عند ${v} = ${pretty(pt)}`, N(res.toString(), { [v]: pt })));
        }
        break;
      }

      case 'integral': {
        const f = P('expr');
        if (String(d.a || '').trim() && String(d.b || '').trim()) {
          const r = N(`defint(${f},${P('a')},${P('b')},${v})`);
          if (bad(r.toString())) throw new CalcError('Math ERROR');
          out.push(item('التكامل المحدد', r));
        } else {
          const r = N(`integrate(${f},${v})`);
          if (bad(r.toString())) throw new CalcError('Math ERROR');
          out.push({ label: 'التكامل غير المحدد', text: pretty(r.toString()) + ' + C', latex: r.toTeX() + ' + C' });
        }
        break;
      }

      case 'limit': {
        const f = P('expr'), pt = P('point');
        const dir = ['+', '-', '+-'].includes(d.dir) ? d.dir : '+-';
        let res = null;
        if (dir === '+-') {
          try {
            const r = N(`limit(${f},${v},${pt})`);
            const t = r.toString();
            if (!/limit\(|NaN|undefined/.test(t)) res = r;
          } catch (_) { res = null; }
        }
        if (res) out.push(item('النهاية', res));
        else out.push(...numericLimit(f, v, pt, dir));
        break;
      }

      case 'solve': {
        const parts = String(d.expr || '').split(/[;\n]+/).map((x) => x.trim()).filter(Boolean);
        if (!parts.length || parts.length > 3) throw new CalcError('Syntax ERROR');
        const eqs = parts.map((p) => {
          if (p.includes('=')) {
            const i = p.indexOf('=');
            return { l: prepare(p.slice(0, i), 'rad'), r: prepare(p.slice(i + 1), 'rad') };
          }
          return { l: prepare(p, 'rad'), r: '0' };
        });
        const vars = [...new Set(eqs.flatMap((e) => N(`(${e.l})-(${e.r})`).variables()))].sort();
        if (!vars.length) throw new CalcError('Syntax ERROR');
        if (vars.length !== eqs.length) throw new CalcError('عدد المعادلات لازم يساوي عدد المجاهيل');

        if (eqs.length === 1) {
          const v0 = vars[0];
          const str = N.solve(`(${eqs[0].l})-(${eqs[0].r})`, v0).toString().trim().replace(/^\[|\]$/g, '');
          const roots = splitTop(str);
          if (!roots.length) { out.push({ label: 'النتيجة', text: 'لا يوجد حل' }); break; }
          roots.forEach((root, k) => {
            const r = N(root);
            const row = { label: `الحل ${k + 1}`, text: `${v0} = ${pretty(r.toString())}`, latex: `${v0} = ${r.toTeX()}` };
            if (!hasVars(r) && !/^-?\d+$/.test(r.toString())) {
              try { const a = decimalOf(r); if (a !== null) row.approx = a; } catch (_) { /* تجاهل */ }
            }
            out.push(row);
          });
        } else {
          let sol = N.solveEquations(eqs.map((e) => `${e.l}=${e.r}`));
          if (!Array.isArray(sol)) sol = Object.entries(sol);
          if (!sol.length) { out.push({ label: 'النتيجة', text: 'لا يوجد حل' }); break; }
          const parsed = sol.map(([name, val]) => {
            const s = typeof val === 'number' ? toFrac(val) : String(val);
            const r = N(s);
            return { name, text: pretty(r.toString()), tex: r.toTeX() };
          });
          out.push({
            label: 'الحل',
            text: parsed.map((p) => `${p.name} = ${p.text}`).join('  ,  '),
            latex: parsed.map((p) => `${p.name} = ${p.tex}`).join(',\\ '),
          });
        }
        break;
      }

      case 'quadratic': {
        const a = P('a'), b = P('b'), c = P('c');
        if (numVal(a) === 0) throw new CalcError('a ≠ 0');
        const disc = N(`(${b})^2-4*(${a})*(${c})`);
        out.push(item('المميز Δ = b² − 4ac', disc));
        const dv = Number(disc.evaluate().text('decimals'));
        if (!Number.isNaN(dv)) {
          out.push({ label: 'نوع الجذرين',
            text: dv > 0 ? 'جذران حقيقيان مختلفان' : dv === 0 ? 'جذران حقيقيان متساويان' : 'جذران مركبان (تخيليان)' });
        }
        out.push(item('الجذر 1', `(-(${b})+sqrt(${disc.toString()}))/(2*(${a}))`));
        out.push(item('الجذر 2', `(-(${b})-sqrt(${disc.toString()}))/(2*(${a}))`));
        out.push(item('مجموع الجذرين = −b/a', `-(${b})/(${a})`));
        out.push(item('حاصل ضرب الجذرين = c/a', `(${c})/(${a})`));
        const h = N(`-(${b})/(2*(${a}))`);
        const k = N(`(${a})*(${h.toString()})^2+(${b})*(${h.toString()})+(${c})`);
        out.push({ label: 'رأس المنحنى',
          text: `(${pretty(h.toString())} , ${pretty(k.toString())})`,
          latex: `\\left(${h.toTeX()},\\ ${k.toTeX()}\\right)` });
        break;
      }

      case 'algebra': {
        const op = d.op;
        if (!['factor', 'expand', 'simplify'].includes(op)) throw new CalcError('Syntax ERROR');
        const labels = { factor: 'التحليل', expand: 'النشر', simplify: 'التبسيط' };
        out.push(item(labels[op], N(`${op}(${P('expr')})`), false));
        break;
      }

      case 'stats': {
        const nums = String(d.data || '').trim().split(/[,\s;،]+/).filter(Boolean).map(Number);
        if (!nums.length || nums.length > 2000 || nums.some((x) => !Number.isFinite(x))) throw new CalcError('Syntax ERROR');
        const n = nums.length;
        const sum = nums.reduce((p, q) => p + q, 0);
        const mean = sum / n;
        const sorted = [...nums].sort((p, q) => p - q);
        const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
        const ss = nums.reduce((p, q) => p + (q - mean) ** 2, 0);
        const freq = new Map();
        nums.forEach((x) => freq.set(x, (freq.get(x) || 0) + 1));
        const top = Math.max(...freq.values());
        const modes = [...freq].filter(([, c]) => c === top).map(([x]) => x);
        const rows = [
          ['العدد n', n], ['المجموع Σx', sum], ['الوسط الحسابي x̄', mean], ['الوسيط', median],
          ['أكبر قيمة', sorted[n - 1]], ['أصغر قيمة', sorted[0]], ['المدى', sorted[n - 1] - sorted[0]],
          ['التباين (مجتمع) σ²', ss / n], ['الانحراف المعياري (مجتمع) σ', Math.sqrt(ss / n)],
        ];
        if (n > 1) rows.push(['التباين (عينة) s²', ss / (n - 1)], ['الانحراف المعياري (عينة) s', Math.sqrt(ss / (n - 1))]);
        rows.forEach(([label, val]) => out.push({ label, text: fmtReal(val) }));
        out.push({ label: 'المنوال', text: (modes.length === freq.size && n > 1) ? 'لا يوجد' : modes.map(fmtReal).join(' , ') });
        break;
      }

      default: throw new CalcError('Syntax ERROR');
    }
    return out;
  }

  function tool(d) {
    try { return { ok: true, items: runTool(d) }; }
    catch (e) { return fail(e); }
  }

  window.Engine = { calc, tool };
})();