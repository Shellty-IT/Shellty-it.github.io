import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";
const TURNSTILE_TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const FAKE_AI_HOSTS = ["groq.test", "gemini.test"];

async function fakeSiteverify(request) {
  const form = await request.formData();
  const success =
    form.get("secret") === TURNSTILE_TEST_SECRET && form.get("response") === TURNSTILE_TEST_TOKEN;
  return Response.json({ success });
}

function fakeCompletion(request) {
  const provider = new URL(request.url).hostname.split(".")[0];
  const content = JSON.stringify({
    reply: `Odpowiedź z ${provider}. Czym zajmuje się Twoja firma?`,
    quickReplies: ["Gastronomia", "Usługi lokalne"],
    signals: { service: "website" },
    action: "none",
  });
  return Response.json({ choices: [{ message: { content } }] });
}

function fakeOutbound(request) {
  const { hostname } = new URL(request.url);
  if (hostname === "challenges.cloudflare.com") return fakeSiteverify(request);
  if (FAKE_AI_HOSTS.includes(hostname)) return fakeCompletion(request);
  return new Response("Unexpected outbound request", { status: 500 });
}

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
          DEV_MODE: "true",
          TURNSTILE_SECRET: TURNSTILE_TEST_SECRET,
          SESSION_SIGNING_KEY: "test-signing-key",
          DEV_LEADS_TOKEN: "test-leads-token",
          RATE_LIMIT_PER_SESSION: "5",
          LEAD_LIMIT_PER_SESSION: "5",
          RATE_LIMIT_PER_IP_PER_DAY: "10",
          CHAT_LIMIT_PER_SESSION: "2",
          EVENT_LIMIT_PER_SESSION: "4",
          GROQ_API_KEY: "test-groq-key",
          GROQ_BASE_URL: "https://groq.test/v1",
          GEMINI_API_KEY: "test-gemini-key",
          GEMINI_BASE_URL: "https://gemini.test/v1",
        },
        outboundService: fakeOutbound,
      },
    }),
  ],
  test: {
    setupFiles: ["./test/applyMigrations.js"],
  },
}));
