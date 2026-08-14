import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { trackDanceView } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const { dance_id, session_id } = await request.json();

    if (!dance_id) {
      return NextResponse.json({ error: "dance_id required" }, { status: 400 });
    }

    const session = await auth();
    const result = await trackDanceView({
      danceId: dance_id,
      sessionId: session_id ?? null,
      userId: session?.user?.email ?? null,
    });

    return NextResponse.json({ ok: true, deduped: result.deduped });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
