import { hasServerKey } from "@/lib/openai-server";

export function GET() {
  return Response.json({ hasServerKey: hasServerKey() });
}
