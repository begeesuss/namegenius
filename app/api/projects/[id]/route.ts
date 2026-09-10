import { NextResponse } from "next/server";
import { getAnonymousId } from "@/lib/anon";
import { getProject } from "@/lib/services/session";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const anonymousId = await getAnonymousId();
  const project = await getProject(id, anonymousId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}
