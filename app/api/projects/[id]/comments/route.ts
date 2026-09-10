import { NextResponse } from "next/server";
import { getAnonymousId } from "@/lib/anon";
import { addComment } from "@/lib/services/session";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const anonymousId = await getAnonymousId();
  const body = await req.json();
  const project = await addComment(id, anonymousId, body.author, body.body);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}
