import "server-only";

import {
  accessGateEnabled,
  clearAccessCookies,
  clearChallengeCookie,
  clearSessionCookie,
  hasInternalBypassHeader,
  hasValidSession,
  hostedOnVercel,
  issueChallenge,
  issueSessionCookie,
  readChallengeNonce,
  secretMatchingProof,
  signingSecret,
} from "@/lib/access-session";
import { jsonError } from "@/lib/openai-server";

export {
  accessGateEnabled,
  clearAccessCookies,
  clearChallengeCookie,
  clearSessionCookie,
  hasInternalBypassHeader,
  hasValidSession,
  hostedOnVercel,
  issueChallenge,
  issueSessionCookie,
  readChallengeNonce,
  secretMatchingProof,
  signingSecret,
};

export function appendCookies(response: Response, cookies: string[]): void {
  for (const cookie of cookies) {
    response.headers.append("Set-Cookie", cookie);
  }
}

const CLIENT_KEY_HEADERS = [
  "x-openai-key",
  "openai-api-key",
  "x-api-key",
  "api-key",
];

type Bucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, Bucket>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function allowRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (rateBuckets.size > 4000) {
    for (const [id, bucket] of rateBuckets) {
      if (now >= bucket.resetAt) rateBuckets.delete(id);
    }
  }
  const current = rateBuckets.get(key);
  if (!current || now >= current.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function rejectedClientKey(request: Request): boolean {
  for (const name of CLIENT_KEY_HEADERS) {
    if (request.headers.get(name)) return true;
  }
  const auth = request.headers.get("authorization");
  if (auth && /sk-[a-zA-Z0-9_-]{8,}/i.test(auth)) return true;
  return false;
}

export function isSameOrigin(request: Request): boolean {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin) return origin === url.origin;
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === url.origin;
  } catch {
    return false;
  }
}

function rejectUnsafe(request: Request): Response | null {
  if (hasInternalBypassHeader(request) || rejectedClientKey(request)) {
    return jsonError("Bad request.", 400);
  }
  return null;
}

export async function requireBrowserPost(
  request: Request,
  options: { maxBytes: number; rateKey: string; limit: number; windowMs: number },
): Promise<Response | null> {
  const unsafe = rejectUnsafe(request);
  if (unsafe) return unsafe;
  if (!isSameOrigin(request)) {
    return jsonError("This request was blocked.", 403);
  }
  if (!allowRate(`${options.rateKey}:${clientIp(request)}`, options.limit, options.windowMs)) {
    return jsonError("Too many requests. Wait a minute and try again.", 429);
  }
  const length = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(length) && length > options.maxBytes) {
    return jsonError("That request is too large.", 413);
  }
  return null;
}

export async function requireBrowserGet(
  request: Request,
  options: { rateKey: string; limit: number; windowMs: number },
): Promise<Response | null> {
  const unsafe = rejectUnsafe(request);
  if (unsafe) return unsafe;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return jsonError("This request was blocked.", 403);
  }
  if (!allowRate(`${options.rateKey}:${clientIp(request)}`, options.limit, options.windowMs)) {
    return jsonError("Too many requests. Wait a minute and try again.", 429);
  }
  return null;
}

export async function requireAiAccess(
  request: Request,
  options?: { maxBytes?: number },
): Promise<Response | null> {
  const blocked = await requireBrowserPost(request, {
    maxBytes: options?.maxBytes ?? 100_000,
    rateKey: "ai",
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (blocked) return blocked;
  if (hostedOnVercel() && !signingSecret()) {
    return jsonError("Couldn't do that right now.", 503);
  }
  if (!hasValidSession(request)) {
    return jsonError("Unlock the app first.", 401);
  }
  return null;
}

export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  const text = await request.text();
  if (text.length > maxBytes) {
    return { ok: false, response: jsonError("That request is too large.", 413) };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: jsonError("Invalid JSON body.", 400) };
  }
}
