import { NextResponse } from "next/server";
import { getDomainAdapter } from "@/lib/adapters/domain";

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name ?? "");
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const checks = await getDomainAdapter().check(name);
  return NextResponse.json({ checks });
}
