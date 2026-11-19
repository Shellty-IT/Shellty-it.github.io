const MAX_BODY_CHARS = 16 * 1024;

export class HttpError extends Error {
  constructor(status, code, details = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) throw new HttpError(413, "payload_too_large");
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json");
  }
  if (!isPlainObject(body)) throw new HttpError(400, "invalid_json");
  return body;
}

export function readText(body, field, maxLength, errors) {
  const value = body[field];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    errors[field] = "invalid";
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    errors[field] = "too_long";
    return "";
  }
  return trimmed;
}

export function assertValid(errors) {
  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, "validation_failed", { fields: errors });
  }
}

export function bearerToken(request) {
  const header = request.headers.get("Authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}

export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}
