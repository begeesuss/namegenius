import { NextResponse } from "next/server";
import { getAnonymousId } from "@/lib/anon";
import { getSession, sessionPayload } from "@/lib/services/session";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const anonymousId = await getAnonymousId();
  const session = await getSession(id, anonymousId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await sessionPayload(session));
}
