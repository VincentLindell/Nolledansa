import { NextRequest, NextResponse } from "next/server";
import { insertSectionChant } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const section = payload?.section?.toString()?.trim();
    const name = payload?.name?.toString()?.trim();
    const melody = payload?.melody?.toString()?.trim();
    const lyrics = payload?.lyrics?.toString()?.trim();

    if (!section || !name || !melody || !lyrics) {
      return NextResponse.json({ error: "Ogiltig payload." }, { status: 400 });
    }

    await insertSectionChant({ section, name, melody, lyrics });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
