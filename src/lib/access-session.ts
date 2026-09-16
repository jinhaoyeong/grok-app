import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { envString, hostedOnVercel } from "@/lib/runtime-env";

const SESSION_COOKIE = "sorted_access";
const HOST_SESSION_COOKIE = "__Host-sorted";
const CHALLENGE_COOKIE = "sorted_nonce";
const HOST_CHALLENGE_COOKIE = "__Host-sorted-n";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const PUBLIC_API: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/api/status" },
  { method: "HEAD", path: "/api/status" },
  { method: "GET", path: "/api/unlock/challenge" },
  { method: "POST", path: "/api/unlock" },
  { method: "POST", path: "/api/lock" },
];

const BYPASS_HEADERS = new Set([
  "x-middleware-subrequest",
  "x-middleware-subrequest-id",
  "x-middleware-invoke",
]);

export function signingSecret(): string | null {
  const secret = envString("APP_ACCESS_SECRET")?.trim() || null;
  if (!secret) return null;
  if (hostedOnVercel() && secret.length < 12) return null;
  return secret;
}

function approvedCodes(): string[] {
  const raw = envString("APPROVED_ACCESS_CODES") ?? "";
  return raw
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 12);
}

function acceptedSecrets(): string[] {
  const owner = signingSecret();
  if (!owner) return [];
  return [owner, ...approvedCodes().filter((code) => code !== owner)];
}

export function accessGateEnabled(): boolean {
  return Boolean(signingSecret());
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function sha256Hex(value: string): string {
  return sha256(value).toString("hex");
}

function hmacHex(key: string, value: string): string {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const a = sha256(left);
  const b = sha256(right);
  return timingSafeEqual(a, b);
}

function fingerprint(secret: string): string {
  return sha256Hex(secret).slice(0, 32);
}

function cookiePair(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function readCookie(request: Request, names: string[]): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const name of names) {
    const value = cookiePair(raw, name);
    if (value) return value;
  }
  return null;
}

function isHttps(request: Request): boolean {
  if (hostedOnVercel()) return true;
  return new URL(request.url).protocol === "https:";
}

function sessionCookieName(request: Request): string {
  return isHttps(request) ? HOST_SESSION_COOKIE : SESSION_COOKIE;
}

function challengeCookieName(request: Request): string {
  return isHttps(request) ? HOST_CHALLENGE_COOKIE : CHALLENGE_COOKIE;
}

function cookieHeader(name: string, value: string, request: Request, maxAge: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
  ];
  if (isHttps(request)) parts.push("Secure");
  return parts.join("; ");
}

function parseSigned(value: string, parts: number): string[] | null {
  const chunks = value.split(".");
  if (chunks.length !== parts) return null;
  if (chunks.some((chunk) => !chunk)) return null;
  return chunks;
}

export function normalizePath(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  if (collapsed.length > 1 && collapsed.endsWith("/")) {
    return collapsed.slice(0, -1);
  }
  return collapsed || "/";
}

export function isPublicApi(method: string, pathname: string): boolean {
  const path = normalizePath(pathname);
  const verb = method.toUpperCase();
  return PUBLIC_API.some((item) => item.method === verb && item.path === path);
}

export function hasInternalBypassHeader(request: Request): boolean {
  for (const name of request.headers.keys()) {
    const header = name.toLowerCase();
    if (BYPASS_HEADERS.has(header) || header.startsWith("x-middleware-subrequest")) {
      return true;
    }
  }
  for (const name of BYPASS_HEADERS) {
    if (request.headers.get(name)) return true;
  }
  return false;
}

export function hasValidSession(request: Request): boolean {
  const key = signingSecret();
  if (!key) return !hostedOnVercel();
  const names = isHttps(request) ? [HOST_SESSION_COOKIE] : [SESSION_COOKIE];
  const token = readCookie(request, names);
  if (!token) return false;
  const parsed = parseSigned(token, 4);
  if (!parsed) return false;
  const [version, expRaw, print, mac] = parsed;
  if (version !== "v2") return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  if (!acceptedSecrets().some((secret) => fingerprint(secret) === print)) {
    return false;
  }
  const expected = hmacHex(key, `v2|${exp}|${print}`);
  return safeEqual(mac, expected);
}

export function issueSessionCookie(request: Request, secretUsed: string): string[] {
  const key = signingSecret();
  if (!key) return clearAccessCookies(request);
  const exp = Date.now() + SESSION_TTL_MS;
  const print = fingerprint(secretUsed);
  const mac = hmacHex(key, `v2|${exp}|${print}`);
  const token = `v2.${exp}.${print}.${mac}`;
  const cookies = [
    cookieHeader(sessionCookieName(request), token, request, Math.floor(SESSION_TTL_MS / 1000)),
    cookieHeader(challengeCookieName(request), "", request, 0),
  ];
  if (isHttps(request)) {
    cookies.push(cookieHeader(SESSION_COOKIE, "", request, 0));
    cookies.push(cookieHeader(CHALLENGE_COOKIE, "", request, 0));
  }
  return cookies;
}

export function clearAccessCookies(request: Request): string[] {
  const cookies = [
    cookieHeader(sessionCookieName(request), "", request, 0),
    cookieHeader(challengeCookieName(request), "", request, 0),
  ];
  if (isHttps(request)) {
    cookies.push(cookieHeader(SESSION_COOKIE, "", request, 0));
    cookies.push(cookieHeader(CHALLENGE_COOKIE, "", request, 0));
  }
  return cookies;
}

export function clearSessionCookie(request: Request): string[] {
  return clearAccessCookies(request);
}

export function clearChallengeCookie(request: Request): string[] {
  return [cookieHeader(challengeCookieName(request), "", request, 0)];
}

export function issueChallenge(request: Request): { nonce: string; cookies: string[] } | null {
  const key = signingSecret();
  if (!key) return null;
  const nonce = randomBytes(16).toString("hex");
  const exp = Date.now() + CHALLENGE_TTL_MS;
  const mac = hmacHex(key, `n|${nonce}|${exp}`);
  const value = `${nonce}.${exp}.${mac}`;
  const cookies = [
    cookieHeader(challengeCookieName(request), value, request, Math.floor(CHALLENGE_TTL_MS / 1000)),
  ];
  if (isHttps(request)) {
    cookies.push(cookieHeader(CHALLENGE_COOKIE, "", request, 0));
  }
  return { nonce, cookies };
}

export function readChallengeNonce(request: Request): string | null {
  const key = signingSecret();
  if (!key) return null;
  const names = isHttps(request) ? [HOST_CHALLENGE_COOKIE] : [CHALLENGE_COOKIE];
  const raw = readCookie(request, names);
  if (!raw) return null;
  const parsed = parseSigned(raw, 3);
  if (!parsed) return null;
  const [nonce, expRaw, mac] = parsed;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  const expected = hmacHex(key, `n|${nonce}|${exp}`);
  if (!safeEqual(mac, expected)) return null;
  return nonce;
}

export function secretMatchingProof(nonce: string, proof: string): string | null {
  if (!/^[a-f0-9]{64}$/i.test(proof)) return null;
  for (const secret of acceptedSecrets()) {
    const expected = sha256Hex(`${nonce}\0${secret}`);
    if (safeEqual(proof.toLowerCase(), expected)) return secret;
  }
  return null;
}

export { hostedOnVercel };
