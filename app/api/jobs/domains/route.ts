import { timingSafeEqual } from "node:crypto";
import { runDomainJobs } from "@/lib/notifications/worker";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const expected = "Bearer " + (secret ?? "");
  if (!secret || Buffer.byteLength(authorization) !== Buffer.byteLength(expected)
    || !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try { return Response.json(await runDomainJobs(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Domain maintenance failed" }, { status: 503 }); }
}
export const GET = POST;
