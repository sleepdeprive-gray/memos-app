const TOKEN_STORAGE_KEY = "memos_admin_token";
const TOKEN_EXP_STORAGE_KEY = "memos_admin_token_exp";
const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 1.25;

const PLACEHOLDER_IMAGES = [
  { id: "ph-1015", source: "placeholder", title: "Placeholder 1", url: "https://picsum.photos/id/1015/1200/900", thumbUrl: "https://picsum.photos/id/1015/600/400" },
  { id: "ph-1016", source: "placeholder", title: "Placeholder 2", url: "https://picsum.photos/id/1016/1200/900", thumbUrl: "https://picsum.photos/id/1016/600/400" },
  { id: "ph-1020", source: "placeholder", title: "Placeholder 3", url: "https://picsum.photos/id/1020/1200/900", thumbUrl: "https://picsum.photos/id/1020/600/400" },
  { id: "ph-1024", source: "placeholder", title: "Placeholder 4", url: "https://picsum.photos/id/1024/1200/900", thumbUrl: "https://picsum.photos/id/1024/600/400" },
  { id: "ph-1035", source: "placeholder", title: "Placeholder 5", url: "https://picsum.photos/id/1035/1200/900", thumbUrl: "https://picsum.photos/id/1035/600/400" },
  { id: "ph-1043", source: "placeholder", title: "Placeholder 6", url: "https://picsum.photos/id/1043/1200/900", thumbUrl: "https://picsum.photos/id/1043/600/400" },
  { id: "ph-1050", source: "placeholder", title: "Placeholder 7", url: "https://picsum.photos/id/1050/1200/900", thumbUrl: "https://picsum.photos/id/1050/600/400" },
  { id: "ph-1062", source: "placeholder", title: "Placeholder 8", url: "https://picsum.photos/id/1062/1200/900", thumbUrl: "https://picsum.photos/id/1062/600/400" },
  { id: "ph-1074", source: "placeholder", title: "Placeholder 9", url: "https://picsum.photos/id/1074/1200/900", thumbUrl: "https://picsum.photos/id/1074/600/400" },
  { id: "ph-1084", source: "placeholder", title: "Placeholder 10", url: "https://picsum.photos/id/1084/1200/900", thumbUrl: "https://picsum.photos/id/1084/600/400" },
  { id: "ph-1080", source: "placeholder", title: "Placeholder 11", url: "https://picsum.photos/id/1080/1200/900", thumbUrl: "https://picsum.photos/id/1080/600/400" },
  { id: "ph-1081", source: "placeholder", title: "Placeholder 12", url: "https://picsum.photos/id/1081/1200/900", thumbUrl: "https://picsum.photos/id/1081/600/400" }
];

const state = {
  token: localStorage.getItem(TOKEN_STORAGE_KEY) || "",
  tokenExp: Number(localStorage.getItem(TOKEN_EXP_STORAGE_KEY) || 0),
  uploadedImages: [],
  imageMap: new Map(),
  selectedKey: "",
  zoom: DEFAULT_ZOOM
};

const marqueeEl = document.getElementById("marquee");
const cardTemplate = document.getElementById("cardTemplate");
const loadingOverlayEl = document.getElementById("loadingOverlay");
const loadingPercentEl = document.getElementById("loadingPercent");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");

const manageBtn = document.getElementById("manageBtn");
const manageBtnIcon = document.getElementById("manageBtnIcon");
const manageBtnLabel = document.getElementById("manageBtnLabel");
const pinModal = document.getElementById("pinModal");
const closePinBtn = document.getElementById("closePinBtn");
const uploadModal = document.getElementById("uploadModal");
const closeUploadBtn = document.getElementById("closeUploadBtn");
const pinInput = document.getElementById("pinInput");
const unlockBtn = document.getElementById("unlockBtn");
const authHint = document.getElementById("authHint");
const uploadInput = document.getElementById("uploadInput");
const uploadBtn = document.getElementById("uploadBtn");
const manageList = document.getElementById("manageList");
const uploadingModal = document.getElementById("uploadingModal");
const uploadingList = document.getElementById("uploadingList");
const successModal = document.getElementById("successModal");

const previewModal = document.getElementById("previewModal");
const previewImage = document.getElementById("previewImage");
const previewCaption = document.getElementById("previewCaption");
const downloadBtn = document.getElementById("downloadBtn");
const previewDeleteBtn = document.getElementById("previewDeleteBtn");
const closePreviewBtn = document.getElementById("closePreviewBtn");

function isAdmin() {
  return Boolean(state.token) && state.tokenExp > Math.floor(Date.now() / 1000);
}

function setSession(token, expiresAt) {
  state.token = token;
  state.tokenExp = Number(expiresAt || 0);
  localStorage.setItem(TOKEN_STORAGE_KEY, state.token);
  localStorage.setItem(TOKEN_EXP_STORAGE_KEY, String(state.tokenExp));
}

function clearSession() {
  state.token = "";
  state.tokenExp = 0;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXP_STORAGE_KEY);
}

function setAuthHint(message, isError = false) {
  authHint.textContent = message;
  authHint.style.color = isError ? "#b91c1c" : "#64748b";
}

function syncManageButtonState() {
  if (isAdmin()) {
    manageBtnIcon.textContent = "⬆️";
    manageBtnLabel.textContent = "Upload Photos";
  } else {
    manageBtnIcon.textContent = "🗂️";
    manageBtnLabel.textContent = "Manage Photos";
  }
}

function openModal(modal) {
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
}

function imageKey(image) {
  return `${image.source}:${image.id}`;
}

function allImages() {
  return [...state.uploadedImages, ...PLACEHOLDER_IMAGES];
}

function rotateItems(items, offset) {
  if (!items.length) {
    return [];
  }
  const start = offset % items.length;
  return items.slice(start).concat(items.slice(0, start));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyZoom() {
  marqueeEl.style.transform = `scale(${state.zoom})`;
  marqueeEl.style.transformOrigin = "center center";
}

async function apiRequest(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    ...(options.headers || {})
  };

  if (isAdmin()) {
    headers.authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return payload;
}

async function fetchUploadedImages() {
  try {
    const payload = await apiRequest("/api/list-images", { method: "GET", headers: {} });
    const images = Array.isArray(payload.images) ? payload.images : [];
    state.uploadedImages = images
      .map((item) => ({
        id: String(item.id || ""),
        source: "user",
        title: String(item.title || "Uploaded photo"),
        url: String(item.url || item.thumbUrl || ""),
        thumbUrl: String(item.thumbUrl || item.url || "")
      }))
      .filter((item) => item.id && item.url);
  } catch (_error) {
    state.uploadedImages = [];
  }
}

function renderUploadingList(items) {
  if (!uploadingList) {
    return;
  }

  uploadingList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.textContent = "No files selected.";
    empty.style.color = "#64748b";
    uploadingList.appendChild(empty);
    return;
  }

  items.forEach((name) => {
    const row = document.createElement("div");
    row.className = "manage-item";
    const title = document.createElement("span");
    title.textContent = name;
    row.appendChild(title);
    uploadingList.appendChild(row);
  });
}

function renderWall() {
  marqueeEl.innerHTML = "";
  state.imageMap.clear();

  const images = allImages().slice(0, 3);
  images.forEach((image) => {
    state.imageMap.set(imageKey(image), image);
  });

  if (!images.length) {
    return;
  }

  const carousel = document.createElement("section");
  carousel.className = "carousel";

  const viewport = document.createElement("div");
  viewport.className = "viewport";

  const track = document.createElement("div");
  track.className = "track";
  track.style.setProperty("--duration", "14s");

  const sequence = [images[0], images[1] || images[0], images[2] || images[0], images[0], images[1] || images[0], images[2] || images[0]];

  sequence.forEach((image) => {
    const slide = document.createElement("div");
    slide.className = "slide";

    const card = cardTemplate.content.firstElementChild.cloneNode(true);
    const key = imageKey(image);
    card.dataset.key = key;

    const img = card.querySelector("img");
    img.src = image.thumbUrl || image.url;
    img.alt = image.title || "Memos photo";

    slide.appendChild(card);
    track.appendChild(slide);
  });

  viewport.appendChild(track);
  carousel.appendChild(viewport);

  const controls = document.createElement("div");
  controls.className = "carousel-controls";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "carousel-nav";
  prevBtn.textContent = "\u2039";

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "carousel-nav";
  nextBtn.textContent = "\u203a";

  const setManualOffset = (direction) => {
    track.classList.add("paused");
    const step = marqueeEl.clientWidth / 3;
    const current = Number(track.dataset.offset || 0);
    const next = current + direction * step;
    track.dataset.offset = String(next);
    track.style.transform = `translateX(${next}px)`;
    setTimeout(() => {
      track.classList.remove("paused");
      track.style.removeProperty("transform");
      track.dataset.offset = "0";
    }, 260);
  };

  prevBtn.addEventListener("click", () => setManualOffset(1));
  nextBtn.addEventListener("click", () => setManualOffset(-1));

  controls.appendChild(prevBtn);
  controls.appendChild(nextBtn);
  carousel.appendChild(controls);

  marqueeEl.appendChild(carousel);
  applyZoom();
}

function renderManageList() {
  manageList.innerHTML = "";

  if (!state.uploadedImages.length) {
    const empty = document.createElement("p");
    empty.textContent = "No uploaded photos yet.";
    empty.style.color = "#64748b";
    manageList.appendChild(empty);
    return;
  }

  state.uploadedImages.forEach((image) => {
    const row = document.createElement("div");
    row.className = "manage-item";

    const title = document.createElement("span");
    title.textContent = image.title;

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";

    const open = document.createElement("button");
    open.type = "button";
    open.textContent = "Open";
    open.dataset.action = "open";
    open.dataset.key = imageKey(image);

    actions.appendChild(open);

    if (isAdmin()) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn-danger";
      del.textContent = "Delete";
      del.dataset.action = "delete";
      del.dataset.id = image.id;
      actions.appendChild(del);
    }

    row.appendChild(title);
    row.appendChild(actions);
    manageList.appendChild(row);
  });
}

function openPreview(key) {
  const image = state.imageMap.get(key);
  if (!image) {
    return;
  }

  state.selectedKey = key;
  previewImage.src = image.url;
  previewImage.alt = image.title || "Preview";
  previewCaption.textContent = image.title || "";

  downloadBtn.href = image.url;
  downloadBtn.setAttribute("download", `${(image.title || "memos-photo").replace(/\s+/g, "-").toLowerCase()}.jpg`);

  previewDeleteBtn.classList.toggle("hidden", !(isAdmin() && image.source === "user"));
  openModal(previewModal);
}

async function deleteImage(id) {
  if (!isAdmin()) {
    setAuthHint("Unlock first to delete photos.", true);
    return;
  }

  await apiRequest("/api/delete-image", {
    method: "POST",
    body: JSON.stringify({ id })
  });

  await refreshGallery();
  closeModal(previewModal);
  setAuthHint("Photo deleted.");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      const base64 = content.includes(",") ? content.split(",")[1] : content;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

async function unlockWithPin() {
  const pin = pinInput.value.trim();
  if (!pin) {
    setAuthHint("Enter PIN first.", true);
    return;
  }

  unlockBtn.disabled = true;
  unlockBtn.textContent = "Checking...";

  try {
    const payload = await apiRequest("/api/auth-login", {
      method: "POST",
      body: JSON.stringify({ pin })
    });

    setSession(payload.token, payload.expiresAt);
    pinInput.value = "";
    setAuthHint("Admin unlocked.");
    syncManageButtonState();
    closeModal(pinModal);
    renderManageList();
  } catch (error) {
    clearSession();
    syncManageButtonState();
    setAuthHint(error.message || "PIN invalid.", true);
  } finally {
    unlockBtn.disabled = false;
    unlockBtn.textContent = "Unlock";
  }
}

async function uploadPhoto() {
  if (!isAdmin()) {
    setAuthHint("Unlock first to upload photos.", true);
    return;
  }

  const files = uploadInput.files ? Array.from(uploadInput.files) : [];
  if (!files.length) {
    setAuthHint("Pick at least one image file.", true);
    return;
  }

  if (files.length > 10) {
    setAuthHint("Maximum 10 photos per upload.", true);
    return;
  }

  if (files.some((file) => file.size > 32 * 1024 * 1024)) {
    setAuthHint("One or more images are too large. Max 32 MB each.", true);
    return;
  }

  renderUploadingList(files.map((file) => file.name));
  openModal(uploadingModal);
  closeModal(uploadModal);

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  try {
    for (const file of files) {
      const imageBase64 = await fileToBase64(file);
      await apiRequest("/api/upload-image", {
        method: "POST",
        body: JSON.stringify({ imageBase64, name: file.name })
      });
    }

    uploadInput.value = "";
    await refreshGallery();
    closeModal(uploadingModal);
    openModal(successModal);
    setTimeout(() => {
      window.location.reload();
    }, 900);
  } catch (error) {
    closeModal(uploadingModal);
    openModal(uploadModal);
    setAuthHint(error.message || "Upload failed.", true);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";
  }
}

async function refreshGallery() {
  await fetchUploadedImages();
  renderWall();
  renderManageList();
}

function runLoadingOverlay() {
  const duration = 1500 + Math.floor(Math.random() * 1501);
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(1, elapsed / duration);
      const value = Math.min(100, Math.floor(ratio * 100));
      loadingPercentEl.textContent = `${value}%`;
    }, 60);

    setTimeout(() => {
      clearInterval(interval);
      loadingPercentEl.textContent = "100%";
      loadingOverlayEl.classList.add("hide");
      setTimeout(resolve, 420);
    }, duration);
  });
}

marqueeEl.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (!card || !card.dataset.key) {
    return;
  }

  openPreview(card.dataset.key);
});

manageBtn.addEventListener("click", () => {
  if (isAdmin()) {
    openModal(uploadModal);
    renderManageList();
  } else {
    openModal(pinModal);
  }
});

closePinBtn.addEventListener("click", () => closeModal(pinModal));
closeUploadBtn.addEventListener("click", () => closeModal(uploadModal));
closePreviewBtn.addEventListener("click", () => closeModal(previewModal));
unlockBtn.addEventListener("click", unlockWithPin);
uploadBtn.addEventListener("click", uploadPhoto);
zoomInBtn?.addEventListener("click", () => {
  state.zoom = clamp(Number((state.zoom + ZOOM_STEP).toFixed(2)), MIN_ZOOM, MAX_ZOOM);
  applyZoom();
});
zoomOutBtn?.addEventListener("click", () => {
  state.zoom = clamp(Number((state.zoom - ZOOM_STEP).toFixed(2)), MIN_ZOOM, MAX_ZOOM);
  applyZoom();
});

manageList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  if (action === "open" && button.dataset.key) {
    openPreview(button.dataset.key);
  }

  if (action === "delete" && button.dataset.id) {
    await deleteImage(button.dataset.id);
  }
});

previewDeleteBtn.addEventListener("click", async () => {
  const image = state.imageMap.get(state.selectedKey);
  if (!image || image.source !== "user") {
    return;
  }

  await deleteImage(image.id);
});

previewModal.addEventListener("click", (event) => {
  if (event.target === previewModal) {
    closeModal(previewModal);
  }
});

pinModal.addEventListener("click", (event) => {
  if (event.target === pinModal) {
    closeModal(pinModal);
  }
});

uploadModal.addEventListener("click", (event) => {
  if (event.target === uploadModal) {
    closeModal(uploadModal);
  }
});

window.addEventListener("DOMContentLoaded", async () => {
  if (!isAdmin()) {
    clearSession();
  }

  setAuthHint("Locked mode.");
  syncManageButtonState();

  const loadingTask = runLoadingOverlay();
  await refreshGallery();
  await loadingTask;
});
