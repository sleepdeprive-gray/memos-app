const SEED_IMAGES = [
  {
    source: "seed",
    title: "Winter laugh",
    url: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=1200"
  },
  {
    source: "seed",
    title: "Balcony hug",
    url: "https://images.pexels.com/photos/3881070/pexels-photo-3881070.jpeg?auto=compress&cs=tinysrgb&w=1200"
  },
  {
    source: "seed",
    title: "Sunset memory",
    url: "https://images.pexels.com/photos/5940862/pexels-photo-5940862.jpeg?auto=compress&cs=tinysrgb&w=1200"
  },
  {
    source: "seed",
    title: "City selfie",
    url: "https://images.pexels.com/photos/6010626/pexels-photo-6010626.jpeg?auto=compress&cs=tinysrgb&w=1200"
  },
  {
    source: "seed",
    title: "Field walk",
    url: "https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=1200"
  },
  {
    source: "seed",
    title: "Road trip",
    url: "https://images.pexels.com/photos/10153620/pexels-photo-10153620.jpeg?auto=compress&cs=tinysrgb&w=1200"
  },
  {
    source: "seed",
    title: "Hand promise",
    url: "https://images.pexels.com/photos/1024965/pexels-photo-1024965.jpeg?auto=compress&cs=tinysrgb&w=1200"
  },
  {
    source: "seed",
    title: "Park picnic",
    url: "https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=1200"
  },
  {
    source: "seed",
    title: "Beach chat",
    url: "https://images.pexels.com/photos/3769118/pexels-photo-3769118.jpeg?auto=compress&cs=tinysrgb&w=1200"
  }
];

const SIZE_CLASSES = ["size-a", "size-b", "size-c", "size-d"];
const LANE_COUNT = 4;
const TOKEN_STORAGE_KEY = "memos_admin_token";
const TOKEN_EXP_STORAGE_KEY = "memos_admin_token_exp";

const state = {
  token: localStorage.getItem(TOKEN_STORAGE_KEY) || "",
  tokenExp: Number(localStorage.getItem(TOKEN_EXP_STORAGE_KEY) || 0),
  userImages: []
};

const marqueeEl = document.getElementById("marquee");
const cardTemplate = document.getElementById("cardTemplate");
const pinInput = document.getElementById("pinInput");
const unlockBtn = document.getElementById("unlockBtn");
const uploadInput = document.getElementById("uploadInput");
const uploadBtn = document.getElementById("uploadBtn");
const authHint = document.getElementById("authHint");
const adminUploadPanel = document.getElementById("adminUploadPanel");

function isAdmin() {
  return Boolean(state.token) && state.tokenExp > Math.floor(Date.now() / 1000);
}

function setAdminSession(token, expiresAt) {
  state.token = token;
  state.tokenExp = Number(expiresAt || 0);
  localStorage.setItem(TOKEN_STORAGE_KEY, state.token);
  localStorage.setItem(TOKEN_EXP_STORAGE_KEY, String(state.tokenExp));
}

function clearAdminSession() {
  state.token = "";
  state.tokenExp = 0;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXP_STORAGE_KEY);
}

function setHint(message, isError = false) {
  authHint.textContent = message;
  authHint.style.color = isError ? "#7d1c16" : "";
}

function toggleAdminUI() {
  if (isAdmin()) {
    adminUploadPanel.classList.remove("hidden");
    setHint("Unlocked mode: you can upload and delete photos.");
  } else {
    adminUploadPanel.classList.add("hidden");
    setHint("Locked mode: upload and delete are hidden.");
  }
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
    const message = payload && payload.error ? payload.error : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload;
}

async function loadGallery() {
  try {
    const payload = await apiRequest("/api/list-images", { method: "GET", headers: {} });
    state.userImages = Array.isArray(payload.images) ? payload.images : [];
  } catch (_error) {
    state.userImages = [];
  }
}

function withSizeClass(image, index) {
  return {
    ...image,
    sizeClass: SIZE_CLASSES[index % SIZE_CLASSES.length]
  };
}

function buildGallerySet() {
  const merged = [...state.userImages, ...SEED_IMAGES];
  return merged.map((image, index) => withSizeClass(image, index));
}

function renderCard(image, index) {
  const node = cardTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(SIZE_CLASSES[(index + 1) % SIZE_CLASSES.length]);
  node.dataset.imageId = image.id || "";
  node.dataset.source = image.source || "seed";

  const img = node.querySelector("img");
  img.src = image.thumbUrl || image.url;
  img.alt = image.title || "Memory photo";

  const deleteBtn = node.querySelector(".delete-btn");
  if (!isAdmin() || image.source !== "user") {
    deleteBtn.remove();
  }

  return node;
}

function makeLane(images, laneIndex) {
  const lane = document.createElement("div");
  lane.className = "lane";

  const track = document.createElement("div");
  track.className = `track ${laneIndex % 2 ? "right" : "left"}`;

  const shuffled = images.slice(laneIndex).concat(images.slice(0, laneIndex));
  const firstPass = shuffled.map((image, index) => renderCard(image, index + laneIndex));
  const secondPass = shuffled.map((image, index) => renderCard(image, index + laneIndex + 99));

  [...firstPass, ...secondPass].forEach((card) => track.appendChild(card));

  const speed = 40 + laneIndex * 10;
  track.style.setProperty("--duration", `${speed}s`);

  lane.appendChild(track);
  return lane;
}

function renderMarquee() {
  marqueeEl.innerHTML = "";
  const gallerySet = buildGallerySet();

  for (let laneIndex = 0; laneIndex < LANE_COUNT; laneIndex += 1) {
    marqueeEl.appendChild(makeLane(gallerySet, laneIndex));
  }
}

async function unlockAdmin() {
  const pin = pinInput.value.trim();
  if (!pin) {
    setHint("Enter a PIN first.", true);
    return;
  }

  unlockBtn.disabled = true;
  unlockBtn.textContent = "Checking...";

  try {
    const payload = await apiRequest("/api/auth-login", {
      method: "POST",
      body: JSON.stringify({ pin })
    });

    setAdminSession(payload.token, payload.expiresAt);
    pinInput.value = "";
    toggleAdminUI();
    renderMarquee();
  } catch (error) {
    clearAdminSession();
    toggleAdminUI();
    setHint(error.message || "PIN unlock failed.", true);
  } finally {
    unlockBtn.disabled = false;
    unlockBtn.textContent = "Unlock";
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      const base64 = content.includes(",") ? content.split(",")[1] : content;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Unable to read selected image."));
    reader.readAsDataURL(file);
  });
}

async function uploadImage() {
  if (!isAdmin()) {
    setHint("Unlock with PIN before uploading.", true);
    return;
  }

  const file = uploadInput.files && uploadInput.files[0];
  if (!file) {
    setHint("Pick an image file first.", true);
    return;
  }

  if (file.size > 32 * 1024 * 1024) {
    setHint("Image is too large. Max size is 32 MB.", true);
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  try {
    const imageBase64 = await fileToBase64(file);
    await apiRequest("/api/upload-image", {
      method: "POST",
      body: JSON.stringify({
        imageBase64,
        name: file.name
      })
    });

    uploadInput.value = "";
    await loadGallery();
    renderMarquee();
    setHint("Upload complete.");
  } catch (error) {
    setHint(error.message || "Upload failed.", true);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload";
  }
}

async function deleteImage(id) {
  if (!isAdmin()) {
    setHint("Unlock with PIN before deleting.", true);
    return;
  }

  if (!id) {
    return;
  }

  try {
    await apiRequest("/api/delete-image", {
      method: "POST",
      body: JSON.stringify({ id })
    });

    await loadGallery();
    renderMarquee();
    setHint("Image deleted.");
  } catch (error) {
    setHint(error.message || "Delete failed.", true);
  }
}

marqueeEl.addEventListener("click", async (event) => {
  const button = event.target.closest(".delete-btn");
  if (!button) {
    return;
  }

  const card = button.closest(".card");
  const id = card && card.dataset ? card.dataset.imageId : "";
  if (!id) {
    return;
  }

  await deleteImage(id);
});

unlockBtn.addEventListener("click", unlockAdmin);
uploadBtn.addEventListener("click", uploadImage);

window.addEventListener("DOMContentLoaded", async () => {
  if (!isAdmin()) {
    clearAdminSession();
  }

  toggleAdminUI();
  await loadGallery();
  renderMarquee();
});
