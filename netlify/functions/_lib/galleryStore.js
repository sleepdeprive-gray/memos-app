const fs = require("fs");
const path = require("path");

const STORE_NAME = "gallery";
const IMAGE_PREFIX = "image:";
const LOCAL_STORE_FILE = path.join(process.cwd(), "local_gallery_store.json");

function readLocalStore() {
  try {
    if (!fs.existsSync(LOCAL_STORE_FILE)) {
      return {};
    }
    const data = fs.readFileSync(LOCAL_STORE_FILE, "utf8");
    return JSON.parse(data || "{}");
  } catch (err) {
    console.error("Failed to read local store:", err);
    return {};
  }
}

function writeLocalStore(data) {
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write local store:", err);
  }
}

function makeKey(id) {
  return `${IMAGE_PREFIX}${id}`;
}

async function listImages() {
  try {
    const { getStore } = require("@netlify/blobs");
    const store = getStore(STORE_NAME);
    const listed = await store.list({ prefix: IMAGE_PREFIX });
    const blobs = listed && Array.isArray(listed.blobs) ? listed.blobs : [];

    const items = await Promise.all(
      blobs.map(async (blob) => store.get(blob.key, { type: "json" }))
    );

    return items
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn("Netlify Blobs is not available, falling back to local file store. Error:", error.message);
    const localData = readLocalStore();
    const items = Object.values(localData).filter((item) => item && item.id);
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

async function saveImage(item) {
  try {
    const { getStore } = require("@netlify/blobs");
    const store = getStore(STORE_NAME);
    await store.setJSON(makeKey(item.id), item);
    return item;
  } catch (error) {
    console.warn("Netlify Blobs is not available, saving to local file store. Error:", error.message);
    const localData = readLocalStore();
    localData[item.id] = item;
    writeLocalStore(localData);
    return item;
  }
}

async function getImage(id) {
  try {
    const { getStore } = require("@netlify/blobs");
    const store = getStore(STORE_NAME);
    return await store.get(makeKey(id), { type: "json" });
  } catch (error) {
    console.warn("Netlify Blobs is not available, getting from local file store. Error:", error.message);
    const localData = readLocalStore();
    return localData[id] || null;
  }
}

async function removeImage(id) {
  try {
    const { getStore } = require("@netlify/blobs");
    const store = getStore(STORE_NAME);
    await store.delete(makeKey(id));
  } catch (error) {
    console.warn("Netlify Blobs is not available, deleting from local file store. Error:", error.message);
    const localData = readLocalStore();
    delete localData[id];
    writeLocalStore(localData);
  }
}

module.exports = {
  listImages,
  saveImage,
  getImage,
  removeImage
};
