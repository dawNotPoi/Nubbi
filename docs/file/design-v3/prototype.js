(() => {
  "use strict";

  const items = [
    { id: "product", parentId: "root", kind: "folder", name: "产品资料", updated: "2026-07-15T09:42:00" },
    { id: "f1", parentId: "product", kind: "file", category: "document", name: "Nubbi 产品手册.pdf", ext: "PDF", size: 2483814, updated: "2026-07-15T09:18:00" },
    { id: "f2", parentId: "product", kind: "file", category: "document", name: "接口清单.xlsx", ext: "XLS", size: 684032, updated: "2026-07-14T12:22:00" },
    { id: "design", parentId: "root", kind: "folder", name: "设计素材", updated: "2026-07-14T18:28:00" },
    { id: "f3", parentId: "design", kind: "file", category: "image", name: "首页视觉稿.png", ext: "PNG", size: 3827154, updated: "2026-07-14T16:46:00" },
    { id: "meeting", parentId: "root", kind: "folder", name: "会议归档", updated: "2026-07-13T17:20:00" },
    { id: "f4", parentId: "root", kind: "file", category: "document", name: "发布说明.md", ext: "MD", size: 54272, updated: "2026-07-15T10:32:00" },
    { id: "f5", parentId: "root", kind: "file", category: "image", name: "演示封面.png", ext: "PNG", size: 3260416, updated: "2026-07-14T16:20:00" },
    { id: "f6", parentId: "root", kind: "file", category: "video", name: "产品演示.mp4", ext: "MP4", size: 134217728, updated: "2026-07-13T14:08:00" },
    { id: "f7", parentId: "root", kind: "file", category: "archive", name: "nubbi-client-v2.zip", ext: "ZIP", size: 48758784, updated: "2026-07-12T18:20:00" },
  ];
  const root = { id: "root", parentId: null, kind: "folder", name: "全部文件" };
  const state = { folderId: "root", expanded: new Set(["product"]), selected: new Set(), query: "", type: "all", sort: "updated-desc", searchOpen: false, sortOpen: false, typeOpen: false, menuId: null, drafting: false, editingId: null };
  const $ = (selector) => document.querySelector(selector);
  const elements = { rows: $("#fileRows"), table: $("#fileTable"), head: $("#tableHead"), empty: $("#emptyState"), count: $("#itemCount"), breadcrumbs: $("#breadcrumbs"), selectAll: $("#selectAll"), selectionCount: $("#selectionCount"), searchField: $("#searchField"), search: $("#searchInput"), searchToggle: $("#searchToggle"), sortMenu: $("#sortMenu"), sortButton: $("#sortButton"), typeMenu: $("#typeMenu"), typeButton: $("#typeButton"), preview: $("#previewDialog"), transfer: $("#transferDialog"), previewName: $("#previewName"), previewExtension: $("#previewExtension"), previewMeta: $("#previewMeta"), toast: $("#toast") };
  const typeLabels = { all: "全部类型", document: "文档", image: "图片", video: "视频", archive: "压缩包" };
  let toastTimer;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const getItem = (id) => id === "root" ? root : items.find((item) => item.id === id);
  const childrenOf = (id) => items.filter((item) => item.parentId === id);
  const descendantItems = (id) => childrenOf(id).flatMap((item) => item.kind === "folder" ? [item, ...descendantItems(item.id)] : [item]);
  const childCount = (id) => descendantItems(id).filter((item) => item.kind === "file").length;
  const formatSize = (bytes) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(bytes > 10485760 ? 0 : 1)} MB` : `${Math.round(bytes / 1024)} KB`;
  const formatDate = (value) => new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
  const showToast = (message) => { clearTimeout(toastTimer); elements.toast.textContent = message; elements.toast.classList.add("visible"); toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2200); };
  const sorted = (source) => [...source].sort((left, right) => { if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1; if (state.sort === "name-asc") return left.name.localeCompare(right.name, "zh-CN"); const delta = new Date(left.updated) - new Date(right.updated); return state.sort === "updated-asc" ? delta : -delta; });
  const pathTo = (id) => { const path = []; let current = getItem(id); while (current) { path.unshift(current); current = current.parentId ? getItem(current.parentId) : null; } return path; };
  const pathLabel = (item) => pathTo(item.parentId || "root").map((part) => part.name).join(" / ");
  const treeRows = (parentId, depth = 0) => sorted(childrenOf(parentId)).flatMap((item) => [{ item, depth, search: false }, ...(item.kind === "folder" && state.expanded.has(item.id) ? treeRows(item.id, depth + 1) : [])]);
  const visibleRows = () => {
    const query = state.query.trim().toLocaleLowerCase("zh-CN");
    if (!query && state.type === "all") return treeRows(state.folderId);
    return sorted(descendantItems(state.folderId).filter((item) => item.name.toLocaleLowerCase("zh-CN").includes(query) && (state.type === "all" || item.category === state.type))).map((item) => ({ item, depth: 0, search: true }));
  };
  const itemMeta = (item) => item.kind === "folder" ? `${childCount(item.id)} 项` : `${typeLabels[item.category]} · ${formatSize(item.size)}`;
  const rowMenu = (item) => `<div class="row-menu${state.menuId === item.id ? " open" : ""}">${item.kind === "file" ? '<button type="button" data-action="下载">下载</button><button type="button" data-action="分享">分享</button>' : ""}<button type="button" data-action="移动">移动</button><button type="button" data-action="重命名">重命名</button><button class="danger" type="button" data-action="删除">删除</button></div>`;
  const rowMarkup = ({ item, depth, search }) => {
    const selected = state.selected.has(item.id); const hasChildren = item.kind === "folder" && childrenOf(item.id).length > 0; const editing = state.editingId === item.id;
    const name = editing ? `<input class="draft-input" data-rename-input="${item.id}" value="${escapeHtml(item.name)}" aria-label="重命名 ${escapeHtml(item.name)}">` : `<button class="name-button" type="button" data-rename="${item.id}" title="重命名">${escapeHtml(item.name)}</button>`;
    return `<li class="file-row depth-${Math.min(depth, 2)}${selected ? " selected" : ""}${search ? " search-result" : ""}" data-item="${item.id}" tabindex="0"><label class="check-cell row-check"><input type="checkbox" data-select="${item.id}" aria-label="选择 ${escapeHtml(item.name)}"${selected ? " checked" : ""}></label><div class="name-cell"><button class="tree-toggle${state.expanded.has(item.id) ? " open" : ""}${hasChildren ? "" : " invisible"}" type="button" data-toggle="${item.id}" aria-label="${state.expanded.has(item.id) ? "收起" : "展开"} ${escapeHtml(item.name)}">›</button><div class="name-copy">${name}${search ? `<span class="path-label">${escapeHtml(pathLabel(item))}</span>` : ""}<span class="mobile-meta">${itemMeta(item)} · ${formatDate(item.updated)}</span></div></div><time class="modified-cell" datetime="${item.updated}">${formatDate(item.updated)}</time><span class="meta-cell">${itemMeta(item)}</span><div class="row-actions"><button class="open-button" type="button" data-open="${item.id}">打开</button><button class="tool-button more-button" type="button" data-menu="${item.id}" aria-label="${escapeHtml(item.name)}的更多操作" aria-expanded="${state.menuId === item.id}">•••</button>${rowMenu(item)}</div></li>`;
  };
  const draftMarkup = () => state.drafting ? '<li class="file-row depth-0"><span></span><div class="name-cell"><span class="tree-toggle invisible"></span><input class="draft-input" id="draftFolderInput" maxlength="80" placeholder="文件夹名称" aria-label="文件夹名称"></div><span class="modified-cell">刚刚</span><span class="meta-cell">文件夹</span><span></span></li>' : "";
  const syncMenus = () => { elements.sortMenu.classList.toggle("open", state.sortOpen); elements.typeMenu.classList.toggle("open", state.typeOpen); elements.sortButton.setAttribute("aria-expanded", state.sortOpen); elements.typeButton.setAttribute("aria-expanded", state.typeOpen); elements.sortMenu.querySelectorAll("[data-sort]").forEach((button) => button.classList.toggle("active", button.dataset.sort === state.sort)); elements.typeMenu.querySelectorAll("[data-type]").forEach((button) => button.classList.toggle("active", button.dataset.type === state.type)); };
  const render = () => {
    const rows = visibleRows(); const visibleIds = rows.map(({ item }) => item.id); const selectedVisible = visibleIds.filter((id) => state.selected.has(id)).length;
    elements.rows.innerHTML = draftMarkup() + rows.map(rowMarkup).join(""); elements.empty.classList.toggle("visible", rows.length === 0 && !state.drafting); elements.count.textContent = `${childrenOf(state.folderId).length} 项`;
    elements.breadcrumbs.innerHTML = pathTo(state.folderId).map((part, index, path) => `<button type="button" data-folder="${part.id}"${index === path.length - 1 ? ' aria-current="page"' : ""}>${escapeHtml(part.name)}</button>${index < path.length - 1 ? "<i>›</i>" : ""}`).join("");
    elements.head.classList.toggle("selecting", state.selected.size > 0); elements.table.classList.toggle("selecting", state.selected.size > 0); elements.selectionCount.textContent = `已选 ${state.selected.size} 项`;
    elements.selectAll.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length; elements.selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length; elements.selectAll.disabled = visibleIds.length === 0;
    elements.searchField.classList.toggle("open", state.searchOpen || Boolean(state.query)); elements.searchField.classList.toggle("has-value", Boolean(state.query)); elements.searchToggle.setAttribute("aria-expanded", state.searchOpen || Boolean(state.query)); elements.typeButton.textContent = typeLabels[state.type]; syncMenus();
    if (state.drafting) setTimeout(() => $("#draftFolderInput")?.focus(), 0); if (state.editingId) setTimeout(() => document.querySelector(`[data-rename-input="${state.editingId}"]`)?.select(), 0);
  };
  const navigate = (folderId) => { state.folderId = folderId; state.query = ""; state.selected.clear(); state.menuId = null; state.drafting = false; state.editingId = null; elements.search.value = ""; render(); };
  const openItem = (id) => { const item = getItem(id); if (!item) return; if (item.kind === "folder") { navigate(item.id); return; } elements.previewName.textContent = item.name; elements.previewExtension.textContent = item.ext; elements.previewMeta.textContent = `${formatSize(item.size)} · ${formatDate(item.updated)}`; if (!elements.preview.open) elements.preview.showModal(); };
  const toggleSelection = (id, checked) => { checked ? state.selected.add(id) : state.selected.delete(id); state.menuId = null; render(); };
  const startRename = (id) => { state.editingId = id; state.menuId = null; render(); };
  const finishRename = (id, value) => { const item = getItem(id); const next = value.trim(); state.editingId = null; if (item && next && next !== item.name) { item.name = next; item.updated = new Date().toISOString(); showToast("名称已更新（原型数据）"); } render(); };
  const finishDraft = (value) => { const name = value.trim(); state.drafting = false; if (name) { items.push({ id: `folder-${Date.now()}`, parentId: state.folderId, kind: "folder", name, updated: new Date().toISOString() }); showToast(`已创建“${name}”`); } render(); };

  document.addEventListener("click", (event) => {
    const target = event.target; const folder = target.closest("[data-folder]"); if (folder) { navigate(folder.dataset.folder); return; }
    const toggle = target.closest("[data-toggle]"); if (toggle) { event.stopPropagation(); state.expanded.has(toggle.dataset.toggle) ? state.expanded.delete(toggle.dataset.toggle) : state.expanded.add(toggle.dataset.toggle); render(); return; }
    const select = target.closest("[data-select]"); if (select) { event.stopPropagation(); toggleSelection(select.dataset.select, select.checked); return; }
    const open = target.closest("[data-open]"); if (open) { event.stopPropagation(); openItem(open.dataset.open); return; }
    const rename = target.closest("[data-rename]"); if (rename) { event.stopPropagation(); matchMedia("(max-width: 720px)").matches ? openItem(rename.dataset.rename) : startRename(rename.dataset.rename); return; }
    const menu = target.closest("[data-menu]"); if (menu) { event.stopPropagation(); state.menuId = state.menuId === menu.dataset.menu ? null : menu.dataset.menu; const opened = state.menuId; render(); if (opened) setTimeout(() => document.querySelector(`[data-item="${opened}"] .row-menu button`)?.focus(), 0); return; }
    const action = target.closest("[data-action]"); if (action) { const row = action.closest("[data-item]"); const item = row ? getItem(row.dataset.item) : null; if (action.dataset.action === "重命名" && item) startRename(item.id); else showToast(`${action.dataset.action}${item ? `“${item.name}”` : "文件"}（原型示意）`); state.menuId = null; return; }
    const bulk = target.closest("[data-bulk]"); if (bulk) { showToast(`${bulk.dataset.bulk} ${state.selected.size} 项（原型示意）`); return; }
    const row = target.closest("[data-item]"); if (row && !target.closest("button, input, label")) { matchMedia("(max-width: 720px)").matches ? openItem(row.dataset.item) : toggleSelection(row.dataset.item, !state.selected.has(row.dataset.item)); return; }
    if (!target.closest(".menu-wrap")) { state.sortOpen = false; state.typeOpen = false; state.menuId = null; render(); }
  });
  document.addEventListener("dblclick", (event) => { const row = event.target.closest("[data-item]"); if (row && !event.target.closest("button, input, label")) openItem(row.dataset.item); });
  document.addEventListener("keydown", (event) => { const rename = event.target.closest("[data-rename-input]"); if (rename) { if (event.key === "Enter") finishRename(rename.dataset.renameInput, rename.value); if (event.key === "Escape") { state.editingId = null; render(); } return; } if (event.target.id === "draftFolderInput") { if (event.key === "Enter") finishDraft(event.target.value); if (event.key === "Escape") { state.drafting = false; render(); } return; } if (event.key === "Enter") { const row = event.target.closest("[data-item]"); if (row && event.target === row) openItem(row.dataset.item); } if (event.key === "Escape") { state.menuId = null; state.sortOpen = false; state.typeOpen = false; render(); } });
  document.addEventListener("focusout", (event) => { if (event.target.id === "draftFolderInput") setTimeout(() => state.drafting && finishDraft(event.target.value), 0); const rename = event.target.closest("[data-rename-input]"); if (rename) setTimeout(() => state.editingId === rename.dataset.renameInput && finishRename(rename.dataset.renameInput, rename.value), 0); });
  elements.search.addEventListener("input", (event) => { state.query = event.target.value; state.selected.clear(); render(); });
  $("#clearSearch").addEventListener("click", () => { state.query = ""; elements.search.value = ""; render(); elements.search.focus(); });
  elements.searchToggle.addEventListener("click", () => { state.searchOpen = !state.searchOpen; render(); if (state.searchOpen) setTimeout(() => elements.search.focus(), 0); });
  elements.sortButton.addEventListener("click", () => { state.sortOpen = !state.sortOpen; state.typeOpen = false; syncMenus(); });
  elements.typeButton.addEventListener("click", () => { state.typeOpen = !state.typeOpen; state.sortOpen = false; syncMenus(); });
  elements.sortMenu.addEventListener("click", (event) => { const button = event.target.closest("[data-sort]"); if (!button) return; state.sort = button.dataset.sort; state.sortOpen = false; render(); });
  elements.typeMenu.addEventListener("click", (event) => { const button = event.target.closest("[data-type]"); if (!button) return; state.type = button.dataset.type; state.typeOpen = false; state.selected.clear(); render(); });
  elements.selectAll.addEventListener("change", () => { visibleRows().forEach(({ item }) => elements.selectAll.checked ? state.selected.add(item.id) : state.selected.delete(item.id)); render(); });
  $("#clearSelection").addEventListener("click", () => { state.selected.clear(); render(); });
  $("#newFolderButton").addEventListener("click", () => { state.drafting = true; state.selected.clear(); render(); });
  $("#uploadButton").addEventListener("click", () => { if (!elements.transfer.open) elements.transfer.showModal(); });
  $("#transferButton").addEventListener("click", () => { if (!elements.transfer.open) elements.transfer.showModal(); });
  $("#refreshButton").addEventListener("click", () => showToast("文件列表已刷新"));
  $("#previewClose").addEventListener("click", () => elements.preview.close()); $("#previewDone").addEventListener("click", () => elements.preview.close()); $("#transferClose").addEventListener("click", () => elements.transfer.close());
  render();
})();
