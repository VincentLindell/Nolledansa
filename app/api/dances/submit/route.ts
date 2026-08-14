import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createDanceWithSegments } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const session = await auth();

    if (!payload?.danceId || !payload?.title || !payload?.section || !payload?.year || !payload?.videoUrl) {
      return NextResponse.json({ error: "Ogiltig payload." }, { status: 400 });
    }

    await createDanceWithSegments({
      danceId: payload.danceId,
      title: payload.title,
      section: payload.section,
      organization: payload.organization ?? "Nollningen",
      year: payload.year,
      songTitle: payload.songTitle ?? payload.title,
      dancerNames: payload.dancerNames ?? "",
      artist: payload.artist ?? null,
      spotifyUrl: payload.spotifyUrl ?? null,
      videoUrl: payload.videoUrl,
      thumbnailUrl: payload.thumbnailUrl ?? null,
      createdBy: session?.user?.email ?? null,
      segments: Array.isArray(payload.segments) ? payload.segments : [],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
