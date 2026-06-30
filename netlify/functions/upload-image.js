const crypto = require("crypto");
const { json, parseJSON } = require("./_lib/http");
const { validateAdminToken } = require("./_lib/auth");
const { saveImage } = require("./_lib/galleryStore");

function sanitizeBase64(base64) {
  return String(base64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "").trim();
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed." });
  }

  const auth = validateAdminToken(event);
  if (!auth.ok) {
    return json(401, { ok: false, error: auth.reason });
  }

  const body = parseJSON(event);
  if (!body) {
    return json(400, { ok: false, error: "Invalid JSON payload." });
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return json(500, { ok: false, error: "IMGBB_API_KEY is not configured." });
  }

  const imageBase64 = sanitizeBase64(body.imageBase64 || "");
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "memory";

  if (!imageBase64) {
    return json(400, { ok: false, error: "Missing image base64 payload." });
  }

  const encodedParams = new URLSearchParams({
    key: apiKey,
    image: imageBase64,
    name: name || "memory"
  });

  try {
    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: encodedParams
    });

    const result = await response.json();
    if (!response.ok || !result || !result.success || !result.data) {
      return json(502, {
        ok: false,
        error: "Upload to ImgBB failed.",
        detail: result && result.error ? result.error.message : "Unknown ImgBB error"
      });
    }

    const data = result.data;
    const createdAt = new Date().toISOString();

    const item = {
      id: crypto.randomUUID(),
      source: "user",
      title: name || data.title || "Memory",
      url: data.display_url || data.url,
      thumbUrl: data.thumb && data.thumb.url ? data.thumb.url : data.display_url || data.url,
      width: Number(data.width) || null,
      height: Number(data.height) || null,
      imgbbId: data.id || null,
      deleteUrl: data.delete_url || null,
      createdAt
    };

    await saveImage(item);

    return json(200, {
      ok: true,
      image: item
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: "Unexpected upload error.",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
};
