import { NextResponse } from "next/server";
import { getAnonymousId } from "@/lib/anon";
import { getSession, regenerateSession } from "@/lib/services/session";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const anonymousId = await getAnonymousId();
  const session = await getSession(id, anonymousId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const steering = body.steering
    ? Array.isArray(body.steering)
      ? body.steering
      : [String(body.steering)]
    : undefined;
  const conversation = body.conversation ? [String(body.conversation)] : undefined;
  return NextResponse.json(await regenerateSession(session, { steering, conversation }));
}
