import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter } from "./rate-limit";

describe("InMemoryRateLimiter", () => {
  it("allows requests up to the configured limit and blocks the next one", () => {
    const limiter = new InMemoryRateLimiter();

    expect(limiter.check("client", 2, 60_000, 1_000).allowed).toBe(true);
    expect(limiter.check("client", 2, 60_000, 1_001).allowed).toBe(true);
    expect(limiter.check("client", 2, 60_000, 1_002).allowed).toBe(false);
  });

  it("starts a fresh window after expiration", () => {
    const limiter = new InMemoryRateLimiter();

    expect(limiter.check("client", 1, 1_000, 1_000).allowed).toBe(true);
    expect(limiter.check("client", 1, 1_000, 2_000).allowed).toBe(true);
  });
});
