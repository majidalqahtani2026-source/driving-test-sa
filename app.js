// منطق التطبيق: ٥ اختبارات، ترتيب عشوائي للأسئلة والخيارات في كل محاولة
const app = document.getElementById('app');
const EXAM_TIME = 15 * 60; // ثانية
const PASS = 0.75;
const NQ = 20; // عدد أسئلة كل اختبار

// خلط عشوائي (Fisher-Yates)
function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// بناء اختبار فريد: أسئلة عشوائية من البنك + خيارات معاد ترتيبها
function buildExam() {
  // توزيع: 6 إشارات + 14 من البقية، ثم خلط كامل
  const signs = shuffle(BANK.filter(q => q.sec === 'S')).slice(0, 6);
  const rest = shuffle(BANK.filter(q => q.sec !== 'S')).slice(0, NQ - 6);
  const qs = shuffle([...signs, ...rest]).map(q => {
    const paired = q.opts.map((text, i) => ({ text, correct: i === q.a }));
    const mixed = shuffle(paired);
    return {
      q: q.q,
      sign: q.s ? SIGNS[q.s] : null,
      opts: mixed.map(m => m.text),
      answerIdx: mixed.findIndex(m => m.correct),
      picked: null
    };
  });
  return qs;
}

const EXAMS = [
  { id: 1, name: 'الاختبار الأول',  desc: 'أسئلة شاملة: إشارات وقوانين وسلامة' },
  { id: 2, name: 'الاختبار الثاني', desc: 'تركيز على الإشارات والأولويات' },
  { id: 3, name: 'الاختبار الثالث', desc: 'قوانين السير والمخالفات' },
  { id: 4, name: 'الاختبار الرابع', desc: 'القيادة الآمنة وحالات الطريق' },
  { id: 5, name: 'الاختبار الخامس', desc: 'محاكاة نهائية شاملة' },
];

let state = null;

function home() {
  state = null;
  app.innerHTML = `
    <div class="card">
      <h2 style="margin-top:0">اختر اختبارًا للبدء</h2>
      <p style="color:#556;line-height:1.8">كل اختبار فيه ${NQ} سؤالًا بمتناوب ${EXAM_TIME/60} دقيقة، والنجاح ${PASS*100}%.<br>
      <b>الأسئلة والخيارات تُرتَّب عشوائيًا في كل محاولة</b> — لن تتكرر التجربة نفسها.</p>
      <div class="exam-grid">
        ${EXAMS.map(e => `
          <div class="exam-card" onclick="startExam(${e.id})">
            <h3>${e.name}</h3>
            <small>${e.desc}</small>
          </div>`).join('')}
      </div>
    </div>`;
}

function startExam(id) {
  const meta = EXAMS.find(e => e.id === id);
  state = {
    examId: id, examName: meta.name,
    qs: buildExam(), idx: 0,
    startTime: Date.now(), timeLeft: EXAM_TIME,
    timer: null, finished: false
  };
  state.timer = setInterval(tick, 1000);
  renderQuestion();
}

function tick() {
  if (!state || state.finished) return;
  state.timeLeft--;
  const el = document.getElementById('timer');
  if (el) el.textContent = fmt(state.timeLeft);
  if (state.timeLeft <= 0) finish();
}

function fmt(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

function renderQuestion() {
  const q = state.qs[state.idx];
  const n = state.idx + 1, total = state.qs.length;
  app.innerHTML = `
    <div class="card">
      <div class="meta">
        <span>${state.examName}</span>
        <span class="timer" id="timer">⏱ ${fmt(state.timeLeft)}</span>
        <span>سؤال ${n} / ${total}</span>
      </div>
      <div class="progress"><div style="width:${n / total * 100}%"></div></div>
      <p class="qtext">${q.q}</p>
      ${q.sign ? `<div class="sign-img">${q.sign}</div>` : ''}
      <div id="opts">
        ${q.opts.map((o, i) => `<button class="opt" onclick="answer(${i})">${o}</button>`).join('')}
      </div>
      <div id="fb"></div>
      <div style="display:flex; gap:8px; margin-top:14px">
        <button class="btn secondary" id="nextBtn" style="display:none" onclick="next()">التالي ←</button>
      </div>
    </div>`;
  if (q.picked !== null) showAnswered(q);
}

function answer(i) {
  const q = state.qs[state.idx];
  if (q.picked !== null) return;
  q.picked = i;
  showAnswered(q);
}

function showAnswered(q) {
  const btns = document.querySelectorAll('.opt');
  btns.forEach((b, i) => {
    b.disabled = true;
    if (i === q.answerIdx) b.classList.add('correct');
    if (i === q.picked && q.picked !== q.answerIdx) b.classList.add('wrong');
  });
  const ok = q.picked === q.answerIdx;
  document.getElementById('fb').innerHTML = `
    <div class="feedback ${ok ? 'ok' : 'no'}">
      ${ok ? '✅ إجابة صحيحة' : `❌ إجابة خاطئة — الصحيح: <b>${q.opts[q.answerIdx]}</b>`}
    </div>`;
  const nb = document.getElementById('nextBtn');
  nb.style.display = 'block';
  nb.textContent = state.idx === state.qs.length - 1 ? 'عرض النتيجة 🏁' : 'التالي ←';
}

function next() {
  if (state.idx === state.qs.length - 1) return finish();
  state.idx++;
  renderQuestion();
}

function finish() {
  if (state.finished) return;
  state.finished = true;
  clearInterval(state.timer);
  const correct = state.qs.filter(q => q.picked === q.answerIdx).length;
  const total = state.qs.length;
  const pct = correct / total;
  const passed = pct >= PASS;
  const wrongs = state.qs.map((q, i) => ({ q, i })).filter(x => x.q.picked !== x.q.answerIdx);
  app.innerHTML = `
    <div class="card" style="text-align:center">
      <h2>${state.examName} — النتيجة</h2>
      <div class="score-big ${passed ? 'pass' : 'fail'}">${Math.round(pct * 100)}%</div>
      <h3 class="${passed ? 'pass' : 'fail'}">${passed ? '🎉 ناجح — مبروك!' : '📚 راسب — راجع الأخطاء وأعد المحاولة'}</h3>
      <p style="color:#556">أجبت ${correct} من ${total} بشكل صحيح (النجاح من ${PASS * 100}%)</p>
      <button class="btn" onclick="startExam(${state.examId})">🔄 إعادة نفس الاختبار (أسئلة جديدة الترتيب)</button>
      <button class="btn secondary" onclick="home()">القائمة الرئيسية</button>
    </div>
    ${wrongs.length ? `
    <div class="card">
      <h3 style="margin-top:0">مراجعة الأخطاء (${wrongs.length})</h3>
      ${wrongs.map(({ q, i }) => `
        <div class="review-q">
          <b>سؤال ${i + 1}:</b> ${q.q}
          ${q.sign ? `<div class="sign-img" style="max-width:100px">${q.sign}</div>` : ''}<br>
          <b class="bad">إجابتك:</b> ${q.picked !== null ? q.opts[q.picked] : 'لم يجب'}<br>
          <b style="color:var(--green)">الصحيح:</b> ${q.opts[q.answerIdx]}
        </div>`).join('')}
    </div>` : ''}`;
}

home();
