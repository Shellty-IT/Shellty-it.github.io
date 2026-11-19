import { describe, expect, it } from "vitest";
import { HttpError } from "../src/http.js";
import { normalizePolishPhone, scoreLead, validateLead } from "../src/lead.js";

const validLead = {
  name: "Jan",
  phone: "512 345 678",
  consent: true,
  consentText: "Wyrażam zgodę na kontakt w sprawie mojego zgłoszenia.",
  source: "qualifier",
  lang: "pl",
  page: "/",
  answers: { service: "website", timeline: "asap" },
};

function validationErrors(body) {
  try {
    validateLead(body);
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    return error.details.fields;
  }
  throw new Error("Expected validation to fail");
}

describe("normalizePolishPhone", () => {
  it.each([
    ["512345678", "+48512345678"],
    ["512 345 678", "+48512345678"],
    ["512-345-678", "+48512345678"],
    ["+48 512 345 678", "+48512345678"],
    ["0048512345678", "+48512345678"],
    ["(91) 123 45 67", "+48911234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePolishPhone(input)).toBe(expected);
  });

  it.each(["12345678", "5123456789", "012345678", "+49512345678", "512abc678", "+48"])(
    "rejects %s",
    (input) => {
      expect(normalizePolishPhone(input)).toBeNull();
    },
  );
});

describe("validateLead", () => {
  it("accepts a lead with phone only and normalizes it", () => {
    const lead = validateLead(validLead);
    expect(lead).toMatchObject({ name: "Jan", phone: "+48512345678", email: null, lang: "pl" });
  });

  it("accepts a lead with email only and defaults language to Polish", () => {
    const { phone, lang, ...rest } = validLead;
    const lead = validateLead({ ...rest, email: "jan@example.com" });
    expect(lead).toMatchObject({ phone: null, email: "jan@example.com", lang: "pl" });
  });

  it("accepts a lead without a name", () => {
    expect(validateLead({ ...validLead, name: "   " })).toMatchObject({ name: "" });
  });

  it("requires a phone or an email", () => {
    const { phone, ...rest } = validLead;
    expect(validationErrors(rest)).toEqual({ contact: "required" });
  });

  it("rejects an invalid phone and an invalid email", () => {
    expect(validationErrors({ ...validLead, phone: "123", email: "jan@" })).toEqual({
      phone: "invalid",
      email: "invalid",
    });
  });

  it("requires the consent text shown to the visitor", () => {
    expect(validationErrors({ ...validLead, consentText: "  " })).toEqual({ consentText: "required" });
    expect(validationErrors({ ...validLead, consentText: "x".repeat(601) })).toEqual({ consentText: "too_long" });
  });

  it("requires explicit consent", () => {
    expect(validationErrors({ ...validLead, consent: "yes" })).toEqual({ consent: "required" });
    expect(validationErrors({ ...validLead, consent: undefined })).toEqual({ consent: "required" });
  });

  it("enforces length limits", () => {
    expect(
      validationErrors({ ...validLead, name: "a".repeat(61), chatSummary: "b".repeat(2001) }),
    ).toEqual({ name: "too_long", chatSummary: "too_long" });
  });

  it("rejects unknown source, language and non-text fields", () => {
    expect(validationErrors({ ...validLead, source: "form", lang: "de", page: 42 })).toEqual({
      source: "invalid",
      lang: "invalid",
      page: "invalid",
    });
  });

  it.each([
    ["an array", ["website"]],
    ["an unknown timeline", { timeline: "someday" }],
    ["an unknown service", { service: "logo" }],
    ["a nested object", { extra: { deep: true } }],
    ["too long text", { note: "x".repeat(501) }],
  ])("rejects answers with %s", (_label, answers) => {
    expect(validationErrors({ ...validLead, answers })).toEqual({ answers: "invalid" });
  });
});

describe("scoreLead", () => {
  it.each([
    ["IT emergency even without a timeline", { service: "emergency" }, "+48512345678", "hot"],
    ["IT emergency with email only", { service: "emergency" }, null, "hot"],
    ["asap with phone", { timeline: "asap" }, "+48512345678", "hot"],
    ["within a month with phone", { timeline: "month" }, "+48512345678", "hot"],
    ["asap with email only", { timeline: "asap" }, null, "warm"],
    ["1-3 months with phone", { timeline: "quarter" }, "+48512345678", "warm"],
    ["mini audit request", { timeline: "quarter", audit: true }, null, "warm"],
    ["chat lead without a timeline", {}, "+48512345678", "warm"],
    ["just browsing", { timeline: "browsing" }, null, "cold"],
    ["just browsing with phone", { timeline: "browsing" }, "+48512345678", "cold"],
  ])("%s", (_label, answers, phone, expected) => {
    expect(scoreLead({ answers, phone })).toBe(expected);
  });
});
