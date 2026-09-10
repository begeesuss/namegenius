import { NextResponse } from "next/server";
import { getAnonymousId } from "@/lib/anon";
import { createSession, sessionPayload } from "@/lib/services/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const anonymousId = await getAnonymousId();
  const session = await createSession(anonymousId, Boolean(body.demo));
  if (!session) return NextResponse.json({ error: "Could not create session" }, { status: 500 });
  return NextResponse.json(await sessionPayload(session));
}
