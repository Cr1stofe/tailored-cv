import { ExecutionContext } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthGuard } from "./auth.guard";
import { SessionService } from "../../auth/services/session.service";

function createContext(options: {
  cookies?: Record<string, string>;
  authorization?: string;
  isPublic?: boolean;
}) {
  const request = {
    cookies: options.cookies,
    headers: options.authorization
      ? { authorization: options.authorization }
      : {},
  };
  const response = { cookie: vi.fn() };
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(options.isPublic ?? false),
  };

  const context = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;

  return { context, reflector, request, response };
}

function createGuard(validate: SessionService["validate"]) {
  return new AuthGuard(
    { getAllAndOverride: vi.fn() } as never,
    { validate } as SessionService,
  );
}

describe("AuthGuard", () => {
  it("accepts the development sid cookie", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("COOKIE_SECURE", "false");
    const validate = vi.fn().mockResolvedValue({ valid: true, session: {} });
    const guard = createGuard(validate);
    const { context } = createContext({ cookies: { sid: "dev-session" } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(validate).toHaveBeenCalledWith("dev-session");
    vi.unstubAllEnvs();
  });

  it("accepts the production __Secure-sid cookie", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const validate = vi.fn().mockResolvedValue({ valid: true, session: {} });
    const guard = createGuard(validate);
    const { context } = createContext({
      cookies: { "__Secure-sid": "production-session" },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(validate).toHaveBeenCalledWith("production-session");
    vi.unstubAllEnvs();
  });

  it("rejects bearer-only requests", async () => {
    const validate = vi.fn();
    const guard = createGuard(validate);
    const { context } = createContext({
      authorization: "Bearer opaque-session",
    });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401,
    });
    expect(validate).not.toHaveBeenCalled();
  });

  it("allows public routes without a session", async () => {
    const validate = vi.fn();
    const guard = createGuard(validate);
    const { context, reflector } = createContext({ isPublic: true });
    (guard as unknown as { reflector: typeof reflector }).reflector = reflector;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(validate).not.toHaveBeenCalled();
  });

  it("refreshes a valid session cookie when maxAgeSec is returned", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("COOKIE_SECURE", "false");
    const validate = vi.fn().mockResolvedValue({
      valid: true,
      maxAgeSec: 900,
      session: {
        user_id: 1,
        name: "User",
        username: "user",
        email: "user@example.com",
        expires_ms: Date.now() + 900_000,
      },
    });
    const guard = createGuard(validate);
    const { context, response } = createContext({
      cookies: { sid: "refreshable-session" },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(response.cookie).toHaveBeenCalledWith(
      "sid",
      "refreshable-session",
      expect.objectContaining({ maxAge: 900_000, httpOnly: true }),
    );
    vi.unstubAllEnvs();
  });
});
