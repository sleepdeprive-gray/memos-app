const { getStore } = require("@netlify/blobs");

const STORE_NAME = "gallery";
const IMAGE_PREFIX = "image:";

function getGalleryStore() {
  return getStore(STORE_NAME);
}

function makeKey(id) {
  return `${IMAGE_PREFIX}${id}`;
}

async function listImages() {
  const store = getGalleryStore();
  const listed = await store.list({ prefix: IMAGE_PREFIX });
  const blobs = listed && Array.isArray(listed.blobs) ? listed.blobs : [];

  const items = await Promise.all(
    blobs.map(async (blob) => store.get(blob.key, { type: "json" }))
  );

  return items
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function saveImage(item) {
  const store = getGalleryStore();
  await store.setJSON(makeKey(item.id), item);
  return item;
}

async function getImage(id) {
  const store = getGalleryStore();
  return store.get(makeKey(id), { type: "json" });
}

async function removeImage(id) {
  const store = getGalleryStore();
  await store.delete(makeKey(id));
}

module.exports = {
  listImages,
  saveImage,
  getImage,
  removeImage
};
