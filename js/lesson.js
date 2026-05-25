import { state } from "./state.js";
import { escapeHtml } from "./utils.js";
import {
  bindPassageEvents,
  bindVocabControls,
  closeVocabQuiz,
  renderPassageHtml,
  updateLearningProgress,
  updateModeUI,
} from "./vocab.js";

export function renderLessonList(filter = "") {
  const list = document.getElementById("lesson-list");
  const q = filter.trim().toLowerCase();
  list.innerHTML = "";

  state.bookData.lessons
    .filter((item) => {
      if (!q) return true;
      const text = `${item.lesson} ${item.title_en} ${item.title_zh}`.toLowerCase();
      return text.includes(q);
    })
    .forEach((item) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = item.lesson === state.currentLesson ? "active" : "";
      btn.innerHTML =
        `<span class="num">${item.lesson}</span>` +
        escapeHtml(item.title_zh || item.title_en);
      btn.addEventListener("click", () => selectLesson(item.lesson));
      li.appendChild(btn);
      list.appendChild(li);
    });
}

export function renderLesson(lessonNum) {
  const item = state.bookData.lessons.find((l) => l.lesson === lessonNum);
  if (!item) return;

  const c = item.comprehension || {};
  const vocabRows = (item.vocabulary || [])
    .map(
      (v) =>
        `<tr>
          <td class="word">${escapeHtml(v.word)}</td>
          <td class="pos">${escapeHtml(v.pos)}</td>
          <td>${escapeHtml(v.meaning_zh)}</td>
        </tr>`
    )
    .join("");

  const prev = lessonNum > 1 ? lessonNum - 1 : null;
  const next = lessonNum < state.bookData.lessons.length ? lessonNum + 1 : null;

  document.getElementById("content").innerHTML = `
    <article>
      <header class="lesson-header">
        <span class="badge">Lesson ${item.lesson}</span>
        <h2>${escapeHtml(item.title_en)}</h2>
        <p class="zh">${escapeHtml(item.title_zh)}</p>
      </header>

      <section>
        <div class="section-head">
          <h3>课文与问题</h3>
          ${
            c.passage_en
              ? `<div class="passage-controls">
                  <label class="passage-vocab-toggle" for="learning-mode" title="蒙住生词，点击选词填入">
                    <span>学习模式</span>
                    <input type="checkbox" id="learning-mode" ${state.learningMode ? "checked" : ""} />
                    <span class="vocab-switch" aria-hidden="true"></span>
                  </label>
                  <span class="learning-progress" id="learning-progress" hidden>已填写 0 / 0</span>
                  <button type="button" class="btn-reset-learn" id="reset-learning" hidden>重置本课</button>
                  <label class="passage-vocab-toggle" id="meaning-toggle-wrap" for="vocab-toggle" title="悬停显示生词释义">
                    <span>显示生词释义</span>
                    <input type="checkbox" id="vocab-toggle" ${state.vocabMarkVisible ? "checked" : ""} />
                    <span class="vocab-switch" aria-hidden="true"></span>
                  </label>
                </div>`
              : ""
          }
        </div>
        ${c.instruction ? `<div class="instruction">${escapeHtml(c.instruction)}</div>` : ""}
        ${c.question ? `<div class="question">${escapeHtml(c.question)}</div>` : ""}
        ${
          c.passage_en
            ? `<div class="passage">${renderPassageHtml(c.passage_en, item.vocabulary)}</div>`
            : "<p class='empty'>暂无课文内容</p>"
        }
      </section>

      <section>
        <h3>生词和短语</h3>
        ${
          vocabRows
            ? `<table>
                <thead><tr><th>单词</th><th>词性</th><th>释义</th></tr></thead>
                <tbody>${vocabRows}</tbody>
              </table>`
            : "<p class='empty'>暂无生词</p>"
        }
      </section>

      <section>
        <h3>参考译文</h3>
        ${
          item.translation_zh
            ? `<div class="translation">${escapeHtml(item.translation_zh)}</div>`
            : "<p class='empty'>暂无译文</p>"
        }
      </section>

      <div class="nav-buttons">
        <button id="btn-prev" ${prev ? "" : "disabled"}>← 上一课</button>
        <button id="btn-next" ${next ? "" : "disabled"}>下一课 →</button>
      </div>
    </article>
  `;

  if (prev) document.getElementById("btn-prev").onclick = () => selectLesson(prev);
  if (next) document.getElementById("btn-next").onclick = () => selectLesson(next);

  bindVocabControls(item.vocabulary);
  updateModeUI();
  updateLearningProgress(item.vocabulary);
  bindPassageEvents(item.vocabulary);
}

export function selectLesson(num) {
  state.currentLesson = num;
  location.hash = `lesson-${num}`;
  closeVocabQuiz();
  renderLessonList(document.getElementById("search").value);
  renderLesson(num);
  document.querySelector(".lesson-list button.active")?.scrollIntoView({ block: "nearest" });
}
