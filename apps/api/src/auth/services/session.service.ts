import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { generateToken, sha256 } from "../../common/security/tokens";

export const COOKIE_SID_KEY = "__Secure-sid";
export const SESSION_TTL_SEC = 60 * 60 * 24 * 15;
const SESSION_REFRESH_THRESHOLD_SEC = 60 * 60 * 24 * 5;

export interface SessionData {
  user_id: number;
  name: string;
  username: string;
  email: string;
  expires_ms: number;
}

function isSecureCookie(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true"
  );
}

export function getActiveCookieName(): string {
  return isSecureCookie() ? COOKIE_SID_KEY : "sid";
}

export function setSessionCookie(
  res: Response,
  sid: string,
  maxAgeSec: number,
) {
  const cookieName = getActiveCookieName();
  res.cookie(cookieName, sid, {
    maxAge: maxAgeSec * 1000,
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  const cookieName = getActiveCookieName();
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
  });
  if (cookieName !== COOKIE_SID_KEY) {
    res.clearCookie(COOKIE_SID_KEY, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  }
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create({
    userId,
    ip,
    ua,
  }: {
    userId: number;
    ip: string;
    ua: string;
  }): Promise<{ sid: string; maxAgeSec: number }> {
    const sid = await generateToken(32);
    const sidHash = new Uint8Array(sha256(sid));
    const expiresDate = new Date(Date.now() + SESSION_TTL_SEC * 1000);

    await this.prisma.session.create({
      data: {
        sidHash,
        userId,
        expires: expiresDate,
        ip,
        ua,
      },
    });

    return { sid, maxAgeSec: SESSION_TTL_SEC };
  }

  async validate(sid: string): Promise<{
    valid: boolean;
    sid?: string;
    maxAgeSec?: number;
    session?: SessionData;
  }> {
    const now = new Date();
    const sidHash = new Uint8Array(sha256(sid));

    const session = await this.prisma.session.findUnique({
      where: { sidHash },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!session || session.revoked || !session.user) {
      return { valid: false };
    }

    let expiresDate = session.expires;

    if (now >= expiresDate) {
      await this.prisma.session.update({
        where: { sidHash },
        data: { revoked: true },
      });
      return { valid: false };
    }

    if (
      now.getTime() >=
      expiresDate.getTime() - SESSION_REFRESH_THRESHOLD_SEC * 1000
    ) {
      const newExpires = new Date(Date.now() + SESSION_TTL_SEC * 1000);
      await this.prisma.session.update({
        where: { sidHash },
        data: { expires: newExpires },
      });
      expiresDate = newExpires;
    }

    return {
      valid: true,
      sid,
      maxAgeSec: Math.floor((expiresDate.getTime() - now.getTime()) / 1000),
      session: {
        user_id: session.userId,
        name: session.user.name,
        username: session.user.username,
        email: session.user.email,
        expires_ms: expiresDate.getTime(),
      },
    };
  }

  async invalidate(sid: string | undefined): Promise<void> {
    if (sid) {
      try {
        const sidHash = new Uint8Array(sha256(sid));
        await this.prisma.session.update({
          where: { sidHash },
          data: { revoked: true },
        });
      } catch (error) {
        void error;
      }
    }
  }

  async invalidateAll(userId: number): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }
}
