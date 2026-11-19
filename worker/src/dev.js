import { isDevMode } from "./config.js";
import { secretsEqual } from "./crypto.js";
import { HttpError, bearerToken } from "./http.js";

export async function requireDevAccess(request, env) {
  if (!isDevMode(env)) throw new HttpError(404, "not_found");
  const expected = env.DEV_LEADS_TOKEN;
  const provided = bearerToken(request);
  if (!expected || !provided || !(await secretsEqual(provided, expected))) {
    throw new HttpError(401, "unauthorized");
  }
}
