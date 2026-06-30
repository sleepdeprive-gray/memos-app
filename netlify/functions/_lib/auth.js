const crypto = require("crypto");

const TOKEN_TTL_SECONDS = 60 * 60 * 6;

function base64urlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(encodedPayload, secret) {
  return crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function createToken(payload, secret) {
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token, secret) {
  if (!token || !secret || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, secret);
  if (!timingSafeStringCompare(signature, expectedSignature)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64urlDecode(encodedPayload));
  } catch (_error) {
    return null;
  }

  if (!payload || typeof payload.exp !== "number") {
    return null;
  }

  if (Math.floor(Date.now() / 1000) >= payload.exp) {
    return null;
  }

  return payload;
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function timingSafeStringCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function isPinValid(providedPin) {
  const pinSha = process.env.ADMIN_PIN_SHA256;
  const pinRaw = process.env.ADMIN_PIN;

  if (!providedPin) {
    return false;
  }

  if (pinSha) {
    const providedHash = sha256Hex(providedPin);
    return timingSafeStringCompare(providedHash, String(pinSha).toLowerCase());
  }

  if (pinRaw) {
    return timingSafeStringCompare(providedPin, pinRaw);
  }

  return false;
}

function extractBearerToken(headers = {}) {
  const authorization =
    headers.authorization ||
    headers.Authorization ||
    headers.AUTHORIZATION ||
    "";

  const [scheme, token] = String(authorization).split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function issueAdminToken() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    role: "admin",
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  };

  const token = createToken(payload, secret);
  return {
    token,
    expiresAt: payload.exp
  };
}

function validateAdminToken(event) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return { ok: false, reason: "AUTH_SECRET is not configured." };
  }

  const token = extractBearerToken(event.headers);
  if (!token) {
    return { ok: false, reason: "Missing bearer token." };
  }

  const payload = verifyToken(token, secret);
  if (!payload || payload.role !== "admin") {
    return { ok: false, reason: "Invalid or expired admin session." };
  }

  return { ok: true, payload };
}

module.exports = {
  isPinValid,
  issueAdminToken,
  validateAdminToken
};
