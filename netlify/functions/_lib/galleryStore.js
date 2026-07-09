const fs = require("fs");
const path = require("path");

const STORE_NAME = "gallery";
const IMAGE_PREFIX = "image:";
function findProjectRoot() {
  let currentDir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(currentDir, "netlify.toml")) || fs.existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  return process.cwd();
}

const LOCAL_STORE_FILE = path.join(findProjectRoot(), "local_gallery_store.json");

function shouldCallBlobs() {
  return !process.env.NETLIFY_DEV;
}

let INLINED_STORE = {};
try {
  INLINED_STORE = require("../../../local_gallery_store.json");
} catch (_err) {
  // Ignore error if file is missing
}

function readLocalStore() {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const data = fs.readFileSync(LOCAL_STORE_FILE, "utf8");
      return JSON.parse(data || "{}");
    }
  } catch (err) {
    console.error("Failed to read local store file, using inlined fallback:", err);
  }
  return INLINED_STORE;
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

function cleanAndSort(items) {
  const sorted = items
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const seenUrls = new Set();
  return sorted.filter((item) => {
    if (!item.url) return false;
    const normUrl = item.url.trim().toLowerCase().replace(/^https?:\/\//, "");
    if (seenUrls.has(normUrl)) {
      return false;
    }
    seenUrls.add(normUrl);
    return true;
  });
}

async function listImages() {
  try {
    if (!shouldCallBlobs()) {
      throw new Error("Local dev environment - bypassing Blobs");
    }
    const { getStore } = require("@netlify/blobs");
    const store = getStore(STORE_NAME);
    let listed = await store.list({ prefix: IMAGE_PREFIX });
    let blobs = listed && Array.isArray(listed.blobs) ? listed.blobs : [];

    // Sync any missing local store items into Netlify Blobs
    const localData = readLocalStore();
    const localItems = Object.values(localData).filter((item) => item && item.id);
    const existingKeys = new Set(blobs.map((blob) => blob.key.replace(IMAGE_PREFIX, "")));
    const missingItems = localItems.filter((item) => !existingKeys.has(item.id));

    if (missingItems.length > 0) {
      console.log(`Seeding Netlify Blobs store with ${missingItems.length} missing items from local store.`);
      await Promise.all(
        missingItems.map(async (item) => store.setJSON(makeKey(item.id), item))
      );
      // Refresh the list
      listed = await store.list({ prefix: IMAGE_PREFIX });
      blobs = listed && Array.isArray(listed.blobs) ? listed.blobs : [];
    }

    const items = await Promise.all(
      blobs.map(async (blob) => store.get(blob.key, { type: "json" }))
    );

    return cleanAndSort(items);
  } catch (error) {
    console.warn("Netlify Blobs is not available, falling back to local file store. Error:", error.message);
    const localData = readLocalStore();
    const items = Object.values(localData).filter((item) => item && item.id);
    return cleanAndSort(items);
  }
}

async function saveImage(item) {
  try {
    if (!shouldCallBlobs()) {
      throw new Error("Local dev environment - bypassing Blobs");
    }
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
    if (!shouldCallBlobs()) {
      throw new Error("Local dev environment - bypassing Blobs");
    }
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
    if (!shouldCallBlobs()) {
      throw new Error("Local dev environment - bypassing Blobs");
    }
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
