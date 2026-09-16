import { appendCookies, clearAccessCookies, requireBrowserPost } from "@/lib/api-guard";
import { jsonOk } from "@/lib/openai-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = await requireBrowserPost(request, {
    maxBytes: 2_000,
    rateKey: "lock",
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (blocked) return blocked;

  const response = jsonOk({ ok: true });
  appendCookies(response, clearAccessCookies(request));
  return response;
}
