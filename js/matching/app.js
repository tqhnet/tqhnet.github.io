import { BASICS_JSON } from "./config.js";
import { initData, initQuizPanel, startLearning } from "./quiz.js";
import { state } from "./state.js";
import { initTheme } from "../theme.js";
import { escapeHtml } from "../utils.js";

async function init() {
  initTheme();
  initQuizPanel();

  try {
    const res = await fetch(encodeURI(BASICS_JSON));
    if (!res.ok) throw new Error(`无法加载 ${BASICS_JSON}（${res.status}）`);
    state.data = await res.json();
    initData(state.data);

    document.getElementById("book-title").textContent = state.data.title;
    document.getElementById("book-meta").textContent =
      `共 ${state.data.count} 题 · 每批 5 题 · 三种模式可选`;

    startLearning();
  } catch (err) {
    document.getElementById("match-main").innerHTML =
      `<p class="error">${escapeHtml(err.message)}</p>
       <p class="empty">请运行 <code>./build-basics.sh</code> 生成并同步 JSON 到 web/data/</p>`;
  }
}

init();
