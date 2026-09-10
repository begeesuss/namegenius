import { NextResponse } from "next/server";
import { getAnonymousId } from "@/lib/anon";
import { getCandidate, healthReport } from "@/lib/services/session";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const anonymousId = await getAnonymousId();
  const candidate = await getCandidate(id, anonymousId);
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ candidate, report: healthReport(candidate) });
}
