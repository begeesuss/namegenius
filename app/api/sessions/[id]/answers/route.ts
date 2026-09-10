import { NextResponse } from "next/server";
import { getAnonymousId } from "@/lib/anon";
import { getSession, setNamingType, submitAnswer } from "@/lib/services/session";
import { NAMING_TYPES, type NamingType } from "@/lib/types";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const anonymousId = await getAnonymousId();
  const session = await getSession(id, anonymousId);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  if (body.namingType && NAMING_TYPES.includes(body.namingType as NamingType)) {
    return NextResponse.json(
      await setNamingType(session, body.namingType as NamingType, body.otherLabel),
    );
  }
  return NextResponse.json(await submitAnswer(session, body));
}
