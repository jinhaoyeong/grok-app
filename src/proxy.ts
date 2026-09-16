import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  hasInternalBypassHeader,
  hasValidSession,
  isPublicApi,
  normalizePath,
} from "@/lib/access-session";

const NO_STORE = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Vary: "Cookie, Origin",
} as const;

function blocked(status: number) {
  return NextResponse.json(
    { error: "Couldn't do that right now." },
    { status, headers: NO_STORE },
  );
}

function passthrough() {
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(NO_STORE)) {
    response.headers.set(key, value);
  }
  return response;
}

export function proxy(request: NextRequest) {
  const path = normalizePath(request.nextUrl.pathname);
  if (path !== "/api" && !path.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (hasInternalBypassHeader(request)) {
    return blocked(400);
  }

  if (isPublicApi(request.method, path)) {
    return passthrough();
  }

  if (hasValidSession(request)) {
    return passthrough();
  }

  return blocked(401);
}

export const config = {
  matcher: ["/api", "/api/:path*"],
};
