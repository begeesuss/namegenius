import { NextResponse } from "next/server";
import { getAnonymousId } from "@/lib/anon";
import { createProject, getSession } from "@/lib/services/session";

export async function POST(req: Request) {
  const body = await req.json();
  const anonymousId = await getAnonymousId();
  const session = await getSession(body.sessionId, anonymousId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const title = body.title || `Naming ${session.namingType || "project"}`;
  return NextResponse.json(await createProject(session, title));
}
