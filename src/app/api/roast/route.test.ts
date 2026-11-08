import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { streamText } = vi.hoisted(() => ({
  streamText: vi.fn(),
}));

vi.mock("ai", () => ({ streamText }));
vi.mock("@/lib/ai", () => ({
  getAnthropicModel: () => "mock-model",
}));

import { POST as roastPOST } from "./route";
import { POST as rulesPOST } from "../rules/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/roast", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("roast and rules API fail-closed gates", () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    streamText.mockReset();
    streamText.mockReturnValue({
      toTextStreamResponse: () => new Response("ok", { status: 200 }),
    });
  });

  afterEach(() => {
    if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousKey;
  });

  it("should 500 when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const roast = await roastPOST(jsonRequest({ input: "const x = 1;" }));
    const rules = await rulesPOST(jsonRequest({ input: "const x = 1;" }));
    expect(roast.status).toBe(500);
    expect(rules.status).toBe(500);
    expect(await roast.json()).toEqual({ error: "Missing ANTHROPIC_API_KEY" });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("should 400 on invalid JSON once a key is present", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    const roastBad = new Request("http://localhost/api/roast", {
      method: "POST",
      body: "{",
    });
    const rulesBad = new Request("http://localhost/api/rules", {
      method: "POST",
      body: "{",
    });
    expect((await roastPOST(roastBad)).status).toBe(400);
    expect((await rulesPOST(rulesBad)).status).toBe(400);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("should 400 when both input and files are empty", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    const roast = await roastPOST(jsonRequest({ input: "   ", files: [] }));
    const rules = await rulesPOST(jsonRequest({ input: "", files: null }));
    expect(roast.status).toBe(400);
    expect(rules.status).toBe(400);
    expect(await roast.json()).toEqual({ error: "input or files are required" });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("should clamp roastLevel into 0-100 before building the prompt", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    const res = await roastPOST(jsonRequest({ input: "const n = 1;".repeat(8), roastLevel: 999 }));
    expect(res.status).toBe(200);
    expect(streamText).toHaveBeenCalledTimes(1);
    const arg = streamText.mock.calls[0]?.[0] as { prompt: string };
    expect(arg.prompt).toContain("Roast level slider: 100/100");
    expect(arg.prompt).toContain("Nuclear:");
  });
});
