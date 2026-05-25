import { LEARNING_KEY, VOCAB_KEY } from "./config.js";
import { state } from "./state.js";
import {
  escapeHtml,
  findVocabSpans,
  rangesOverlap,
  shuffle,
} from "./utils.js";

export function getRevealedSet(lessonNum) {
  if (!state.revealedByLesson[lessonNum]) {
    state.revealedByLesson[lessonNum] = new Set();
  }
  return state.revealedByLesson[lessonNum];
}

function getLessonVocabKeys(vocabulary) {
  return new Set(
    (vocabulary || [])
      .filter((v) => v.word && v.word.trim().length >= 2)
      .map((v) => v.word.trim().toLowerCase())
  );
}

export function updateLearningProgress(vocabulary) {
  const prog = document.getElementById("learning-progress");
  if (!prog || !state.learningMode) return;
  const keys = getLessonVocabKeys(vocabulary);
  const revealed = getRevealedSet(state.currentLesson);
  let count = 0;
  keys.forEach((k) => {
    if (revealed.has(k)) count += 1;
  });
  const total = keys.size;
  prog.hidden = false;
  prog.textContent = `已填写 ${count} / ${total}`;
  prog.classList.toggle("done", total > 0 && count >= total);
}

export function updateModeUI() {
  const layout = document.getElementById("layout");
  const meaningWrap = document.getElementById("meaning-toggle-wrap");
  const prog = document.getElementById("learning-progress");
  const resetBtn = document.getElementById("reset-learning");
  const learningInput = document.getElementById("learning-mode");
  if (layout) layout.classList.toggle("learning-mode", state.learningMode);
  if (learningInput) learningInput.checked = state.learningMode;
  if (meaningWrap) meaningWrap.hidden = state.learningMode;
  if (resetBtn) resetBtn.hidden = !state.learningMode;
  if (prog) prog.hidden = !state.learningMode;
  if (!state.learningMode && prog) prog.classList.remove("done");
  if (!state.learningMode) {
    closeVocabQuiz();
    resetQuizPanelPlaceholder();
  }
}

function resetQuizPanelPlaceholder() {
  const panel = document.getElementById("vocab-quiz-panel");
  if (!panel) return;
  panel.innerHTML =
    '<p class="panel-placeholder">学习模式下，点击文中色块，在此选词填入</p>';
}

export function closeVocabQuiz() {
  document.querySelectorAll(".vocab-quiz-target.is-active").forEach((el) => {
    el.classList.remove("is-active");
  });
  resetQuizPanelPlaceholder();
  state.activeQuizWord = null;
}

function buildQuizOptions(vocabulary, correctKey) {
  const all = (vocabulary || []).filter((v) => v.word && v.word.trim().length >= 2);
  const correct = all.find((v) => v.word.trim().toLowerCase() === correctKey);
  if (!correct) return [];
  const wrong = shuffle(
    all.filter((v) => v.word.trim().toLowerCase() !== correctKey)
  ).slice(0, Math.min(5, all.length - 1));
  return shuffle([correct, ...wrong]);
}

function openVocabQuiz(maskEl, vocabulary) {
  const wordKey = maskEl.dataset.word;
  if (!wordKey) return;
  closeVocabQuiz();
  state.activeQuizWord = wordKey;
  maskEl.classList.add("is-active");

  const panel = document.getElementById("vocab-quiz-panel");
  if (!panel) return;

  const options = buildQuizOptions(vocabulary, wordKey);
  panel.innerHTML = `<p class="quiz-title">选择生词</p>
    <p class="quiz-hint">选对后填入文中色块</p>
    <div class="vocab-quiz-options"></div>`;

  const container = panel.querySelector(".vocab-quiz-options");
  options.forEach((v) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vocab-quiz-option";
    btn.innerHTML = `${escapeHtml(v.word)}<span class="opt-meaning">${escapeHtml(v.pos || "")} ${escapeHtml(v.meaning_zh || "")}</span>`;
    btn.addEventListener("click", () => {
      const picked = v.word.trim().toLowerCase();
      if (picked === wordKey) {
        getRevealedSet(state.currentLesson).add(wordKey);
        closeVocabQuiz();
        refreshPassage();
        updateLearningProgress(vocabulary);
        const revealed = document.querySelector(
          `.vocab-revealed[data-word="${CSS.escape(wordKey)}"]`
        );
        revealed?.classList.add("flash-ok");
        setTimeout(() => revealed?.classList.remove("flash-ok"), 600);
      } else {
        btn.classList.add("wrong");
        setTimeout(() => btn.classList.remove("wrong"), 400);
      }
    });
    container.appendChild(btn);
  });
}

export function renderPassageHtml(text, vocabulary) {
  if (!text) return "";
  return highlightVocabulary(text, vocabulary, {
    showMeaning: state.vocabMarkVisible && !state.learningMode,
    learningMode: state.learningMode,
    revealedSet: getRevealedSet(state.currentLesson),
  });
}

export function refreshPassage() {
  const item = state.bookData?.lessons.find((l) => l.lesson === state.currentLesson);
  const passage = document.querySelector(".passage");
  if (!item?.comprehension?.passage_en || !passage) return;
  passage.innerHTML = renderPassageHtml(
    item.comprehension.passage_en,
    item.vocabulary
  );
  updateLearningProgress(item.vocabulary);
}

export function bindPassageEvents(vocabulary) {
  const passage = document.querySelector(".passage");
  if (!passage) return;
  passage.onclick = (e) => {
    if (!state.learningMode) return;
    const mask = e.target.closest(".vocab-quiz-target");
    if (mask) {
      e.stopPropagation();
      openVocabQuiz(mask, vocabulary);
    }
  };
}

function highlightVocabulary(text, vocabulary, options = {}) {
  const { showMeaning = true, learningMode: learn = false, revealedSet = new Set() } =
    options;
  if (!text) return "";
  const plain = escapeHtml(text);
  if (!vocabulary?.length) return plain;

  const wordMap = new Map();
  for (const v of vocabulary) {
    const w = v.word?.trim();
    if (w && w.length >= 2) wordMap.set(w.toLowerCase(), v);
  }

  const seen = new Set();
  const words = [...wordMap.values()].sort(
    (a, b) => b.word.length - a.word.length
  );

  const spans = [];
  for (const v of words) {
    const word = v.word.trim();
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const tip = escapeHtml(`${v.pos || ""} ${v.meaning_zh || ""}`.trim());
    for (const span of findVocabSpans(plain, word, key, tip)) {
      if (spans.some((s) => rangesOverlap(span.start, span.end, s.start, s.end)))
        continue;
      spans.push(span);
    }
  }

  spans.sort((a, b) => a.start - b.start);
  let html = "";
  let pos = 0;
  for (const s of spans) {
    html += plain.slice(pos, s.start);
    if (learn) {
      if (revealedSet.has(s.key)) {
        html += `<span class="vocab-revealed" data-word="${s.key}" title="${s.tip}">${s.text}</span>`;
      } else {
        html += `<span class="vocab-mask vocab-quiz-target" data-word="${s.key}" role="button" tabindex="0">${s.text}</span>`;
      }
    } else if (showMeaning) {
      html += `<span class="vocab-highlight" tabindex="0" data-tip="${s.tip}">${s.text}</span>`;
    } else {
      html += `<span class="vocab-mask">${s.text}</span>`;
    }
    pos = s.end;
  }
  html += plain.slice(pos);
  return html;
}

export function bindVocabControls(vocabulary) {
  document.getElementById("vocab-toggle")?.addEventListener("change", (e) => {
    state.vocabMarkVisible = e.target.checked;
    localStorage.setItem(VOCAB_KEY, state.vocabMarkVisible ? "1" : "0");
    refreshPassage();
  });

  document.getElementById("learning-mode")?.addEventListener("change", (e) => {
    state.learningMode = e.target.checked;
    localStorage.setItem(LEARNING_KEY, state.learningMode ? "1" : "0");
    closeVocabQuiz();
    updateModeUI();
    refreshPassage();
  });

  document.getElementById("reset-learning")?.addEventListener("click", () => {
    state.revealedByLesson[state.currentLesson] = new Set();
    closeVocabQuiz();
    refreshPassage();
  });
}
