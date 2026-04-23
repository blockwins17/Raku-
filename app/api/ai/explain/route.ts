import { NextResponse } from "next/server";
import { explain } from "@/lib/ai/explain";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await explain({
      rawText: String(body.rawText ?? ""),
      url: body.url ? String(body.url) : undefined,
      courseName: body.courseName ? String(body.courseName) : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
