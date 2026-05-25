import { SIDEBAR_KEY } from "./config.js";

export function isSidebarCollapsed() {
  return document.getElementById("layout")?.classList.contains("sidebar-collapsed");
}

export function updateSidebarButtons() {
  const collapsed = isSidebarCollapsed();
  const collapseBtn = document.getElementById("sidebar-collapse");
  const expandBtn = document.getElementById("sidebar-expand");
  if (collapseBtn) {
    collapseBtn.title = collapsed ? "展开目录" : "收起目录";
    collapseBtn.setAttribute("aria-label", collapseBtn.title);
  }
  if (expandBtn) {
    expandBtn.title = "展开目录";
    expandBtn.setAttribute("aria-label", expandBtn.title);
  }
}

export function setSidebarCollapsed(collapsed) {
  const layout = document.getElementById("layout");
  if (!layout) return;
  layout.classList.toggle("sidebar-collapsed", collapsed);
  localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  updateSidebarButtons();
}

export function initSidebar() {
  if (localStorage.getItem(SIDEBAR_KEY) === "1") {
    setSidebarCollapsed(true);
  }
  document.getElementById("sidebar-collapse")?.addEventListener("click", () => {
    setSidebarCollapsed(!isSidebarCollapsed());
  });
  document.getElementById("sidebar-expand")?.addEventListener("click", () => {
    setSidebarCollapsed(false);
  });
  updateSidebarButtons();
}
