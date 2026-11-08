import { afterEach, describe, expect, it, vi } from "vitest";
import { POST, isSkippable, parseGitHubRepo, priority } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/repo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("parseGitHubRepo", () => {
  it.each([
    ["owner/repo", { owner: "owner", repo: "repo" }],
    ["https://github.com/owner/repo", { owner: "owner", repo: "repo" }],
    ["https://github.com/owner/repo.git", { owner: "owner", repo: "repo" }],
    ["git@github.com:owner/repo", { owner: "owner", repo: "repo" }],
    ["git@github.com:owner/repo.git", { owner: "owner", repo: "repo" }],
  ] as const)("should parse %s", (input, expected) => {
    expect(parseGitHubRepo(input)).toEqual(expected);
  });

  it("should reject non-GitHub SSH hosts", () => {
    expect(parseGitHubRepo("git@gitlab.com:owner/repo")).toBeNull();
  });

  it("should reject empty and non-repo strings", () => {
    expect(parseGitHubRepo("")).toBeNull();
    expect(parseGitHubRepo("https://example.com/owner/repo")).toBeNull();
    expect(parseGitHubRepo("not a repo")).toBeNull();
  });
});

describe("isSkippable / priority", () => {
  it("should keep Dockerfiles and .env files as ingest candidates", () => {
    expect(isSkippable("Dockerfile", 100)).toBe(false);
    expect(isSkippable(".env", 100)).toBe(false);
    expect(isSkippable(".env.local", 100)).toBe(false);
    expect(priority("Dockerfile")).toBe(0);
    expect(priority(".env")).toBe(0);
    expect(priority(".env.local")).toBe(0);
  });

  it("should skip vendor trees, lockfiles, and binaries", () => {
    expect(isSkippable("node_modules/left-pad/index.js", 100)).toBe(true);
    expect(isSkippable("package-lock.json", 100)).toBe(true);
    expect(isSkippable("assets/logo.png", 100)).toBe(true);
    expect(isSkippable("src/app.ts", 100)).toBe(false);
  });
});

describe("POST /api/repo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GITHUB_TOKEN;
  });

  it("should reject invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/repo", {
        method: "POST",
        body: "{",
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON" });
  });

  it("should reject an unparseable GitHub URL", async () => {
    const res = await POST(jsonRequest({ url: "https://gitlab.com/acme/app" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/GitHub repo/);
  });

  it("should return 404 copy for a missing or private repo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(404, { message: "Not Found" })),
    );
    const res = await POST(jsonRequest({ url: "owner/secret" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: 'Repo "owner/secret" not found or private.',
    });
  });

  it("should surface a 403 as rate-limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(403, { message: "rate limit" })),
    );
    const res = await POST(jsonRequest({ url: "owner/repo" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/Rate limited/);
  });

  it("should return 422 when the tree has no readable blobs", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://api.github.com/repos/owner/empty") {
        return jsonResponse(200, { default_branch: "main" });
      }
      if (url.includes("/git/trees/")) {
        return jsonResponse(200, {
          tree: [
            { path: "node_modules/x.js", type: "blob", size: 10 },
            { path: "logo.png", type: "blob", size: 10 },
          ],
        });
      }
      return jsonResponse(404, {});
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(jsonRequest({ url: "owner/empty" }));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: "No readable text files found in that repo.",
    });
  });

  it("should ingest .env files and attach a token when GITHUB_TOKEN is set", async () => {
    process.env.GITHUB_TOKEN = "ghp_test_token";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://api.github.com/repos/acme/app") {
        return jsonResponse(200, { default_branch: "main" });
      }
      if (url.includes("/git/trees/")) {
        return jsonResponse(200, {
          tree: [
            { path: ".env", type: "blob", size: 40 },
            { path: "src/index.ts", type: "blob", size: 40 },
            { path: "node_modules/left-pad/index.js", type: "blob", size: 40 },
          ],
        });
      }
      if (url.includes("raw.githubusercontent.com") && url.endsWith("/.env")) {
        return new Response("SECRET=1", { status: 200 });
      }
      if (url.includes("raw.githubusercontent.com") && url.endsWith("/src/index.ts")) {
        return new Response("export const n = 1;", { status: 200 });
      }
      return jsonResponse(404, {});
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(jsonRequest({ url: "acme/app" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      owner: string;
      repo: string;
      files: { path: string; content: string }[];
    };
    expect(body).toMatchObject({ owner: "acme", repo: "app" });
    expect(body.files.map((f) => f.path)).toEqual([".env", "src/index.ts"]);
    expect(body.files[0]?.content).toBe("SECRET=1");

    const metaCall = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = metaCall.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ghp_test_token");
  });
});
