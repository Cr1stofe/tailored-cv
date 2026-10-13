import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("API BFF authentication forwarding", () => {
  it("forwards cookies and omits Authorization", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{"status":"ok"}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/profile", {
      headers: {
        cookie: "sid=session-value",
        authorization: "Bearer should-not-forward",
      },
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ["profile"] }),
    });

    expect(response.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get("cookie")).toBe("sid=session-value");
    expect(headers.get("authorization")).toBeNull();
    vi.unstubAllGlobals();
  });
});
