import { BATCH_SIZE, MATCH_LEARN_KEY, MATCH_PLAY_MODE_KEY } from "./config.js";
import { state } from "./state.js";
import { escapeHtml, shuffle } from "../utils.js";

const MODE_LABELS = {
  study: "学习模式",
  random: "随机模式",
  quiz: "答题模式",
};

function isStudyMode() {
  return state.playMode === "study";
}

function isBatchCheckMode() {
  return state.playMode === "quiz" || state.playMode === "random";
}

function getActiveItems() {
  return state.activeItemIds
    .map((id) => state.itemMap.get(id))
    .filter(Boolean);
}

function saveProgress() {
  localStorage.setItem(MATCH_LEARN_KEY, JSON.stringify([...state.learnDone]));
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(MATCH_LEARN_KEY);
    state.learnDone = raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    state.learnDone = new Set();
  }
}

function getRemainingItems() {
  return state.items.filter((item) => !state.learnDone.has(item.id));
}

function getBatchNumber() {
  if (!state.items.length) return 0;
  return Math.floor(state.learnDone.size / BATCH_SIZE) + 1;
}

function reverseLinks() {
  const rev = {};
  for (const [leftId, rightId] of Object.entries(state.userLinks)) {
    rev[rightId] = leftId;
  }
  return rev;
}

function unlinkLeft(leftId) {
  if (state.confirmedIds.has(leftId)) return;
  delete state.userLinks[leftId];
  if (state.selectedLeft === leftId) state.selectedLeft = null;
}

function unlinkRight(rightId) {
  const leftId = reverseLinks()[rightId];
  if (leftId) unlinkLeft(leftId);
}

function clearBatchState() {
  state.selectedLeft = null;
  state.userLinks = {};
  state.confirmedIds = new Set();
  state.flashWrongId = null;
  state.checked = false;
  state.batchPerfect = false;
  state.rightOrder = [];
}

function pickNextBatch() {
  const remaining = getRemainingItems();
  if (!remaining.length) return [];
  const pool = state.playMode === "random" ? shuffle(remaining) : remaining;
  return pool.slice(0, Math.min(BATCH_SIZE, pool.length)).map((item) => item.id);
}

function markItemsLearned(ids) {
  for (const id of ids) state.learnDone.add(id);
  saveProgress();
}

function finishBatch() {
  markItemsLearned(state.activeItemIds);
  state.batchPerfect = true;
  const done = state.learnDone.size;
  const allDone = done >= state.items.length;
  const resultEl = document.getElementById("match-result");
  if (resultEl) {
    resultEl.hidden = false;
    resultEl.classList.add("is-perfect");
    resultEl.textContent = allDone
      ? `本批完成！${state.items.length} 题全部学完 🎉`
      : `本批完成！总进度 ${done}/${state.items.length}，点击继续下一批`;
  }
  renderQuiz();
}

function tryCompleteStudyBatch() {
  if (!isStudyMode()) return;
  const active = getActiveItems();
  if (active.length && active.every((item) => state.confirmedIds.has(item.id))) {
    finishBatch();
  }
}

function updateModeUI() {
  document.querySelectorAll(".match-mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === state.playMode);
  });

  const hint = document.getElementById("match-hint");
  if (!hint) return;
  if (state.playMode === "study") {
    hint.textContent =
      "学习模式：点左列再点右列，选对立即锁定；选错仅取消选中，可重新尝试，需逐个完成本批 5 题";
  } else if (state.playMode === "random") {
    hint.textContent =
      "随机模式：从未学题目中随机抽 5 题，全部连线后点「检查答案」，全对才进入下一批";
  } else {
    hint.textContent =
      "答题模式：按顺序每次 5 题，全部连线后点「检查答案」，全对才进入下一批";
  }
}

export function setPlayMode(mode) {
  state.playMode = mode;
  localStorage.setItem(MATCH_PLAY_MODE_KEY, mode);
  updateModeUI();
  startBatch();
}

export function startBatch() {
  clearBatchState();
  state.activeItemIds = pickNextBatch();
  if (state.activeItemIds.length) {
    state.rightOrder = shuffle([...state.activeItemIds]);
  }
  const resultEl = document.getElementById("match-result");
  if (resultEl) {
    resultEl.hidden = true;
    resultEl.classList.remove("is-perfect");
  }
  renderQuiz();
}

export function resetQuiz() {
  clearBatchState();
  if (state.activeItemIds.length) {
    state.rightOrder = shuffle([...state.activeItemIds]);
  }
  const resultEl = document.getElementById("match-result");
  if (resultEl) resultEl.hidden = true;
  renderQuiz();
}

export function resetAllProgress() {
  state.learnDone = new Set();
  saveProgress();
  startBatch();
}

function updateProgressUI() {
  const total = state.items.length;
  const done = state.learnDone.size;
  const pct = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("learn-progress-bar").style.width = `${pct}%`;

  const text = document.getElementById("learn-progress-text");
  if (text) {
    text.textContent = `${done} / ${total}`;
    text.classList.toggle("is-done", done >= total && total > 0);
  }

  const batchEl = document.getElementById("learn-batch-label");
  if (batchEl) {
    const label = MODE_LABELS[state.playMode];
    const batch = getBatchNumber();
    const batchSize = state.activeItemIds.length;
    if (done >= total && total > 0) {
      batchEl.textContent = "已全部学完";
    } else if (batchSize) {
      batchEl.textContent = `${label} · 第 ${batch} 批 · 本批 ${batchSize} 题`;
    } else {
      batchEl.textContent = `${label} · 第 ${batch} 批`;
    }
  }
  updateModeUI();
}

export function renderQuiz() {
  const board = document.getElementById("match-board");
  const metaEl = document.getElementById("match-meta");
  const resultEl = document.getElementById("match-result");
  if (!board) return;

  updateProgressUI();

  const total = state.items.length;
  const done = state.learnDone.size;
  const activeItems = getActiveItems();

  if (done >= total && total > 0) {
    metaEl.textContent = "恭喜完成全部题目";
    board.innerHTML = `<div class="match-complete">
      <p>全部 ${total} 题已学完！</p>
      <p class="match-complete-meta">从 0 到完成，坚持下来了</p>
      <button type="button" class="match-btn match-btn-primary" id="btn-restart">重新开始</button>
    </div>`;
    document.getElementById("btn-restart")?.addEventListener("click", resetAllProgress);
    if (resultEl) resultEl.hidden = true;
    updateToolbar();
    return;
  }

  if (!activeItems.length) {
    board.innerHTML = '<p class="empty">暂无题目</p>';
    updateToolbar();
    return;
  }

  const topics = [...new Set(activeItems.map((i) => i.section))];
  metaEl.textContent = topics.length === 1 ? topics[0] : `${topics[0]} 等 ${topics.length} 节`;

  const itemMap = new Map(activeItems.map((item) => [item.id, item]));
  const rightToLeft = reverseLinks();

  const leftHtml = activeItems
    .map((item) => {
      const linked = state.userLinks[item.id];
      const confirmed = state.confirmedIds.has(item.id);
      const classes = ["match-item", "match-left"];
      if (state.selectedLeft === item.id) classes.push("is-selected");
      if (linked) classes.push("is-linked");
      if (confirmed) classes.push("is-confirmed");
      if (state.checked) classes.push(linked === item.id ? "is-correct" : "is-wrong");

      const badge =
        linked && !state.checked
          ? `<span class="match-badge">${Object.keys(state.userLinks).indexOf(item.id) + 1}</span>`
          : "";
      const disabled = state.checked || confirmed;
      const disabledAttr = disabled ? ' aria-disabled="true" tabindex="-1"' : ' role="button" tabindex="0"';
      return `<div class="${classes.join(" ")}" data-side="left" data-id="${item.id}"${disabledAttr}>${badge}${escapeHtml(item.term)}</div>`;
    })
    .join("");

  const rightHtml = state.rightOrder
    .map((id) => {
      const item = itemMap.get(id);
      if (!item) return "";
      const linkedLeft = rightToLeft[id];
      const classes = ["match-item", "match-right"];
      if (linkedLeft) classes.push("is-linked");
      if (linkedLeft && state.confirmedIds.has(linkedLeft)) classes.push("is-confirmed");
      if (state.flashWrongId === id) classes.push("is-flash-wrong");
      if (state.checked && linkedLeft) {
        classes.push(linkedLeft === id ? "is-correct" : "is-wrong");
      }

      const badge =
        linkedLeft && !state.checked
          ? `<span class="match-badge">${Object.keys(state.userLinks).indexOf(linkedLeft) + 1}</span>`
          : "";
      const usedByConfirmed = linkedLeft && state.confirmedIds.has(linkedLeft);
      const disabled = state.checked || usedByConfirmed;
      const disabledAttr = disabled ? ' aria-disabled="true" tabindex="-1"' : ' role="button" tabindex="0"';
      return `<div class="${classes.join(" ")}" data-side="right" data-id="${id}"${disabledAttr}>${badge}${escapeHtml(item.definition)}</div>`;
    })
    .join("");

  board.innerHTML = `
    <div class="match-col match-col-left">
      <h4>术语</h4>
      <div class="match-list">${leftHtml}</div>
    </div>
    <div class="match-col match-col-right">
      <h4>说明</h4>
      <div class="match-list">${rightHtml}</div>
    </div>
  `;

  board.querySelectorAll(".match-item").forEach((el) => {
    el.addEventListener("click", () => {
      if (el.getAttribute("aria-disabled") === "true") return;
      if (window.getSelection()?.toString()) return;
      handleItemClick(el.dataset.side, el.dataset.id);
    });
    el.addEventListener("keydown", (e) => {
      if (el.getAttribute("aria-disabled") === "true") return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      handleItemClick(el.dataset.side, el.dataset.id);
    });
  });

  updateToolbar();
}

function updateToolbar() {
  const active = getActiveItems();
  const total = active.length;
  const linked = Object.keys(state.userLinks).length;
  const allDone = state.learnDone.size >= state.items.length;

  const checkBtn = document.getElementById("btn-check");
  const nextBtn = document.getElementById("btn-next");
  const resetBtn = document.getElementById("btn-reset");

  if (checkBtn) {
    checkBtn.hidden = allDone || isStudyMode();
    if (!checkBtn.hidden) {
      checkBtn.disabled = total === 0 || state.checked || linked < total;
      checkBtn.textContent =
        linked < total ? `检查答案（${linked}/${total}）` : "检查答案";
    }
  }

  if (nextBtn) {
    nextBtn.hidden = !state.batchPerfect || allDone;
    if (!nextBtn.hidden) {
      const remaining = getRemainingItems().length;
      const nextCount = Math.min(BATCH_SIZE, remaining);
      if (state.playMode === "random") {
        nextBtn.textContent = "再来随机 5 题";
      } else {
        nextBtn.textContent = `继续下一批（${nextCount} 题）`;
      }
    }
  }

  if (resetBtn) {
    resetBtn.disabled =
      allDone || total === 0 || (isBatchCheckMode() && state.checked && state.batchPerfect);
  }
}

function handleStudyPair(leftId, rightId) {
  state.selectedLeft = null;

  if (rightId === leftId) {
    state.userLinks[leftId] = rightId;
    state.confirmedIds.add(leftId);
    tryCompleteStudyBatch();
    renderQuiz();
    return;
  }

  state.flashWrongId = rightId;
  renderQuiz();

  setTimeout(() => {
    state.flashWrongId = null;
    renderQuiz();
  }, 450);
}

function handleItemClick(side, id) {
  if (state.checked) return;

  if (isStudyMode()) {
    if (side === "left") {
      if (state.confirmedIds.has(id)) return;
      state.selectedLeft = state.selectedLeft === id ? null : id;
      renderQuiz();
      return;
    }

    if (!state.selectedLeft) {
      if (reverseLinks()[id] && !state.confirmedIds.has(reverseLinks()[id])) {
        unlinkRight(id);
        renderQuiz();
      }
      return;
    }

    if (state.confirmedIds.has(state.selectedLeft)) {
      state.selectedLeft = null;
      renderQuiz();
      return;
    }

    handleStudyPair(state.selectedLeft, id);
    return;
  }

  if (side === "left") {
    if (state.userLinks[id]) unlinkLeft(id);
    else state.selectedLeft = state.selectedLeft === id ? null : id;
    renderQuiz();
    return;
  }

  if (state.selectedLeft) {
    unlinkRight(id);
    state.userLinks[state.selectedLeft] = id;
    state.selectedLeft = null;
    renderQuiz();
    return;
  }

  if (reverseLinks()[id]) {
    unlinkRight(id);
    renderQuiz();
  }
}

export function checkAnswers() {
  if (!isBatchCheckMode()) return;

  const items = getActiveItems();
  if (!items.length) return;
  if (Object.keys(state.userLinks).length < items.length) return;

  state.checked = true;
  state.selectedLeft = null;

  let correct = 0;
  for (const item of items) {
    if (state.userLinks[item.id] === item.id) correct += 1;
  }

  const perfect = correct === items.length;
  const resultEl = document.getElementById("match-result");
  if (resultEl) {
    resultEl.hidden = false;
    resultEl.classList.toggle("is-perfect", perfect);
    if (perfect) {
      finishBatch();
      return;
    }
    resultEl.textContent = `答对 ${correct}/${items.length}，需全部正确才能进入下一批，请重置再试`;
  }

  renderQuiz();
}

export function initData(data) {
  state.items = data.items || [];
  state.itemMap = new Map(state.items.map((item) => [item.id, item]));
}

export function initQuizPanel() {
  loadProgress();
  const saved = localStorage.getItem(MATCH_PLAY_MODE_KEY);
  state.playMode = saved === "study" || saved === "random" || saved === "quiz" ? saved : "quiz";

  document.getElementById("btn-check")?.addEventListener("click", checkAnswers);
  document.getElementById("btn-reset")?.addEventListener("click", resetQuiz);
  document.getElementById("btn-next")?.addEventListener("click", startBatch);

  document.querySelectorAll(".match-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      if (mode !== state.playMode) setPlayMode(mode);
    });
  });

  updateModeUI();
}

export function startLearning() {
  startBatch();
}
