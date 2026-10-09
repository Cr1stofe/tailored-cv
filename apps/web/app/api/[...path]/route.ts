import { NextRequest, NextResponse } from "next/server";

const INTERNAL_API_URL =
  process.env["INTERNAL_API_URL"] || "http://localhost:3001";
const UPSTREAM_TIMEOUT_MS = 30_000;

export const dynamic = "force-dynamic";

async function forwardRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const pathString = path ? path.join("/") : "";
  const queryString = req.nextUrl.search;
  const targetUrl = `${INTERNAL_API_URL}/${pathString}${queryString}`;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const cookie = req.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  const authorization = req.headers.get("authorization");
  if (authorization) {
    headers.set("authorization", authorization);
  }
  const accept = req.headers.get("accept");
  if (accept) headers.set("accept", accept);

  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(req.method)) {
    const rawBody = await req.text();
    if (rawBody) {
      body = rawBody;
    }
  }

  try {
    const signal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal,
    });

    const responseData = await upstreamResponse.text();
    const responseHeaders = new Headers();
    const upstreamContentType =
      upstreamResponse.headers.get("content-type") || "application/json";
    responseHeaders.set("content-type", upstreamContentType);

    const getSetCookie = (
      upstreamResponse.headers as unknown as { getSetCookie?: () => string[] }
    ).getSetCookie?.();
    if (Array.isArray(getSetCookie) && getSetCookie.length > 0) {
      for (const cookieHeader of getSetCookie) {
        responseHeaders.append("set-cookie", cookieHeader);
      }
    } else {
      const setCookie = upstreamResponse.headers.get("set-cookie");
      if (setCookie) {
        responseHeaders.set("set-cookie", setCookie);
      }
    }

    const isNoContent = [204, 205, 304].includes(upstreamResponse.status);
    if (isNoContent) {
      responseHeaders.delete("content-type");
    }

    return new NextResponse(isNoContent ? null : responseData, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno no BFF";
    return NextResponse.json(
      {
        error: {
          code: 502,
          message:
            process.env.NODE_ENV === "production"
              ? "Não foi possível conectar ao serviço interno."
              : `Falha ao conectar com o serviço interno: ${message}`,
        },
      },
      { status: 502 },
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(req, context);
}
