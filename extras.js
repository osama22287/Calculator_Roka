(() => {
  // ---------------- رسالة التشجيع ----------------
  const msgs = [
    'ربنا يوفقك ويفتحها عليكِ يا قمر 🌸',
    'كل مسألة بتحلّيها بتقرّبك من حلمك 💪',
    'إنتِ قدها وأكتر 💖',
    'خطوة صغيرة كل يوم بتعمل فرق كبير ✨',
    'ذاكري بحب، والنتيجة هتفرّحك 🦋',
    'ثقي في الله وفي نفسك، إنتِ قدها 🌷'
  ];
  const heroMsg = document.getElementById('heroMsg');
  if (heroMsg) heroMsg.textContent = msgs[Math.floor(Math.random() * msgs.length)];

  // ---------------- العناصر الطايرة ----------------
  const box = document.querySelector('.floaties');
  if (box) {
    const icons = ['💗', '✨', '🌸', '🦋', '⭐', '💜'];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.textContent = icons[i % icons.length];
      s.style.left = Math.random() * 100 + '%';
      s.style.fontSize = (14 + Math.random() * 16) + 'px';
      s.style.animationDuration = (10 + Math.random() * 12) + 's';
      s.style.animationDelay = (-Math.random() * 20) + 's';
      box.append(s);
    }
  }

  // ---------------- لوحة الرموز ----------------
  const pad = document.getElementById('symPad');
  if (!pad) return;

  // [الشكل الظاهر، النص المُدرج، عدد الخطوات للرجوع بالمؤشر]
  const GROUPS = [
    ['المتغيرات', [['x','x'],['y','y'],['z','z'],['t','t']]],
    ['العمليات', [['+','+'],['−','-'],['×','*'],['÷','/'],['^','^'],['=','='],['(','('],[')',')'],[',',','],[';',';']]],
    ['القوى والجذور', [['x²','^2'],['x³','^3'],['xʸ','^()',1],['√','sqrt()',1],['∛','cbrt()',1],['ʸ√x','root(,)',2],['|x|','abs()',1]]],
    ['ثوابت', [['π','pi'],['e','e'],['i','i'],['∞','oo']]],
    ['المثلثات', [['sin','sin()',1],['cos','cos()',1],['tan','tan()',1],['sin⁻¹','asin()',1],['cos⁻¹','acos()',1],['tan⁻¹','atan()',1]]],
    ['اللوغاريتمات', [['ln','ln()',1],['log','log()',1],['logₐ','logb(,)',2],['eˣ','e^()',1],['10ˣ','10^()',1]]],
    ['أخرى', [['n!','fact()',1],['nPr','npr(,)',2],['nCr','ncr(,)',2]]],
  ];

  const FN = /(asin|acos|atan|sin|cos|tan|ln|logb|log|sqrt|cbrt|root|abs|fact|npr|ncr)$/;
  const OK = 'input:not([type]), input[type="text"], textarea';
  let target = document.querySelector('form.tool ' + OK);

  document.querySelectorAll('form.tool').forEach((f) =>
    f.addEventListener('focusin', (e) => { if (e.target.matches(OK)) target = e.target; })
  );

  function put(text, back = 0) {
    if (!target) return;
    target.focus();
    const s = target.selectionStart, e = target.selectionEnd;
    target.value = target.value.slice(0, s) + text + target.value.slice(e);
    const p = s + text.length - back;
    target.setSelectionRange(p, p);
  }

  function backspace() {
    if (!target) return;
    target.focus();
    let s = target.selectionStart, e = target.selectionEnd, v = target.value;
    if (s !== e) {
      target.value = v.slice(0, s) + v.slice(e);
    } else if (s > 0) {
      let from = s - 1, to = s;
      if (v[s - 1] === '(' && v[s] === ')') {      // يحذف القوسين واسم الدالة معًا
        to = s + 1;
        const m = v.slice(0, s - 1).match(FN);
        if (m) from = s - 1 - m[0].length;
      }
      target.value = v.slice(0, from) + v.slice(to);
      s = from;
    }
    target.setSelectionRange(s, s);
  }

  function move(d) {
    if (!target) return;
    target.focus();
    const p = Math.max(0, Math.min(target.value.length, target.selectionStart + d));
    target.setSelectionRange(p, p);
  }

  function btn(label, cls, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sym ' + cls;
    b.textContent = label;
    b.addEventListener('mousedown', (e) => e.preventDefault()); // يحافظ على مكان المؤشر
    b.addEventListener('click', fn);
    return b;
  }

  const title = document.createElement('h3');
  title.textContent = '⌨️ لوحة الرموز';
  const tip = document.createElement('p');
  tip.className = 'sym-tip';
  tip.textContent = 'اضغطي على الخانة أولًا ثم اختاري الرمز';
  pad.append(title, tip);

  GROUPS.forEach(([name, keys]) => {
    const h = document.createElement('div');
    h.className = 'sym-title';
    h.textContent = name;
    const grid = document.createElement('div');
    grid.className = 'sym-grid';
    keys.forEach(([label, text, back]) => grid.append(btn(label, '', () => put(text, back || 0))));
    pad.append(h, grid);
  });

  const ctl = document.createElement('div');
  ctl.className = 'sym-grid';
  ctl.append(
    btn('◀', 'ctl', () => move(-1)),
    btn('▶', 'ctl', () => move(1)),
    btn('⌫', 'del', backspace),
    btn('مسح الخانة', 'ac wide', () => { if (target) { target.value = ''; target.focus(); } })
  );
  pad.append(ctl);
})();