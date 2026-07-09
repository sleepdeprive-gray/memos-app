const { json, parseJSON } = require("./_lib/http");
const { validateAdminToken } = require("./_lib/auth");
const { getImage, removeImage } = require("./_lib/galleryStore");

exports.handler = async function handler(event) {
  try {
    const { connectLambda } = require("@netlify/blobs");
    connectLambda(event);
  } catch (_err) {
    // Ignore error in local or unlinked environment
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed." });
  }

  const auth = validateAdminToken(event);
  if (!auth.ok) {
    return json(401, { ok: false, error: auth.reason });
  }

  const body = parseJSON(event);
  if (!body || typeof body.id !== "string") {
    return json(400, { ok: false, error: "Missing image id." });
  }

  const id = body.id.trim();
  if (!id) {
    return json(400, { ok: false, error: "Image id is empty." });
  }

  try {
    const image = await getImage(id);
    if (!image) {
      return json(404, { ok: false, error: "Image not found." });
    }

    if (image.deleteUrl) {
      try {
        await fetch(image.deleteUrl, { method: "GET" });
      } catch (err) {
        console.warn("Unable to delete image from ImgBB directly:", err);
      }
    }

    await removeImage(id);

    return json(200, { ok: true, id });
  } catch (error) {
    return json(500, {
      ok: false,
      error: "Unexpected delete error.",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
};
