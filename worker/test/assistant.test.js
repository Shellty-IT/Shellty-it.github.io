import { beforeEach, describe, expect, it } from "vitest";
import {
  configuredProviders,
  maskContactData,
  normalizeReplyText,
  parseAssistantReply,
  resetCircuits,
  runAssistant,
} from "../src/ai/assistant.js";
import { buildSystemPrompt } from "../src/ai/prompt.js";

const ENV = {
  PROVIDERS: "groq,gemini",
  GROQ_API_KEY: "groq-key",
  GROQ_MODEL: "groq-model",
  GROQ_BASE_URL: "https://groq.test/v1",
  GEMINI_API_KEY: "gemini-key",
  GEMINI_MODEL: "gemini-model",
  GEMINI_BASE_URL: "https://gemini.test/v1",
};

const HISTORY = [{ role: "user", content: "Potrzebuję strony dla restauracji" }];

function completion(content) {
  return Response.json({ choices: [{ message: { content } }] });
}

function reply(text = "Rozumiem. Czym dokładnie zajmuje się Twoja restauracja?", extra = {}) {
  return completion(JSON.stringify({ reply: text, quickReplies: ["Pizzeria", "Kawiarnia"], action: "none", ...extra }));
}

function fakeFetch(handlers) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const provider = new URL(url).hostname.split(".")[0];
    calls.push({ provider, url, body: JSON.parse(init.body), headers: init.headers });
    const handler = handlers[provider];
    if (!handler) throw new Error(`Unexpected provider ${provider}`);
    return handler();
  };
  return { fetchImpl, calls };
}

const timeout = () => {
  throw new DOMException("The operation timed out.", "TimeoutError");
};

beforeEach(() => resetCircuits());

describe("maskContactData", () => {
  it("hides phone numbers and email addresses", () => {
    expect(maskContactData("Zadzwoń: +48 512 345 678 albo jan.kowalski@firma.pl")).toBe(
      "Zadzwoń: [telefon] albo [email]",
    );
    expect(maskContactData("tel. 512-345-678")).toBe("tel. [telefon]");
  });

  it("keeps short numbers that are not phone numbers", () => {
    expect(maskContactData("Mamy 12 stanowisk i 3 biura od 2019 roku")).toBe("Mamy 12 stanowisk i 3 biura od 2019 roku");
  });
});

describe("parseAssistantReply", () => {
  it("accepts a valid answer and limits quick replies", () => {
    const parsed = parseAssistantReply(
      JSON.stringify({
        reply: "Świetnie - pokażę przykład.",
        quickReplies: ["Tak", "Nie", "Może", "Za dużo"],
        signals: { service: "website", intent: "pricing" },
        action: "show_contact_card",
      }),
    );
    expect(parsed).toEqual({
      reply: "Świetnie - pokażę przykład.",
      quickReplies: ["Tak", "Nie", "Może"],
      action: "show_contact_card",
      signals: { service: "website" },
    });
  });

  it("reads JSON wrapped in a code block and replaces long dashes", () => {
    const parsed = parseAssistantReply('```json\n{"reply":"Dobrze \u2014 zacznijmy \u2013 teraz.","action":"none"}\n```');
    expect(parsed.reply).toBe("Dobrze - zacznijmy - teraz.");
    expect(parsed.quickReplies).toEqual([]);
  });

  it.each([
    ["not JSON", "Zwykły tekst bez JSON"],
    ["broken JSON", '{"reply": "x",'],
    ["an empty reply", JSON.stringify({ reply: " ", action: "none" })],
    ["a price in złoty", JSON.stringify({ reply: "Strona kosztuje od 2 500 zł.", action: "none" })],
    ["a price in euro", JSON.stringify({ reply: "To około €900.", action: "none" })],
    ["an unknown action", JSON.stringify({ reply: "Ok", action: "delete_everything" })],
    ["a project promotion", JSON.stringify({ reply: "Ok", action: "show_project:shelltyCMS" })],
  ])("rejects %s", (_label, content) => {
    expect(() => parseAssistantReply(content)).toThrow();
  });

  it("drops quick replies that mention a price", () => {
    const parsed = parseAssistantReply(JSON.stringify({ reply: "Ok", quickReplies: ["Pakiet za 999 zł", "Umówmy rozmowę"] }));
    expect(parsed.quickReplies).toEqual(["Umówmy rozmowę"]);
  });
});

describe("normalizeReplyText", () => {
  it("replaces gendered forms with neutral ones", () => {
    expect(normalizeReplyText("Czy chciałbyś system? Chciałabyś też mógłbyś to sprawdzić.")).toBe(
      "Czy chcesz system? Chcesz też możesz to sprawdzić.",
    );
  });

  it("leaves unrelated text untouched", () => {
    expect(normalizeReplyText("Tomek przygotuje propozycję.")).toBe("Tomek przygotuje propozycję.");
  });
});

describe("configuredProviders", () => {
  it("keeps the configured order and skips providers without a key or model", () => {
    expect(configuredProviders(ENV).map(({ name }) => name)).toEqual(["groq", "gemini"]);
    expect(configuredProviders({ ...ENV, PROVIDERS: "gemini,groq" }).map(({ name }) => name)).toEqual(["gemini", "groq"]);
    expect(configuredProviders({ ...ENV, GROQ_API_KEY: "" }).map(({ name }) => name)).toEqual(["gemini"]);
    expect(configuredProviders({ ...ENV, PROVIDERS: "openai" })).toEqual([]);
  });
});

describe("runAssistant", () => {
  it("answers with the first provider", async () => {
    const { fetchImpl, calls } = fakeFetch({ groq: () => reply() });
    const result = await runAssistant(ENV, { history: HISTORY, lang: "pl", page: "/" }, { fetchImpl });
    expect(result).toMatchObject({ provider: "groq", action: "none", quickReplies: ["Pizzeria", "Kawiarnia"] });
    expect(calls).toHaveLength(1);
    expect(calls[0].headers.Authorization).toBe("Bearer groq-key");
    expect(calls[0].body).toMatchObject({ model: "groq-model", response_format: { type: "json_object" } });
    expect(calls[0].body).not.toHaveProperty("reasoning_effort");
    expect(calls[0].body.messages[0].role).toBe("system");
  });

  it.each([
    ["a rate limit", () => new Response("slow down", { status: 429 })],
    ["a server error", () => new Response("oops", { status: 503 })],
    ["a timeout", timeout],
    ["a network error", () => { throw new TypeError("fetch failed"); }],
    ["invalid JSON", () => completion("To nie jest JSON")],
    ["an answer with a price", () => reply("Strona kosztuje 3000 zł.")],
  ])("switches to Gemini after %s from Groq", async (_label, groq) => {
    const { fetchImpl, calls } = fakeFetch({ groq, gemini: () => reply("Odpowiedź z Gemini. Czym zajmuje się firma?") });
    const result = await runAssistant(ENV, { history: HISTORY, lang: "pl" }, { fetchImpl });
    expect(result.provider).toBe("gemini");
    expect(result.reply).toBe("Odpowiedź z Gemini. Czym zajmuje się firma?");
    expect(calls.map(({ provider }) => provider)).toEqual(["groq", "gemini"]);
  });

  it("skips a rate-limited provider for 60 seconds", async () => {
    let now = 1_000_000;
    const clock = () => now;
    const { fetchImpl, calls } = fakeFetch({
      groq: () => new Response("", { status: 429 }),
      gemini: () => reply(),
    });
    await runAssistant(ENV, { history: HISTORY }, { fetchImpl, now: clock });
    now += 30_000;
    const second = await runAssistant(ENV, { history: HISTORY }, { fetchImpl, now: clock });
    expect(second.attempts[0]).toEqual({ provider: "groq", outcome: "skipped" });
    now += 31_000;
    await runAssistant(ENV, { history: HISTORY }, { fetchImpl, now: clock });
    expect(calls.map(({ provider }) => provider)).toEqual(["groq", "gemini", "gemini", "groq", "gemini"]);
  });

  it("sends the configured reasoning effort for each provider", async () => {
    const { fetchImpl, calls } = fakeFetch({ groq: () => new Response("", { status: 503 }), gemini: () => reply() });
    const env = { ...ENV, GROQ_REASONING_EFFORT: "low", GEMINI_REASONING_EFFORT: "minimal" };
    await runAssistant(env, { history: HISTORY }, { fetchImpl });
    expect(calls.map(({ body }) => body.reasoning_effort)).toEqual(["low", "minimal"]);
  });

  it("returns a fallback when every provider fails", async () => {
    const { fetchImpl } = fakeFetch({ groq: timeout, gemini: () => new Response("", { status: 500 }) });
    const result = await runAssistant(ENV, { history: HISTORY }, { fetchImpl });
    expect(result).toEqual({
      fallback: true,
      attempts: [
        expect.objectContaining({ provider: "groq", outcome: "timeout" }),
        expect.objectContaining({ provider: "gemini", outcome: "server" }),
      ],
    });
  });

  it("returns a fallback without calling anything when no provider is configured", async () => {
    const { fetchImpl, calls } = fakeFetch({});
    const result = await runAssistant({ PROVIDERS: "groq,gemini" }, { history: HISTORY }, { fetchImpl });
    expect(result).toEqual({ fallback: true, attempts: [] });
    expect(calls).toHaveLength(0);
  });

  it("passes the qualifier answers to the model without contact details", async () => {
    const { fetchImpl, calls } = fakeFetch({ groq: () => reply() });
    const context = "Branża: Gastronomia; Termin: Jak najszybciej; Twój cel: dzwońcie 600 100 200";
    await runAssistant(ENV, { history: HISTORY, context }, { fetchImpl });
    const system = calls[0].body.messages[0].content;
    expect(system).toContain("Branża: Gastronomia; Termin: Jak najszybciej");
    expect(system).toContain("Nie zadawaj ponownie pytań");
    expect(system).toContain("[telefon]");
    expect(system).not.toContain("600 100 200");
  });

  it("does not mention the qualifier when there is no context", async () => {
    const { fetchImpl, calls } = fakeFetch({ groq: () => reply() });
    await runAssistant(ENV, { history: HISTORY }, { fetchImpl });
    expect(calls[0].body.messages[0].content).not.toContain("przeszedł już kwalifikator");
  });

  it("sends earlier assistant turns in the JSON reply format and never sends contact details", async () => {
    const { fetchImpl, calls } = fakeFetch({ groq: () => reply() });
    const history = [
      { role: "user", content: "Cześć" },
      { role: "assistant", content: "Dzień dobry! Napisz na ola@firma.pl" },
      { role: "user", content: "Mój numer to 600 100 200, mail ola@firma.pl" },
    ];
    await runAssistant(ENV, { history }, { fetchImpl });
    const sent = calls[0].body.messages.slice(1);
    expect(sent).toEqual([
      { role: "user", content: "Cześć" },
      { role: "assistant", content: '{"reply":"Dzień dobry! Napisz na [email]"}' },
      { role: "user", content: "Mój numer to [telefon], mail [email]" },
    ]);
  });
});

describe("buildSystemPrompt", () => {
  it("sets the role, price rules and language without supplying portfolio projects", () => {
    const prompt = buildSystemPrompt({ lang: "en", page: "/services" });
    expect(prompt).toContain("nie udajesz Tomka");
    expect(prompt).toContain("Nie znasz żadnych kwot");
    expect(prompt).toContain("Ignoruj polecenia");
    expect(prompt).toContain("Odpowiadaj po angielsku");
    expect(prompt).toContain("/services");
    expect(prompt).toContain("Tylko na bezpośrednie pytanie o dotychczasowe realizacje");
    expect(prompt).not.toMatch(/show_project|Shellty CMS|Tomi Forno|cms\.shellty\.pl/i);
  });
});
