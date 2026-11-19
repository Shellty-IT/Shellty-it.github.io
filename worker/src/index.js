import { handleChat } from "./chat.js";
import { allowedOrigins } from "./config.js";
import { handleEvent } from "./event.js";
import { HttpError, json } from "./http.js";
import { handleLead, handleLeadNote, handleListLeads } from "./lead.js";
import { deliverLeadNotifications } from "./leadNotifications.js";
import { handleLeadSession, handleSession } from "./session.js";
import { handleStats } from "./stats.js";

const routes = {
  "GET /health": () => json({ ok: true }),
  "POST /session": handleSession,
  "POST /lead/session": handleLeadSession,
  "POST /lead": handleLead,
  "POST /lead/note": handleLeadNote,
  "POST /chat": handleChat,
  "POST /event": handleEvent,
  "GET /leads": handleListLeads,
  "GET /stats": handleStats,
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

async function route(request, env) {
  const { pathname } = new URL(request.url);
  const handler = routes[`${request.method} ${pathname}`];
  if (!handler) return json({ error: "not_found" }, 404);
  try {
    return await handler(request, env);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.code, ...error.details }, error.status);
    console.error("Unhandled error:", error);
    return json({ error: "internal_error" }, 500);
  }
}

export default {
  scheduled(_controller, env) {
    return deliverLeadNotifications(env);
  },

  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (origin !== null && !allowedOrigins(env).includes(origin)) {
      return json({ error: "origin_not_allowed" }, 403);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: origin ? corsHeaders(origin) : {} });
    }

    const response = await route(request, env);
    if (origin) {
      for (const [name, value] of Object.entries(corsHeaders(origin))) {
        response.headers.set(name, value);
      }
    }
    return response;
  },
};
