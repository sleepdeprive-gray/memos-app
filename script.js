const TOKEN_STORAGE_KEY = "memos_admin_token";
const TOKEN_EXP_STORAGE_KEY = "memos_admin_token_exp";
const SIZE_CLASSES = ["size-a", "size-b", "size-c", "size-d"];
const LANE_COUNT = 4;

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
  selectedKey: ""
};

const marqueeEl = document.getElementById("marquee");
const cardTemplate = document.getElementById("cardTemplate");
const loadingOverlayEl = document.getElementById("loadingOverlay");
const loadingPercentEl = document.getElementById("loadingPercent");

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
  authHint.style.color = isError ? "#ffd1d1" : "#ffb8b8";
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
    empty.style.color = "#ffb8b8";
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

  const images = allImages();
  images.forEach((image) => {
    state.imageMap.set(imageKey(image), image);
  });

  for (let laneIndex = 0; laneIndex < LANE_COUNT; laneIndex += 1) {
    const lane = document.createElement("div");
    lane.className = "lane";

    const track = document.createElement("div");
    track.className = `track ${laneIndex % 2 ? "right" : "left"}`;
    track.style.setProperty("--duration", `${42 + laneIndex * 9}s`);

    const rotated = rotateItems(images, laneIndex);

    for (let pass = 0; pass < 2; pass += 1) {
      rotated.forEach((image, idx) => {
        const card = cardTemplate.content.firstElementChild.cloneNode(true);
        const itemIndex = idx + pass * rotated.length + laneIndex;
        const key = imageKey(image);

        card.classList.add(SIZE_CLASSES[itemIndex % SIZE_CLASSES.length]);
        card.dataset.key = key;

        const img = card.querySelector("img");
        img.src = image.thumbUrl || image.url;
        img.alt = image.title || "Memos photo";

        track.appendChild(card);
      });
    }

    lane.appendChild(track);
    marqueeEl.appendChild(lane);
  }
}

function renderManageList() {
  manageList.innerHTML = "";

  if (!state.uploadedImages.length) {
    const empty = document.createElement("p");
    empty.textContent = "No uploaded photos yet.";
    empty.style.color = "#ffb8b8";
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
