const { json } = require("./_lib/http");
const { listImages } = require("./_lib/galleryStore");

exports.handler = async function handler(event) {
  if (event.httpMethod !== "GET") {
    return json(405, { ok: false, error: "Method not allowed." });
  }

  try {
    const images = await listImages();
    return json(200, {
      ok: true,
      images
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: "Unable to load gallery.",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
};
