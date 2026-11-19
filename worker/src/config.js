export function positiveInt(env, name) {
  const value = Number(env[name]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export function requiredSecret(env, name) {
  const value = env[name];
  if (typeof value !== "string" || value === "") {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isDevMode(env) {
  return env.DEV_MODE === "true";
}
