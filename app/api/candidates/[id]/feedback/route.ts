import { NextResponse } from "next/server";
import { getAnonymousId } from "@/lib/anon";
import { getCandidate, getSession, recordFeedback } from "@/lib/services/session";
import type { FeedbackAction } from "@/lib/types";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const anonymousId = await getAnonymousId();
  const candidate = await getCandidate(id, anonymousId);
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await getSession(candidate.sessionId, anonymousId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const action = body.action as FeedbackAction;
  return NextResponse.json(await recordFeedback(session, id, action));
}
