import { JSON_FILE } from "./config.js";
import { renderLessonList, selectLesson } from "./lesson.js";
import { initSidebar } from "./sidebar.js";
import { state } from "./state.js";
import { initTheme } from "./theme.js";
import { escapeHtml } from "./utils.js";
import { closeVocabQuiz, updateModeUI } from "./vocab.js";

async function init() {
  initTheme();
  initSidebar();
  updateModeUI();
  try {
    const res = await fetch(encodeURI(JSON_FILE));
    if (!res.ok) throw new Error(`无法加载 ${JSON_FILE}（${res.status}）`);
    state.bookData = await res.json();

    document.getElementById("book-title").textContent = state.bookData.book.title;
    document.getElementById("book-meta").textContent =
      `共 ${state.bookData.lesson_count} 课 · 来源 ${state.bookData.book.source_file}`;

    const hash = location.hash.match(/^#lesson-(\d+)$/);
    if (hash) state.currentLesson = parseInt(hash[1], 10);

    renderLessonList();
    selectLesson(state.currentLesson);

    document.getElementById("search").addEventListener("input", (e) => {
      renderLessonList(e.target.value);
    });

    window.addEventListener("hashchange", () => {
      const m = location.hash.match(/^#lesson-(\d+)$/);
      if (m) selectLesson(parseInt(m[1], 10));
    });

    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".page-quiz-panel") &&
        !e.target.closest("#vocab-quiz-panel") &&
        !e.target.closest(".vocab-quiz-target")
      ) {
        closeVocabQuiz();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeVocabQuiz();
    });
  } catch (err) {
    document.getElementById("content").innerHTML =
      `<p class="error">${escapeHtml(err.message)}</p>
       <p class="empty">请在本目录启动本地服务器后访问，例如：<br>
       <code>python3 -m http.server 8080</code><br>
       然后打开 <code>http://localhost:8080/</code></p>`;
  }
}

init();
