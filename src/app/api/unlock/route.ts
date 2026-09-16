import {
  appendCookies,
  issueSessionCookie,
  readChallengeNonce,
  requireBrowserPost,
  secretMatchingProof,
} from "@/lib/api-guard";
import { jsonError, jsonOk } from "@/lib/openai-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = await requireBrowserPost(request, {
    maxBytes: 4_000,
    rateKey: "unlock",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = JSON.parse(await request.text()) as unknown;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const proof =
    body &&
    typeof body === "object" &&
    "proof" in body &&
    typeof body.proof === "string"
      ? body.proof
      : "";

  const nonce = readChallengeNonce(request);
  const matched = nonce ? secretMatchingProof(nonce, proof) : null;
  if (!matched) {
    return jsonError("That passcode is wrong.", 401);
  }

  const response = jsonOk({ ok: true });
  appendCookies(response, issueSessionCookie(request, matched));
  return response;
}
