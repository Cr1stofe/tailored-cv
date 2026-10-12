import type { NextFunction, Request, Response } from "express";

interface RateLimitRule {
  method: string;
  path: RegExp;
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export const SECURITY_RATE_LIMIT_RULES: readonly RateLimitRule[] = [
  {
    method: "POST",
    path: /^\/auth\/login$/,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  },
  {
    method: "POST",
    path: /^\/job-applications\/[^/]+\/analyze$/,
    limit: 30,
    windowMs: 15 * 60 * 1000,
  },
  {
    method: "POST",
    path: /^\/job-applications\/[^/]+\/tailor$/,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  },
  {
    method: "POST",
    path: /^\/profile\/generate-english$/,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  },
];

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  check(
    key: string,
    limit: number,
    windowMs: number,
    now = Date.now(),
  ): RateLimitResult {
    const current = this.buckets.get(key);
    const bucket =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : current;

    bucket.count += 1;
    this.buckets.set(key, bucket);
    if (this.buckets.size > 1000) this.removeExpired(now);

    return {
      allowed: bucket.count <= limit,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  middleware(rules: readonly RateLimitRule[] = SECURITY_RATE_LIMIT_RULES) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const rule = rules.find(
        (candidate) =>
          candidate.method === req.method && candidate.path.test(req.path),
      );
      if (!rule) return next();

      const clientKey = req.ip || req.socket.remoteAddress || "unknown";
      const result = this.check(
        `${rule.method}:${req.path}:${clientKey}`,
        rule.limit,
        rule.windowMs,
      );
      res.setHeader("X-RateLimit-Limit", rule.limit);
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil((Date.now() + result.retryAfterSec * 1000) / 1000),
      );
      if (result.allowed) return next();

      res.setHeader("Retry-After", result.retryAfterSec);
      res.status(429).json({
        statusCode: 429,
        message: "Muitas solicitações. Tente novamente mais tarde.",
      });
    };
  }

  private removeExpired(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
