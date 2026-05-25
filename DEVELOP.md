# Web 前端开发说明

静态阅读站点，无构建步骤。GitHub Pages 直接部署 `web/` 目录。

本地预览：

```bash
cd web
python3 -m http.server 8080
# 打开 http://localhost:8080/#lesson-1
```

---

## 目录与职责

```
web/
├── index.html          # 页面骨架，一般不用改逻辑
├── css/main.css        # 全部样式
├── js/
│   ├── theme-init.js   # 首屏防闪烁（同步脚本，必须在 head）
│   ├── app.js          # 入口：加载 JSON、绑定全局事件
│   ├── config.js       # 常量（数据路径、localStorage 键名）
│   ├── state.js        # 运行时状态
│   ├── utils.js        # 纯工具函数
│   ├── theme.js        # 日间/夜间主题
│   ├── sidebar.js      # 左侧目录收起/展开
│   ├── lesson.js       # 课文页 HTML 渲染、目录列表
│   └── vocab.js        # 生词高亮、蒙版、学习模式、选词测验
└── data/
    └── 新概念英语第二册.json   # 课程数据（build.sh 生成后复制到此）
```

### 改功能 → 看哪个文件

| 想改什么 | 主要文件 | 备注 |
|---------|---------|------|
| 配色、布局、响应式 | `css/main.css` | CSS 变量在 `:root` / `[data-theme="dark"]` |
| 换数据源 / 改 JSON 路径 | `js/config.js` | `JSON_FILE` |
| 课文区块结构（标题、表格、导航） | `js/lesson.js` | `renderLesson()` 里的模板字符串 |
| 侧边栏目录、搜索 | `js/lesson.js` + `js/sidebar.js` | 列表在 `renderLessonList()` |
| 生词在文中的匹配规则 | `js/utils.js` | `findVocabSpans()` |
| 生词高亮 / 蒙版 / 悬停释义 | `js/vocab.js` | `highlightVocabulary()` |
| 学习模式、选词填入、进度 | `js/vocab.js` | `openVocabQuiz()`、`bindVocabControls()` |
| 主题切换 | `js/theme.js` + `js/theme-init.js` | init 负责首屏，theme 负责按钮 |
| 新增全局初始化逻辑 | `js/app.js` | 数据加载完成后的事件绑定 |

---

## 模块依赖

```
index.html
  ├── theme-init.js（非 module）
  ├── css/main.css
  └── app.js
        ├── config.js
        ├── state.js
        ├── theme.js → config.js
        ├── sidebar.js → config.js
        ├── lesson.js → state, utils, vocab
        └── vocab.js → config, state, utils
```

- 状态集中在 `state.js`，各模块读写 `state` 对象，避免循环 import。
- `lesson.js` 依赖 `vocab.js`；`vocab.js` 不依赖 `lesson.js`。

---

## 运行时状态（`js/state.js`）

| 字段 | 含义 |
|------|------|
| `bookData` | 从 JSON 加载的整本书数据 |
| `currentLesson` | 当前课号（1–96） |
| `vocabMarkVisible` | 是否显示生词释义（悬停 tooltip） |
| `learningMode` | 是否学习模式（蒙住生词、选词填入） |
| `revealedByLesson` | `{ [课号]: Set<生词key> }`，已填对的生词 |
| `activeQuizWord` | 当前正在选词的高亮块 key |

持久化（`localStorage`）：

| 键名（`config.js`） | 存什么 |
|--------------------|--------|
| `nce-theme` | `"dark"` / `"light"` |
| `nce-sidebar-collapsed` | `"1"` 收起 / `"0"` 展开 |
| `nce-vocab-mark` | `"1"` 显示释义 / `"0"` 隐藏 |
| `nce-learning-mode` | `"1"` 学习模式开 / `"0"` 关 |

`revealedByLesson` **不持久化**，刷新页面后学习进度清零。

---

## 课程 JSON 结构

```json
{
  "book": { "title": "...", "source_file": "..." },
  "lesson_count": 96,
  "lessons": [
    {
      "lesson": 1,
      "title_en": "...",
      "title_zh": "...",
      "comprehension": {
        "instruction": "...",
        "question": "...",
        "passage_en": "英文课文，\\n 分段"
      },
      "vocabulary": [
        { "word": "private", "pos": "adj.", "meaning_zh": "私人的" }
      ],
      "translation_zh": "中文译文"
    }
  ]
}
```

- 页面标题、侧边栏书名来自 `book.title`。
- 路由：`#lesson-{课号}`，例如 `#lesson-1`。
- 更新数据：在项目根目录运行 `./build.sh`，会把 JSON 复制到 `web/data/`。

---

## 页面 DOM 约定

`index.html` 里固定存在的节点（`lesson.js` 动态插入的内容在 `#content` 内）：

| ID / 类名 | 用途 |
|-----------|------|
| `#layout` | 根 grid；类名 `sidebar-collapsed`、`learning-mode` 控制布局 |
| `#sidebar` / `#lesson-list` | 左侧目录 |
| `#search` | 课文标题搜索 |
| `#content` | 主内容区，`renderLesson()` 整页替换 |
| `#vocab-quiz-panel` | 学习模式右侧选词面板 |
| `.passage` | 课文正文（生词 markup 注入此处） |
| `#learning-mode` / `#vocab-toggle` | 两个开关（每课渲染时重建） |

生词在文中的 markup（由 `highlightVocabulary()` 生成）：

| 类名 | 场景 |
|------|------|
| `.vocab-highlight` | 普通模式 + 显示释义：悬停见 tooltip |
| `.vocab-mask` | 隐藏释义，或学习模式未填词 |
| `.vocab-quiz-target` | 学习模式可点击的色块 |
| `.vocab-revealed` | 学习模式已填对 |

---

## 核心流程

### 1. 启动（`app.js` → `init()`）

1. `initTheme()` / `initSidebar()`
2. `fetch(JSON_FILE)` → 写入 `state.bookData`
3. 解析 URL hash 得到初始课号
4. `renderLessonList()` + `selectLesson()`

### 2. 切换课文（`selectLesson()`）

1. 更新 `state.currentLesson` 和 `location.hash`
2. `closeVocabQuiz()`
3. 重绘目录高亮 + `renderLesson()`
4. 绑定本课开关、导航按钮、课文点击事件

### 3. 生词匹配（`findVocabSpans()` in `utils.js`）

- **包含匹配**，不区分大小写。
- **单词**（无空格）：在文中找到子串后，向前后扩展到完整词形  
  → `angry` 可匹配 `angrily`，`conversation` 可匹配 `conversations`。
- **短语**（含空格）：按子串长度精确截取，不扩展。
- 最短词长 2（`vocab.js` / `highlightVocabulary` 里过滤）。
- 长词优先排序，重叠区间只保留先匹配到的。

### 4. 学习模式

1. 开启后：`.layout` 加 `learning-mode`，右侧出现 `#vocab-quiz-panel`
2. 文中生词变为 `.vocab-mask.vocab-quiz-target`
3. 点击色块 → `openVocabQuiz()` 出 6 选 1（1 对 + 最多 5 干扰）
4. 选对 → 写入 `revealedByLesson`，`refreshPassage()` 重绘为 `.vocab-revealed`
5. 「重置本课」清空当前课的 `revealedByLesson`

---

## 样式要点（`css/main.css`）

- 主题色通过 CSS 变量控制，改配色优先改 `:root` 和 `[data-theme="dark"]`。
- 三栏布局：`.layout` = 侧边栏 + 主内容 + 选词面板（学习模式时 `--quiz-panel-width: 280px`）。
- 生词 tooltip：`.vocab-highlight::after` + `data-tip` 属性。
- 移动端 `@media (max-width: 860px)`：选词面板改为底部抽屉。

---

## 常见改动示例

**改生词匹配为整词匹配**  
→ 改 `js/utils.js` 的 `findVocabSpans()`，或恢复 `\b...\b` 正则逻辑。

**增加「朗读」按钮**  
→ 在 `js/lesson.js` 的 `renderLesson()` 模板里加按钮，在 `bindVocabControls()` 同级绑定事件。

**学习进度持久化到 localStorage**  
→ 在 `getRevealedSet()` / 填对逻辑里读写 storage；注意 Set 需序列化为数组。

**换一本书**  
→ 改 `config.js` 的 `JSON_FILE`，确保 JSON 结构一致；必要时改 `index.html` 的 `<title>`。

**新增第三种阅读模式**  
→ 在 `state.js` 加状态字段，`vocab.js` 的 `highlightVocabulary()` 加分支，`css/main.css` 加样式类。

---

## 给 AI 改代码时的提示

改某个功能时，用 `@web/DEVELOP.md` 定位文件，再 `@` 具体 js/css 文件。  
避免只 `@index.html`——逻辑已拆到 `js/` 各模块。
