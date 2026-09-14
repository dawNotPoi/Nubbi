(() => {
  "use strict";

  const folders = [
    { id: "product", parentId: "root", name: "产品资料", updated: "2026-07-15T09:42:00" },
    { id: "file-module", parentId: "product", name: "文件模块", updated: "2026-07-15T10:16:00" },
    { id: "design", parentId: "root", name: "设计素材", updated: "2026-07-14T18:28:00" },
    { id: "archive", parentId: "root", name: "项目归档", updated: "2026-07-12T17:20:00" },
    { id: "inbox", parentId: "root", name: "待整理", updated: "2026-07-10T08:32:00" },
  ];
  const files = [
    { id: "f1", folderId: "root", name: "文件管理重构说明.md", ext: "MD", size: 54272, updated: "2026-07-15T10:32:00" },
    { id: "f2", folderId: "root", name: "Nubbi 产品手册.pdf", ext: "PDF", size: 2483814, updated: "2026-07-15T09:18:00" },
    { id: "f3", folderId: "root", name: "演示封面.png", ext: "PNG", size: 3827154, updated: "2026-07-14T16:46:00" },
    { id: "f4", folderId: "root", name: "nubbi-client-v2.zip", ext: "ZIP", size: 48758784, updated: "2026-07-12T18:20:00" },
    { id: "f5", folderId: "file-module", name: "文件模块 PRD.md", ext: "MD", size: 70656, updated: "2026-07-15T10:04:00" },
    { id: "f6", folderId: "file-module", name: "接口清单.xlsx", ext: "XLS", size: 198144, updated: "2026-07-14T12:22:00" },
  ];
  const root = { id: "root", parentId: null, name: "全部文件" };
  const state = { folderId: "root", query: "", selected: new Set(), menuId: null, drafting: false, createOpen: false, pageOpen: false };
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    rows: $("#listRows"), list: $("#listContainer"), empty: $("#emptyState"), count: $("#itemCount"), breadcrumbs: $("#breadcrumbs"),
    selection: $("#selectionBar"), selectionCount: $("#selectionCount"), selectAll: $("#selectAll"), search: $("#searchInput"), clearSearch: $("#clearSearch"),
    emptyTitle: $("#emptyTitle"), emptyCopy: $("#emptyCopy"), createMenu: $("#createMenu"), pageMenu: $("#pageMenu"), newButton: $("#newButton"), pageMenuButton: $("#pageMenuButton"),
    preview: $("#previewPanel"), previewIcon: $("#previewIcon"), previewExtension: $("#previewExtension"), previewPath: $("#previewPath"), previewName: $("#previewName"), previewMeta: $("#previewMeta"), upload: $("#uploadPanel"), toast: $("#toast"),
  };
  let toastTimer;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const getFolder = (id) => (id === "root" ? root : folders.find((folder) => folder.id === id)) || root;
  const getItem = (id) => folders.find((folder) => folder.id === id) || files.find((file) => file.id === id);
  const formatSize = (bytes) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(bytes > 10485760 ? 0 : 1)} MB` : `${Math.round(bytes / 1024)} KB`;
  const formatDate = (value) => new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
  const showToast = (message) => { clearTimeout(toastTimer); elements.toast.textContent = message; elements.toast.classList.add("visible"); toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2300); };
  const icon = (item) => item.kind === "folder" ? '<span class="folder-icon" aria-hidden="true"></span>' : `<span class="file-icon" data-ext="${escapeHtml(item.ext)}" aria-hidden="true"></span>`;
  const path = () => { const result = []; let current = getFolder(state.folderId); while (current) { result.unshift(current); current = current.parentId ? getFolder(current.parentId) : null; } return result; };
  const currentItems = () => {
    const directoryItems = folders.filter((folder) => folder.parentId === state.folderId).map((folder) => ({ ...folder, kind: "folder" }));
    const fileItems = files.filter((file) => file.folderId === state.folderId).map((file) => ({ ...file, kind: "file" }));
    const query = state.query.trim().toLocaleLowerCase("zh-CN");
    return [...directoryItems, ...fileItems].filter((item) => item.name.toLocaleLowerCase("zh-CN").includes(query)).sort((left, right) => left.kind !== right.kind ? left.kind === "folder" ? -1 : 1 : new Date(right.updated) - new Date(left.updated));
  };
  const rowMenu = (item) => `<div class="row-actions"><button class="icon-button row-more" type="button" data-menu="${item.id}" aria-label="${escapeHtml(item.name)}的更多操作" aria-expanded="${state.menuId === item.id}">•••</button><div class="row-menu${state.menuId === item.id ? " open" : ""}">${item.kind === "file" ? '<button type="button" data-action="预览">打开预览</button><button type="button" data-action="下载">下载</button><button type="button" data-action="分享">分享</button>' : ""}<button type="button" data-action="移动">移动</button><button type="button" data-action="重命名">重命名</button><button class="danger" type="button" data-action="删除">删除</button></div></div>`;
  const rowMarkup = (item) => {
    const selected = state.selected.has(item.id); const meta = item.kind === "folder" ? "文件夹" : `${item.ext} · ${formatSize(item.size)}`;
    return `<article class="file-row${selected ? " selected" : ""}" data-item="${item.id}" tabindex="0"><label class="check-cell row-check"><input type="checkbox" data-select="${item.id}" aria-label="选择${escapeHtml(item.name)}"${selected ? " checked" : ""}></label><div class="name-cell">${icon(item)}<div class="name-copy"><button type="button" data-open="${item.id}">${escapeHtml(item.name)}</button><span class="item-meta">${meta}</span></div></div><time class="modified-cell" datetime="${item.updated}">${formatDate(item.updated)}</time>${rowMenu(item)}</article>`;
  };
  const draftMarkup = () => state.drafting ? '<article class="file-row draft"><span></span><div class="name-cell"><span class="folder-icon"></span><input id="draftFolderInput" type="text" maxlength="80" placeholder="文件夹名称" aria-label="文件夹名称"></div><span class="modified-cell">刚刚</span><span></span></article>' : "";
  const syncMenus = () => { elements.createMenu.classList.toggle("open", state.createOpen); elements.pageMenu.classList.toggle("open", state.pageOpen); elements.newButton.setAttribute("aria-expanded", state.createOpen); elements.pageMenuButton.setAttribute("aria-expanded", state.pageOpen); };

  const render = () => {
    const items = currentItems(); const total = folders.filter((item) => item.parentId === state.folderId).length + files.filter((item) => item.folderId === state.folderId).length;
    elements.rows.innerHTML = draftMarkup() + items.map(rowMarkup).join(""); elements.list.style.display = items.length || state.drafting ? "block" : "none";
    elements.empty.classList.toggle("visible", items.length === 0 && !state.drafting); elements.emptyTitle.textContent = state.query ? "没有匹配的内容" : "此文件夹为空"; elements.emptyCopy.textContent = state.query ? `“${state.query}”在当前目录中没有结果。` : "上传文件或新建文件夹后，内容会显示在这里。";
    elements.count.textContent = `${state.query ? items.length : total} 项`; elements.breadcrumbs.innerHTML = path().map((folder, index, list) => `<button type="button" data-folder="${folder.id}"${index === list.length - 1 ? ' aria-current="page"' : ""}>${escapeHtml(folder.name)}</button>${index < list.length - 1 ? "<i>/</i>" : ""}`).join("");
    elements.selection.classList.toggle("visible", state.selected.size > 0); elements.selectionCount.textContent = `已选择 ${state.selected.size} 项`;
    const visibleIds = items.map((item) => item.id); const selectedVisible = visibleIds.filter((id) => state.selected.has(id)).length;
    elements.selectAll.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length; elements.selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length; elements.selectAll.disabled = visibleIds.length === 0;
    elements.search.parentElement.classList.toggle("has-value", Boolean(state.query)); syncMenus(); if (state.drafting) setTimeout(() => $("#draftFolderInput")?.focus(), 0);
  };
  const closePreview = () => { elements.preview.classList.remove("open"); elements.preview.setAttribute("aria-hidden", "true"); elements.preview.setAttribute("inert", ""); };
  const navigate = (folderId) => { state.folderId = folderId; state.query = ""; state.selected.clear(); state.menuId = null; state.drafting = false; elements.search.value = ""; closePreview(); render(); };
  const openPreview = (item) => { elements.previewIcon.dataset.ext = item.ext; elements.previewExtension.textContent = item.ext; elements.previewPath.textContent = getFolder(item.folderId).name; elements.previewName.textContent = item.name; elements.previewMeta.textContent = `${formatSize(item.size)} · ${formatDate(item.updated)}`; elements.preview.removeAttribute("inert"); elements.preview.classList.add("open"); elements.preview.setAttribute("aria-hidden", "false"); setTimeout(() => $("#previewClose").focus(), 0); };
  const openItem = (id) => { const item = getItem(id); if (!item) return; folders.includes(item) ? navigate(item.id) : openPreview(item); };
  const toggleSelection = (id, checked) => { checked ? state.selected.add(id) : state.selected.delete(id); state.menuId = null; render(); };
  const startDraft = () => { state.drafting = true; state.selected.clear(); state.createOpen = false; render(); };
  const saveDraft = (name) => { const next = name.trim(); if (!next) { state.drafting = false; render(); return; } folders.push({ id: `folder-${Date.now()}`, parentId: state.folderId, name: next, updated: new Date().toISOString() }); state.drafting = false; showToast(`已创建“${next}”（原型数据）`); render(); };
  const openUpload = () => { elements.upload.classList.add("open"); elements.upload.setAttribute("aria-hidden", "false"); };

  document.addEventListener("click", (event) => {
    const target = event.target; const folder = target.closest("[data-folder]"); if (folder) { navigate(folder.dataset.folder); return; }
    const open = target.closest("[data-open]"); if (open) { event.stopPropagation(); openItem(open.dataset.open); return; }
    const menu = target.closest("[data-menu]"); if (menu) { event.stopPropagation(); state.menuId = state.menuId === menu.dataset.menu ? null : menu.dataset.menu; const openedId = state.menuId; render(); if (openedId) setTimeout(() => document.querySelector(`[data-item="${openedId}"] .row-menu button`)?.focus(), 0); return; }
    const action = target.closest("[data-action]"); if (action) { const item = getItem(action.closest("[data-item]").dataset.item); action.dataset.action === "预览" ? openPreview(item) : showToast(`${action.dataset.action}“${item.name}”（原型示意）`); state.menuId = null; render(); return; }
    const create = target.closest("[data-create]"); if (create) { state.createOpen = false; if (create.dataset.create === "folder") startDraft(); else { openUpload(); syncMenus(); } return; }
    const pageAction = target.closest("[data-page-action]"); if (pageAction) { state.pageOpen = false; pageAction.dataset.pageAction === "transfer" ? openUpload() : showToast("文件列表已是最新"); render(); return; }
    const bulk = target.closest("[data-bulk]"); if (bulk) { showToast(`${bulk.textContent.trim()} ${state.selected.size} 项（原型示意）`); return; }
    const row = target.closest("[data-item]"); if (row && !target.closest("button, input, label")) { matchMedia("(max-width: 760px)").matches ? openItem(row.dataset.item) : toggleSelection(row.dataset.item, !state.selected.has(row.dataset.item)); return; }
    if (!target.closest(".menu-wrap")) { state.createOpen = false; state.pageOpen = false; state.menuId = null; render(); }
  });
  document.addEventListener("dblclick", (event) => { const row = event.target.closest("[data-item]"); if (row && !event.target.closest("button, input, label")) openItem(row.dataset.item); });
  document.addEventListener("change", (event) => { const checkbox = event.target.closest("[data-select]"); if (checkbox) toggleSelection(checkbox.dataset.select, checkbox.checked); });
  document.addEventListener("keydown", (event) => { if (event.target.id === "draftFolderInput") { if (event.key === "Enter") saveDraft(event.target.value); if (event.key === "Escape") { state.drafting = false; render(); } return; } if (event.key === "Enter") { const row = event.target.closest("[data-item]"); if (row && event.target === row) openItem(row.dataset.item); } if (event.key === "Escape") { closePreview(); elements.upload.classList.remove("open"); elements.upload.setAttribute("aria-hidden", "true"); state.createOpen = false; state.pageOpen = false; state.menuId = null; render(); } });
  document.addEventListener("focusout", (event) => { if (event.target.id === "draftFolderInput") setTimeout(() => { if (state.drafting) saveDraft(event.target.value); }, 0); });
  elements.search.addEventListener("input", (event) => { state.query = event.target.value; state.selected.clear(); render(); });
  elements.clearSearch.addEventListener("click", () => { state.query = ""; elements.search.value = ""; render(); elements.search.focus(); });
  elements.selectAll.addEventListener("change", () => { currentItems().forEach((item) => elements.selectAll.checked ? state.selected.add(item.id) : state.selected.delete(item.id)); render(); });
  $("#clearSelection").addEventListener("click", () => { state.selected.clear(); render(); });
  elements.newButton.addEventListener("click", () => { state.createOpen = !state.createOpen; state.pageOpen = false; syncMenus(); });
  elements.pageMenuButton.addEventListener("click", () => { state.pageOpen = !state.pageOpen; state.createOpen = false; syncMenus(); });
  $("#previewClose").addEventListener("click", closePreview); $("#uploadClose").addEventListener("click", () => { elements.upload.classList.remove("open"); elements.upload.setAttribute("aria-hidden", "true"); });
  document.querySelectorAll("[data-preview-action]").forEach((button) => button.addEventListener("click", () => showToast(`${button.dataset.previewAction}（原型示意）`)));
  render();
})();
