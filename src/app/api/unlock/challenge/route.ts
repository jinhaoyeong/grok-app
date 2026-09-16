import {
  appendCookies,
  issueChallenge,
  requireBrowserGet,
} from "@/lib/api-guard";
import { jsonError, jsonOk } from "@/lib/openai-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const blocked = await requireBrowserGet(request, {
    rateKey: "challenge",
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (blocked) return blocked;

  const challenge = issueChallenge(request);
  if (!challenge) {
    return jsonError("Couldn't do that right now.", 503);
  }

  const response = jsonOk({ nonce: challenge.nonce });
  appendCookies(response, challenge.cookies);
  return response;
}
