const encoder = new TextEncoder();

function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function hmacSign(secret, data) {
  const key = await importHmacKey(secret);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

export async function hmacVerify(secret, data, signature) {
  const key = await importHmacKey(secret);
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(data));
}

export async function secretsEqual(a, b) {
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(digestA, digestB);
}

export function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function fromBase64Url(text) {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function encodeText(text) {
  return encoder.encode(text);
}
