const { json, parseJSON } = require("./_lib/http");
const { isPinValid, issueAdminToken } = require("./_lib/auth");

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed." });
  }

  const body = parseJSON(event);
  if (!body) {
    return json(400, { ok: false, error: "Invalid JSON payload." });
  }

  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  if (!isPinValid(pin)) {
    return json(401, { ok: false, error: "Invalid PIN." });
  }

  const session = issueAdminToken();
  if (!session) {
    return json(500, { ok: false, error: "Server auth secret is not configured." });
  }

  return json(200, {
    ok: true,
    token: session.token,
    expiresAt: session.expiresAt
  });
};
