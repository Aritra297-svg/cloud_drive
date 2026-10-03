const STORAGE_KEY = "nexus-vault-state-v1";
const maxFileSize = 100 * 1024 * 1024;
const seededFiles = [
  { id: "seed-1", name: "Coastal studies.jpg", type: "image", ext: "JPG", size: 2480000, modified: "Just now", preview: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80", folder: "Fieldwork", owner: "You", favorite: true, shared: false, accessed: 1 },
  { id: "seed-2", name: "Brand direction.pdf", type: "pdf", ext: "PDF", size: 4910000, modified: "2 hours ago", folder: "Studio / Brand", owner: "You", favorite: false, shared: true, accessed: 2 },
  { id: "seed-3", name: "Q3 launch deck.pptx", type: "presentation", ext: "PPTX", size: 12800000, modified: "Yesterday", folder: "Studio / Launch", owner: "You", favorite: true, shared: true, accessed: 3 },
  { id: "seed-4", name: "Campaign metrics.xlsx", type: "spreadsheet", ext: "XLSX", size: 3240000, modified: "Yesterday", folder: "Studio / Reports", owner: "You", favorite: false, shared: false, accessed: 4 },
  { id: "seed-5", name: "Motion study.mp4", type: "video", ext: "MP4", size: 48300000, modified: "2 days ago", folder: "Studio / Motion", owner: "You", favorite: false, shared: false, accessed: 5 },
  { id: "seed-6", name: "Project notes.docx", type: "document", ext: "DOCX", size: 846000, modified: "3 days ago", folder: "Studio / Notes", owner: "You", favorite: false, shared: true, accessed: 6 },
  { id: "seed-7", name: "Workspace-light.png", type: "image", ext: "PNG", size: 1740000, modified: "4 days ago", preview: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80", folder: "Inspiration", owner: "You", favorite: false, shared: false, accessed: 7 },
  { id: "seed-8", name: "Field recording.webm", type: "video", ext: "WEBM", size: 19100000, modified: "5 days ago", folder: "Fieldwork", owner: "You", favorite: false, shared: false, accessed: 8 },
  { id: "seed-9", name: "Invoice 024.pdf", type: "pdf", ext: "PDF", size: 621000, modified: "1 week ago", folder: "Studio / Admin", owner: "You", favorite: false, shared: false, accessed: 9 },
  { id: "seed-10", name: "Moodboard study.webp", type: "image", ext: "WEBP", size: 3180000, modified: "1 week ago", preview: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=80", folder: "Inspiration", owner: "You", favorite: true, shared: false, accessed: 10 },
  { id: "seed-11", name: "Research summary.docx", type: "document", ext: "DOCX", size: 1100000, modified: "2 weeks ago", folder: "Fieldwork", owner: "You", favorite: false, shared: false, accessed: 11 },
  { id: "seed-12", name: "Content calendar.csv", type: "spreadsheet", ext: "CSV", size: 384000, modified: "2 weeks ago", folder: "Studio / Launch", owner: "You", favorite: false, shared: false, accessed: 12 }
];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.files)) {
      const savedById = new Map(saved.files.map(file => [file.id, file]));
      const trashedIds = new Set((saved.trashed || []).map(file => file.id));
      return { ...saved, files: [...seededFiles.filter(file => !trashedIds.has(file.id)).map(file => ({ ...file, ...savedById.get(file.id) })), ...saved.files.filter(file => !file.id.startsWith("seed-"))] };
    }
  } catch (error) { console.warn("NEXUS VAULT could not read saved metadata.", error); }
  return { files: seededFiles.map(file => ({ ...file })), trashed: [], view: "grid", theme: "dark", recent: ["seed-1", "seed-2", "seed-3"] };
}

const state = loadState();
const elements = Object.fromEntries(["file-grid", "file-card-template", "global-search", "sort-select", "filter-chips", "files-section", "files-heading", "files-eyebrow", "visible-count", "empty-state", "empty-title", "empty-copy", "recent-list", "recent-strip", "overview-cards", "welcome-section", "details-panel", "details-content", "context-menu", "menu-scrim", "toast-stack", "file-input", "upload-zone", "app-dialog", "dialog-body", "dialog-form", "preview-dialog", "preview-content", "drawer-scrim", "sidebar", "breadcrumb-title", "storage-ring", "sidebar-storage", "sidebar-storage-fill", "sidebar-storage-copy", "storage-used", "storage-percent", "category-bars"].map(id => [id, document.getElementById(id)]));
let currentView = "dashboard";
let currentFilter = "all";
let contextFileId = null;
let dialogAction = null;
const uploadTasks = new Map();
const activeObjectUrls = new Map();

const iconByType = { image: "image", video: "video", pdf: "file-type-2", document: "file-text", spreadsheet: "table-2", presentation: "presentation", archive: "archive", text: "file-code-2", other: "file" };
const colorByType = { image: "#77d9c1", video: "#ed9c9a", pdf: "#ed9c9a", document: "#b6a3fc", spreadsheet: "#c4f36b", presentation: "#b6a3fc", archive: "#edc27d", text: "#77d9c1", other: "#aab4ab" };
const navTitle = { dashboard: "Overview", files: "My files", recent: "Recent", favorites: "Starred", shared: "Shared with me", images: "Images", videos: "Videos", documents: "Documents", pdfs: "PDFs", spreadsheets: "Spreadsheets", presentations: "Presentations", storage: "Storage", trash: "Trash", settings: "Settings" };

function persist() {
  try {
    const metadata = { ...state, files: state.files.map(({ id, name, type, ext, size, modified, folder, owner, favorite, shared, accessed }) => ({ id, name, type, ext, size, modified, folder, owner, favorite, shared, accessed })) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
  } catch (error) { notify("Storage is full", "Your file list could not be saved in this browser.", "triangle-alert"); }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function formatSize(bytes) {
  if (bytes < 1000 * 1000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / (1000 * 1000)).toFixed(bytes > 10 * 1000 * 1000 ? 0 : 1)} MB`;
}

function typeFromFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(extension)) return "image";
  if (file.type.startsWith("video/") || ["mp4", "webm", "mov", "avi"].includes(extension)) return "video";
  if (extension === "pdf") return "pdf";
  if (["doc", "docx"].includes(extension)) return "document";
  if (["xls", "xlsx", "csv"].includes(extension)) return "spreadsheet";
  if (["ppt", "pptx"].includes(extension)) return "presentation";
  if (["zip", "rar", "7z"].includes(extension)) return "archive";
  if (extension === "txt") return "text";
  return "other";
}

function getFileUrl(file) {
  return activeObjectUrls.get(file.id) || file.preview || "";
}

function getFileArt(file, className = "") {
  const url = getFileUrl(file);
  if (file.type === "image" && url) return `<img class="${className}" src="${escapeHtml(url)}" alt="Preview of ${escapeHtml(file.name)}" loading="lazy">`;
  if (file.type === "spreadsheet") return `<div class="sheet-art ${className}" aria-hidden="true">${"<span></span>".repeat(9)}</div>`;
  if (file.type === "presentation") return `<div class="slide-art ${className}" aria-hidden="true"><i data-lucide="presentation"></i></div>`;
  if (file.type === "video") return `<div class="video-art ${className}" aria-hidden="true"><i data-lucide="play"></i></div>`;
  return `<div class="document-art ${className}" aria-hidden="true" style="color:${colorByType[file.type] || colorByType.other}"><i data-lucide="${iconByType[file.type] || iconByType.other}"></i></div>`;
}

function matchesFilter(file, filter) {
  if (filter === "all") return true;
  if (filter === "image") return file.type === "image";
  if (filter === "pdf") return file.type === "pdf";
  return file.type === filter;
}

function filesForCurrentView() {
  const query = elements["global-search"].value.trim().toLowerCase();
  let files = currentView === "trash" ? state.trashed : state.files;
  if (currentView === "favorites") files = files.filter(file => file.favorite);
  if (currentView === "shared") files = files.filter(file => file.shared);
  if (currentView === "recent") files = files.filter(file => state.recent.includes(file.id)).sort((a, b) => state.recent.indexOf(a.id) - state.recent.indexOf(b.id));
  const viewType = { images: "image", videos: "video", documents: "document", pdfs: "pdf", spreadsheets: "spreadsheet", presentations: "presentation" }[currentView];
  if (viewType) files = files.filter(file => file.type === viewType);
  if (currentView === "dashboard" || currentView === "files" || currentView === "storage" || currentView === "settings") files = files.filter(file => matchesFilter(file, currentFilter));
  if (query) files = files.filter(file => `${file.name} ${file.type} ${file.ext} ${file.folder} ${file.owner} ${file.modified} ${formatSize(file.size)}`.toLowerCase().includes(query));
  const sort = elements["sort-select"].value;
  if (sort === "name") files = [...files].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "size") files = [...files].sort((a, b) => b.size - a.size);
  if (sort === "recent" && currentView !== "recent") files = [...files].sort((a, b) => a.id.startsWith("upload-") ? -1 : b.id.startsWith("upload-") ? 1 : Number(a.id.split("-").pop()) - Number(b.id.split("-").pop()));
  return files;
}

function renderFiles() {
  const files = filesForCurrentView();
  elements["file-grid"].replaceChildren();
  elements["file-grid"].classList.toggle("list-view", state.view === "list");
  elements["empty-state"].hidden = files.length > 0;
  elements["file-grid"].hidden = files.length === 0;
  elements["visible-count"].textContent = `${files.length} ${files.length === 1 ? "item" : "items"}`;
  elements["empty-title"].textContent = elements["global-search"].value ? "No files found" : currentView === "trash" ? "Your trash is clear" : currentView === "favorites" ? "No starred files yet" : "Nothing here just yet";
  elements["empty-copy"].textContent = elements["global-search"].value ? "Try another keyword or choose a different filter." : currentView === "trash" ? "Deleted files will stay here until you restore or remove them." : "Your next great thing can start with a file.";
  files.forEach((file, index) => {
    const card = elements["file-card-template"].content.firstElementChild.cloneNode(true);
    card.dataset.fileId = file.id;
    card.style.animationDelay = `${Math.min(index, 9) * 22}ms`;
    const preview = card.querySelector(".file-preview-content");
    preview.innerHTML = getFileArt(file);
    card.querySelector(".preview-type").textContent = file.ext;
    card.querySelector(".type-mark").innerHTML = `<i data-lucide="${iconByType[file.type] || iconByType.other}"></i>`;
    card.querySelector(".type-mark").style.color = colorByType[file.type] || colorByType.other;
    card.querySelector(".type-mark").style.background = `${colorByType[file.type] || colorByType.other}18`;
    card.querySelector(".file-name").textContent = file.name;
    card.querySelector(".file-meta").textContent = `${file.ext} · ${formatSize(file.size)}`;
    card.querySelector(".file-modified").textContent = file.modified;
    card.querySelector(".file-owner").textContent = file.owner === "You" ? "Personal" : file.owner;
    card.querySelector(".file-shared").hidden = !file.shared;
    card.querySelector(".favorite-button").classList.toggle("is-favorite", file.favorite);
    card.querySelector(".favorite-button").setAttribute("aria-label", file.favorite ? "Remove from favorites" : "Add to favorites");
    if (currentView === "trash") card.querySelector(".favorite-button").hidden = true;
    elements["file-grid"].append(card);
  });
  if (window.lucide) lucide.createIcons();
  renderRecent();
  updateCounts();
}

function renderRecent() {
  const recent = state.recent.map(id => state.files.find(file => file.id === id)).filter(Boolean).slice(0, 3);
  elements["recent-list"].replaceChildren();
  elements["recent-strip"].hidden = currentView !== "dashboard" || !recent.length;
  recent.forEach(file => {
    const item = document.createElement("button");
    item.className = "recent-item";
    item.dataset.fileId = file.id;
    item.innerHTML = `<span class="recent-thumb">${file.type === "image" && getFileUrl(file) ? `<img src="${escapeHtml(getFileUrl(file))}" alt="" loading="lazy">` : `<i data-lucide="${iconByType[file.type] || iconByType.other}"></i>`}</span><span class="recent-item-copy"><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(file.folder)} · ${formatSize(file.size)}</span></span><i data-lucide="arrow-up-right"></i>`;
    elements["recent-list"].append(item);
  });
  if (window.lucide) lucide.createIcons();
}

function updateCounts() {
  const files = state.files;
  const used = 68.4 + files.filter(file => !file.id.startsWith("seed-")).reduce((sum, file) => sum + file.size, 0) / 1e9;
  const percent = Math.min(99, used / 100 * 100);
  document.getElementById("file-count").textContent = files.length;
  document.getElementById("total-files").textContent = files.length + 12;
  document.getElementById("image-total").textContent = files.filter(file => file.type === "image").length + 5;
  document.getElementById("doc-total").textContent = files.filter(file => ["document", "pdf", "spreadsheet", "presentation"].includes(file.type)).length + 7;
  document.getElementById("shared-total").textContent = files.filter(file => file.shared).length + 1;
  elements["storage-used"].textContent = used.toFixed(1);
  elements["storage-percent"].textContent = `${Math.round(percent)}%`;
  elements["storage-ring"].style.background = `conic-gradient(var(--mint) 0 ${percent}%, #303b33 ${percent}% 100%)`;
  elements["storage-ring"].setAttribute("aria-label", `${Math.round(percent)} percent storage used`);
  elements["sidebar-storage"].textContent = `${Math.round(percent)}%`;
  elements["sidebar-storage-fill"].style.width = `${percent}%`;
  elements["sidebar-storage-copy"].textContent = `${used.toFixed(1)} GB of 100 GB`;
  const categories = [{ label: "Images", size: 28.4, color: "#77d9c1" }, { label: "Video", size: 21.7, color: "#ed9c9a" }, { label: "Docs", size: 10.2, color: "#b6a3fc" }, { label: "Other", size: 8.1, color: "#edc27d" }];
  elements["category-bars"].innerHTML = categories.map(item => `<div class="category-bar"><div class="category-bar-track"><span style="width:${Math.min(100, item.size / 30 * 100)}%;background:${item.color}"></span></div><div class="category-bar-label"><span>${item.label}</span><strong>${item.size} GB</strong></div></div>`).join("");
}

function setView(view) {
  currentView = view;
  elements["breadcrumb-title"].textContent = navTitle[view] || "Overview";
  document.querySelectorAll(".nav-item[data-view]").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  document.querySelectorAll(".mobile-nav-item[data-view]").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  const title = { dashboard: "Recently added", files: "All files", recent: "Recently opened", favorites: "Starred files", shared: "Shared with you", storage: "Your files", trash: "Trash", settings: "Your files" }[view] || navTitle[view];
  elements["files-heading"].textContent = title || "Your files";
  elements["files-eyebrow"].querySelector(".eyebrow-label").textContent = view === "trash" ? "RECOVER OR REMOVE" : view === "favorites" ? "SAVED FOR LATER" : view === "shared" ? "COLLABORATION" : view === "recent" ? "YOUR ACTIVITY" : "YOUR LIBRARY";
  elements["overview-cards"].hidden = view !== "dashboard";
  elements["welcome-section"].hidden = view !== "dashboard";
  elements["recent-strip"].hidden = view !== "dashboard";
  elements["filter-chips"].hidden = !["dashboard", "files", "storage", "settings"].includes(view);
  elements["files-section"].hidden = view === "settings" || view === "storage";
  if (view === "storage") showStorageView();
  if (view === "settings") showSettingsView();
  if (view === "trash") elements["filter-chips"].hidden = true;
  elements["global-search"].value = "";
  currentFilter = "all";
  document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.toggle("active", chip.dataset.filter === "all"));
  renderFiles();
  elements.sidebar.classList.remove("mobile-open");
  elements["drawer-scrim"].classList.remove("visible");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showStorageView() {
  elements["files-section"].hidden = false;
  elements["files-heading"].textContent = "Largest files";
  elements["files-eyebrow"].querySelector(".eyebrow-label").textContent = "SPACE BREAKDOWN";
  elements["sort-select"].value = "size";
  renderFiles();
}

function showSettingsView() {
  elements["files-section"].hidden = true;
  openDialog("Preferences", `<div class="dialog-content"><h2>Make it yours.</h2><p>Your workspace preferences are saved on this device.</p><label class="dialog-input">Appearance<select id="settings-theme"><option value="dark">Dark, after hours</option><option value="light">Light, daylight</option></select></label><label class="dialog-input">File view<select id="settings-view"><option value="grid">Grid</option><option value="list">List</option></select></label><div class="dialog-note"><i data-lucide="shield-check"></i> This prototype stores file metadata in your browser only. Add server-side validation before connecting real storage.</div><div class="dialog-actions"><button class="button button-primary" type="button" data-action="save-settings">Save preferences</button></div></div>`);
  document.getElementById("settings-theme").value = state.theme;
  document.getElementById("settings-view").value = state.view;
}

function openDialog(title, body) {
  elements["dialog-body"].innerHTML = `<span class="eyebrow">${escapeHtml(title)}</span>${body}`;
  if (!elements["app-dialog"].open) elements["app-dialog"].showModal();
  if (window.lucide) lucide.createIcons();
}

function notify(title, message, icon = "check") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span class="toast-icon"><i data-lucide="${icon}"></i></span><span class="toast-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></span><button class="toast-close" aria-label="Dismiss notification"><i data-lucide="x"></i></button>`;
  elements["toast-stack"].append(toast);
  if (window.lucide) lucide.createIcons();
  const remove = () => { toast.classList.add("leaving"); setTimeout(() => toast.remove(), 210); };
  toast.querySelector(".toast-close").addEventListener("click", remove);
  setTimeout(remove, 4200);
}

function fileById(id) { return state.files.find(file => file.id === id) || state.trashed.find(file => file.id === id); }

function markRecent(file) {
  state.recent = [file.id, ...state.recent.filter(id => id !== file.id)].slice(0, 12);
  persist();
}

function openPreview(file) {
  markRecent(file);
  const url = getFileUrl(file);
  let preview = `<div class="preview-unavailable"><span class="doc-large"><i data-lucide="${iconByType[file.type] || iconByType.other}"></i></span><h3>Preview isn't available here yet</h3><p>This ${escapeHtml(file.ext)} file is ready to download. A connected document service can add in-browser previews later.</p></div>`;
  if (file.type === "image" && url) preview = `<img src="${escapeHtml(url)}" alt="${escapeHtml(file.name)}" style="transform:rotate(0deg)">`;
  if (file.type === "video" && url) preview = `<video src="${escapeHtml(url)}" controls playsinline></video>`;
  if (file.type === "pdf" && url) preview = `<iframe src="${escapeHtml(url)}#toolbar=0" title="${escapeHtml(file.name)}"></iframe>`;
  elements["preview-content"].innerHTML = `<div class="preview-shell"><header class="preview-header"><div class="preview-title-wrap"><span class="type-mark" style="color:${colorByType[file.type] || colorByType.other}"><i data-lucide="${iconByType[file.type] || iconByType.other}"></i></span><div><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(file.ext)} · ${formatSize(file.size)} · ${escapeHtml(file.modified)}</span></div></div><div class="preview-tools">${file.type === "image" && url ? `<button class="icon-button" data-action="zoom" aria-label="Zoom image"><i data-lucide="zoom-in"></i></button><button class="icon-button" data-action="rotate" aria-label="Rotate image"><i data-lucide="rotate-cw"></i></button>` : ""}<button class="icon-button" data-action="details" data-file-id="${escapeHtml(file.id)}" aria-label="File details"><i data-lucide="info"></i></button><button class="icon-button" data-action="close-preview" aria-label="Close preview"><i data-lucide="x"></i></button></div></header><div class="preview-stage">${preview}</div><footer class="preview-footer"><button class="button button-secondary" data-action="download" data-file-id="${escapeHtml(file.id)}"><i data-lucide="download"></i> Download</button><button class="button button-secondary" data-action="share" data-file-id="${escapeHtml(file.id)}"><i data-lucide="share-2"></i> Share</button><button class="button button-secondary" data-action="rename" data-file-id="${escapeHtml(file.id)}"><i data-lucide="pencil"></i> Rename</button><span class="preview-spacer"></span><span class="preview-rotate" id="preview-rotate-label">100%</span></footer></div>`;
  elements["preview-dialog"].showModal();
  if (window.lucide) lucide.createIcons();
}

function showDetails(file) {
  const url = getFileUrl(file);
  elements["details-content"].innerHTML = `<div class="details-preview">${file.type === "image" && url ? `<img src="${escapeHtml(url)}" alt="">` : `<i data-lucide="${iconByType[file.type] || iconByType.other}"></i>`}</div><h3 class="details-filename">${escapeHtml(file.name)}</h3><div class="detail-row"><span>Type</span><span>${escapeHtml(file.ext)} file</span></div><div class="detail-row"><span>Size</span><span>${formatSize(file.size)}</span></div><div class="detail-row"><span>Created</span><span>Oct 02, 2026</span></div><div class="detail-row"><span>Modified</span><span>${escapeHtml(file.modified)}</span></div><div class="detail-row"><span>Location</span><span>My files / ${escapeHtml(file.folder)}</span></div><div class="detail-row"><span>Owner</span><span>${escapeHtml(file.owner)}</span></div><div class="detail-row"><span>Access</span><span>${file.shared ? "Shared" : "Private"}</span></div><div class="details-actions"><button class="button button-secondary" data-action="rename" data-file-id="${escapeHtml(file.id)}"><i data-lucide="pencil"></i> Rename</button><button class="button button-secondary" data-action="share" data-file-id="${escapeHtml(file.id)}"><i data-lucide="share-2"></i> Share</button><button class="button button-secondary" data-action="download" data-file-id="${escapeHtml(file.id)}"><i data-lucide="download"></i> Download</button><button class="button button-secondary" data-action="delete" data-file-id="${escapeHtml(file.id)}"><i data-lucide="trash-2"></i> ${currentView === "trash" ? "Delete forever" : "Move to trash"}</button></div>`;
  elements["details-panel"].classList.add("open");
  elements["details-panel"].setAttribute("aria-hidden", "false");
  if (window.lucide) lucide.createIcons();
}

const menuItems = [
  ["open", "external-link", "Open"], ["preview", "eye", "Preview"], ["download", "download", "Download"], ["share", "share-2", "Share"], ["rename", "pencil", "Rename"], ["move", "folder-input", "Move to folder"], "divider", ["favorite", "star", "Add to starred"], ["details", "info", "Get details"], "divider", ["delete", "trash-2", "Move to trash", "danger"]
];

function openContextMenu(file, x, y) {
  contextFileId = file.id;
  const items = currentView === "trash" ? [["restore", "rotate-ccw", "Restore"], ["details", "info", "Get details"], "divider", ["delete", "trash-2", "Delete forever", "danger"]] : menuItems;
  elements["context-menu"].innerHTML = items.map(item => item === "divider" ? '<div class="context-divider"></div>' : `<button role="menuitem" class="${item[3] || ""}" data-action="${item[0]}" data-file-id="${escapeHtml(file.id)}"><i data-lucide="${item[1]}"></i>${item[0] === "favorite" && file.favorite ? "Remove from starred" : item[0] === "delete" && currentView === "trash" ? "Delete forever" : item[2]}</button>`).join("");
  elements["context-menu"].style.left = `${Math.min(x, window.innerWidth - 205)}px`;
  elements["context-menu"].style.top = `${Math.min(y, window.innerHeight - 350)}px`;
  elements["context-menu"].classList.add("open");
  elements["menu-scrim"].classList.add("visible");
  if (window.lucide) lucide.createIcons();
}

function closeContextMenu() { elements["context-menu"].classList.remove("open"); elements["menu-scrim"].classList.remove("visible"); }

function actionForFile(action, file) {
  if (!file) return;
  closeContextMenu();
  if (action === "open" || action === "preview") openPreview(file);
  if (action === "details") showDetails(file);
  if (action === "restore") {
    const index = state.trashed.findIndex(item => item.id === file.id);
    if (index > -1) state.files.unshift(...state.trashed.splice(index, 1));
    persist(); renderFiles(); notify("File restored", `${file.name} is back in My files.`, "folder-check");
  }
  if (action === "favorite") { file.favorite = !file.favorite; persist(); renderFiles(); notify(file.favorite ? "Added to starred" : "Removed from starred", file.name, "star"); }
  if (action === "rename") {
    const baseName = file.name;
    openDialog("Rename file", `<div class="dialog-content"><h2>Give it a new name.</h2><p>Keep the extension so this file opens as expected.</p><label class="dialog-input">File name<input id="rename-input" maxlength="140" value="${escapeHtml(baseName)}" autocomplete="off"></label><div class="dialog-actions"><button class="button button-secondary" type="button" data-action="dismiss-dialog">Cancel</button><button class="button button-primary" type="button" data-action="confirm-rename" data-file-id="${escapeHtml(file.id)}">Save name</button></div></div>`);
    document.getElementById("rename-input").focus(); document.getElementById("rename-input").select();
  }
  if (action === "delete") {
    const isTrash = state.trashed.some(item => item.id === file.id);
    openDialog(isTrash ? "Delete forever" : "Move to trash", `<div class="dialog-content"><h2>${isTrash ? "This can't be undone." : "Ready to let it go?"}</h2><p>${isTrash ? "This file will be permanently deleted from this browser." : `“${escapeHtml(file.name)}” will move to Trash. You can restore it later.`}</p><div class="dialog-actions"><button class="button button-secondary" type="button" data-action="dismiss-dialog">Keep file</button><button class="button button-danger" type="button" data-action="confirm-delete" data-file-id="${escapeHtml(file.id)}">${isTrash ? "Delete forever" : "Move to trash"}</button></div></div>`);
  }
  if (action === "download") downloadFile(file);
  if (action === "share") {
    openDialog("Share file", `<div class="dialog-content"><h2>Share a little access.</h2><p>${escapeHtml(file.name)} · ${file.shared ? "Already shared with your team" : "Private to you"}</p><label class="dialog-input">Invite by email<input id="share-email" type="email" placeholder="name@example.com"></label><label class="dialog-input">Permission<select id="share-permission"><option>Can view</option><option>Can edit</option></select></label><div class="dialog-note"><i data-lucide="lock-keyhole"></i> Only invited people can access this file. Link sharing is off.</div><div class="dialog-actions"><button class="button button-secondary" type="button" data-action="dismiss-dialog">Cancel</button><button class="button button-primary" type="button" data-action="confirm-share" data-file-id="${escapeHtml(file.id)}"><i data-lucide="send"></i> Send invite</button></div></div>`);
  }
  if (action === "move") {
    openDialog("Move file", `<div class="dialog-content"><h2>Choose a destination.</h2><p>Move ${escapeHtml(file.name)} into one of your folders.</p><label class="dialog-input">Folder<select id="move-folder"><option>Studio</option><option>Fieldwork</option><option>Inspiration</option><option>Archive</option></select></label><div class="dialog-actions"><button class="button button-secondary" type="button" data-action="dismiss-dialog">Cancel</button><button class="button button-primary" type="button" data-action="confirm-move" data-file-id="${escapeHtml(file.id)}">Move file</button></div></div>`);
  }
}

function downloadFile(file) {
  const url = getFileUrl(file);
  if (!url) { notify("Download unavailable", "Connect cloud storage to download this sample file.", "cloud-off"); return; }
  const link = document.createElement("a"); link.href = url; link.download = file.name; link.target = "_blank"; link.rel = "noopener"; document.body.append(link); link.click(); link.remove();
  notify("Download started", file.name, "download");
}

function cancelUpload(id) {
  const task = uploadTasks.get(id); if (!task) return;
  task.cancelled = true; clearInterval(task.interval); uploadTasks.delete(id); task.element.remove();
  if (task.objectUrl) URL.revokeObjectURL(task.objectUrl);
  notify("Upload cancelled", task.file.name, "circle-x");
}

function uploadFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  files.forEach(file => {
    const duplicate = state.files.some(existing => existing.name.toLowerCase() === file.name.toLowerCase() && existing.size === file.size);
    const supported = typeFromFile(file) !== "other" || ["txt", "zip", "rar", "7z"].includes(file.name.split(".").pop().toLowerCase());
    if (!supported) { notify("File type not supported", `${file.name} isn't an accepted format.`, "file-warning"); return; }
    if (file.size > maxFileSize) { notify("File is too large", `${file.name} exceeds the 100 MB limit.`, "file-warning"); return; }
    if (duplicate) { notify("Already in your vault", `${file.name} appears to be a duplicate.`, "copy-check"); return; }
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const type = typeFromFile(file);
    const objectUrl = URL.createObjectURL(file);
    activeObjectUrls.set(id, objectUrl);
    const ext = file.name.split(".").pop().toUpperCase();
    const queue = document.querySelector(".upload-queue") || (() => { const container = document.createElement("div"); container.className = "upload-queue"; document.body.append(container); return container; })();
    const taskElement = document.createElement("div"); taskElement.className = "upload-task";
    taskElement.innerHTML = `<div class="upload-task-top"><span class="upload-task-icon"><i data-lucide="${iconByType[type] || iconByType.other}"></i></span><span class="upload-task-copy"><strong>${escapeHtml(file.name)}</strong><span>Preparing secure upload...</span></span><button class="upload-task-cancel" aria-label="Cancel upload" data-cancel-upload="${id}"><i data-lucide="x"></i></button></div><div class="upload-progress"><span></span></div>`;
    queue.append(taskElement); if (window.lucide) lucide.createIcons();
    const task = { file, id, objectUrl, element: taskElement, progress: 0, cancelled: false };
    uploadTasks.set(id, task);
    task.interval = setInterval(() => {
      if (task.cancelled) return;
      task.progress = Math.min(100, task.progress + 4 + Math.round(Math.random() * 9));
      taskElement.querySelector(".upload-progress span").style.width = `${task.progress}%`;
      taskElement.querySelector(".upload-task-copy span").textContent = task.progress < 100 ? `Uploading · ${task.progress}%` : "Processing file...";
      if (task.progress >= 100) {
        clearInterval(task.interval);
        setTimeout(() => {
          if (task.cancelled) return;
          state.files.unshift({ id, name: file.name, type, ext, size: file.size, modified: "Just now", folder: "My files", owner: "You", favorite: false, shared: false, accessed: Date.now(), mime: file.type });
          uploadTasks.delete(id); persist(); renderFiles();
          taskElement.classList.add("done"); taskElement.querySelector(".upload-task-icon").innerHTML = '<i data-lucide="check"></i>'; taskElement.querySelector(".upload-task-copy span").textContent = "Upload complete"; taskElement.querySelector(".upload-task-cancel").remove();
          if (window.lucide) lucide.createIcons();
          notify("Upload complete", `${file.name} is now in your vault.`, "circle-check");
          setTimeout(() => { taskElement.remove(); if (!queue.children.length) queue.remove(); }, 2100);
        }, 280);
      }
    }, 130);
  });
  elements["file-input"].value = "";
}

document.addEventListener("click", event => {
  const target = event.target.closest("[data-action], [data-view], [data-filter], [data-mode], [data-cancel-upload]");
  const card = event.target.closest(".file-card");
  if (event.target.closest("#menu-scrim")) { closeContextMenu(); return; }
  if (event.target.closest("#drawer-scrim")) { elements.sidebar.classList.remove("mobile-open"); elements["drawer-scrim"].classList.remove("visible"); return; }
  if (event.target.closest("#menu-toggle")) { elements.sidebar.classList.toggle("mobile-open"); elements["drawer-scrim"].classList.toggle("visible"); return; }
  if (event.target.closest("#browse-files")) { elements["file-input"].click(); return; }
  if (event.target.closest("#upload-zone") && !event.target.closest("#browse-files")) { elements["file-input"].click(); return; }
  if (event.target.closest("#theme-toggle")) { state.theme = state.theme === "dark" ? "light" : "dark"; applyTheme(); persist(); return; }
  if (event.target.closest("#notifications-button")) { notify("You're all caught up", "New file activity will show up here.", "bell"); return; }
  if (card) {
    const file = fileById(card.dataset.fileId);
    if (event.target.closest(".favorite-button")) { actionForFile("favorite", file); return; }
    if (event.target.closest(".file-more")) { const rect = event.target.closest(".file-more").getBoundingClientRect(); openContextMenu(file, rect.right - 186, rect.bottom + 4); return; }
    if (event.target.closest(".open-file, .file-preview") || !target) { openPreview(file); return; }
  }
  if (!target && event.target.closest(".recent-item")) { openPreview(fileById(event.target.closest(".recent-item").dataset.fileId)); return; }
  if (!target) {
    return;
  }
  if (target.dataset.cancelUpload) { cancelUpload(target.dataset.cancelUpload); return; }
  if (target.dataset.view) { setView(target.dataset.view); return; }
  if (target.dataset.filter) { currentFilter = target.dataset.filter; document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.toggle("active", chip === target)); renderFiles(); return; }
  if (target.dataset.mode) { state.view = target.dataset.mode; document.querySelectorAll(".view-button").forEach(button => button.classList.toggle("active", button === target)); persist(); renderFiles(); return; }
  const file = target.dataset.fileId ? fileById(target.dataset.fileId) : contextFileId ? fileById(contextFileId) : null;
  switch (target.dataset.action) {
    case "upload": elements["file-input"].click(); break;
    case "open": case "preview": case "download": case "share": case "rename": case "move": case "favorite": case "details": case "delete": case "restore": actionForFile(target.dataset.action, file); break;
    case "close-details": elements["details-panel"].classList.remove("open"); elements["details-panel"].setAttribute("aria-hidden", "true"); break;
    case "close-preview": elements["preview-dialog"].close(); break;
    case "dismiss-dialog": elements["app-dialog"].close(); break;
    case "zoom": { const image = elements["preview-content"].querySelector(".preview-stage img"); const zoomed = image.dataset.zoom === "true"; image.dataset.zoom = String(!zoomed); image.style.transform = zoomed ? "scale(1)" : "scale(1.6)"; image.style.cursor = zoomed ? "zoom-in" : "zoom-out"; document.getElementById("preview-rotate-label").textContent = zoomed ? "100%" : "160%"; break; }
    case "rotate": { const image = elements["preview-content"].querySelector(".preview-stage img"); image.dataset.rotation = String((Number(image.dataset.rotation) || 0) + 90); image.style.transform = `rotate(${image.dataset.rotation}deg)`; break; }
    case "confirm-rename": { const value = document.getElementById("rename-input").value.trim(); if (!value || !file) { notify("Add a file name", "A file name can't be empty.", "file-warning"); return; } file.name = value; persist(); renderFiles(); elements["app-dialog"].close(); notify("File renamed", value, "pencil"); break; }
    case "confirm-delete": { const index = state.files.findIndex(item => item.id === target.dataset.fileId); if (index > -1) state.trashed.unshift(...state.files.splice(index, 1)); else { state.trashed = state.trashed.filter(item => item.id !== target.dataset.fileId); if (activeObjectUrls.has(target.dataset.fileId)) { URL.revokeObjectURL(activeObjectUrls.get(target.dataset.fileId)); activeObjectUrls.delete(target.dataset.fileId); } } persist(); renderFiles(); elements["app-dialog"].close(); elements["details-panel"].classList.remove("open"); notify("Moved to trash", "You can restore this file from Trash.", "trash-2"); break; }
    case "confirm-share": { const email = document.getElementById("share-email").value.trim(); if (!email || !email.includes("@")) { notify("Enter a valid email", "Add the teammate you'd like to invite.", "mail-warning"); return; } if (file) file.shared = true; persist(); renderFiles(); elements["app-dialog"].close(); notify("Invite sent", `${email} can now access ${file?.name || "this file"}.`, "send"); break; }
    case "confirm-move": if (file) { file.folder = document.getElementById("move-folder").value; persist(); renderFiles(); elements["app-dialog"].close(); notify("File moved", `${file.name} · ${file.folder}`, "folder-check"); } break;
    case "save-settings": { state.theme = document.getElementById("settings-theme").value; state.view = document.getElementById("settings-view").value; applyTheme(); document.querySelectorAll(".view-button").forEach(button => button.classList.toggle("active", button.dataset.mode === state.view)); persist(); elements["app-dialog"].close(); notify("Preferences saved", "Your workspace is set up just right.", "settings-2"); renderFiles(); break; }
    case "help": openDialog("Help & support", `<div class="dialog-content"><h2>Here when you need us.</h2><p>This is a frontend prototype. Your sample files and uploaded metadata stay in this browser; actual file transfer, sharing, and identity checks need a trusted backend.</p><div class="dialog-note"><i data-lucide="shield-check"></i> Never rely on client-side file validation alone to protect a production upload endpoint.</div><div class="dialog-actions"><button class="button button-primary" type="button" data-action="dismiss-dialog">Got it</button></div></div>`); break;
    case "profile": openDialog("Your account", `<div class="dialog-content"><h2>Aritra K.</h2><p>Personal workspace · Free plan</p><div class="detail-row"><span>Signed in as</span><span>aritra@example.com</span></div><div class="detail-row"><span>Workspace</span><span>Personal space</span></div><div class="dialog-actions"><button class="button button-secondary" type="button" data-action="dismiss-dialog">Close</button><button class="button button-primary" type="button" data-view="settings">Preferences</button></div></div>`); break;
    default: break;
  }
});

document.addEventListener("contextmenu", event => {
  const card = event.target.closest(".file-card");
  if (!card) return;
  event.preventDefault();
  const file = fileById(card.dataset.fileId);
  openContextMenu(file, event.clientX, event.clientY);
});

elements["global-search"].addEventListener("input", () => {
  if (elements["global-search"].value && currentView !== "files") {
    currentView = "files";
    document.querySelectorAll(".nav-item[data-view]").forEach(item => item.classList.toggle("active", item.dataset.view === "files"));
    elements["breadcrumb-title"].textContent = "Search results";
    elements["files-heading"].textContent = "Search results";
    elements["overview-cards"].hidden = true; elements["welcome-section"].hidden = true; elements["recent-strip"].hidden = true; elements["files-section"].hidden = false; elements["filter-chips"].hidden = false;
  }
  renderFiles();
});
elements["sort-select"].addEventListener("change", renderFiles);
elements["file-input"].addEventListener("change", event => uploadFiles(event.target.files));
elements["upload-zone"].addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); elements["file-input"].click(); } });

let dragDepth = 0;
document.addEventListener("dragenter", event => { if (!event.dataTransfer?.types.includes("Files")) return; dragDepth += 1; elements["upload-zone"].classList.add("drag-over"); });
document.addEventListener("dragleave", event => { if (!event.dataTransfer?.types.includes("Files")) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) elements["upload-zone"].classList.remove("drag-over"); });
document.addEventListener("dragover", event => { if (event.dataTransfer?.types.includes("Files")) event.preventDefault(); });
document.addEventListener("drop", event => { if (!event.dataTransfer?.files.length) return; event.preventDefault(); dragDepth = 0; elements["upload-zone"].classList.remove("drag-over"); uploadFiles(event.dataTransfer.files); });

document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); elements["global-search"].focus(); }
  if (event.key === "Escape") { closeContextMenu(); elements["details-panel"].classList.remove("open"); elements["details-panel"].setAttribute("aria-hidden", "true"); }
});
elements["preview-dialog"].addEventListener("click", event => { if (event.target === elements["preview-dialog"]) elements["preview-dialog"].close(); });
elements["app-dialog"].addEventListener("click", event => { if (event.target === elements["app-dialog"]) elements["app-dialog"].close(); });
elements["preview-dialog"].addEventListener("close", () => { const video = elements["preview-content"].querySelector("video"); if (video) video.pause(); });
elements["sort-select"].value = "recent";

function applyTheme() {
  document.documentElement.classList.toggle("light-theme", state.theme === "light");
  document.getElementById("theme-toggle").innerHTML = `<i data-lucide="${state.theme === "dark" ? "sun" : "moon"}"></i>`;
  document.getElementById("theme-toggle").setAttribute("aria-label", state.theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  if (window.lucide) lucide.createIcons();
}

applyTheme();
document.querySelectorAll(".view-button").forEach(button => button.classList.toggle("active", button.dataset.mode === state.view));
renderFiles();