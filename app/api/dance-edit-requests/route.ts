import { NextRequest, NextResponse } from "next/server";
import { createDanceEditRequest } from "@/lib/store";

type SegmentInput = {
  name: string;
  description?: string | null;
  startTime: number;
  endTime: number;
  sortOrder: number;
};

function getSegments(value: unknown): SegmentInput[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (segment): segment is SegmentInput =>
      !!segment &&
      typeof segment === "object" &&
      "name" in segment &&
      "startTime" in segment &&
      "endTime" in segment &&
      typeof segment.name === "string" &&
      typeof segment.startTime === "number" &&
      typeof segment.endTime === "number"
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    if (
      !payload?.requestId ||
      !payload?.danceId ||
      !payload?.title ||
      !payload?.section ||
      !payload?.year ||
      !payload?.requestType
    ) {
      return NextResponse.json({ error: "Ogiltig payload." }, { status: 400 });
    }

    await createDanceEditRequest({
      requestId: payload.requestId,
      danceId: payload.danceId,
      requestType: payload.requestType,
      title: payload.title,
      section: payload.section,
      organization: payload.organization ?? "Nollningen",
      year: payload.year,
      songTitle: payload.songTitle ?? payload.title,
      dancerNames: payload.dancerNames ?? "",
      artist: payload.artist ?? null,
      spotifyUrl: payload.spotifyUrl ?? null,
      videoUrl: payload.videoUrl ?? null,
      thumbnailUrl: payload.thumbnailUrl ?? null,
      requesterNote: payload.requesterNote ?? null,
      hideUntil: payload.hideUntil ?? null,
      hideIndefinitely: payload.hideIndefinitely ?? null,
      segments: getSegments(payload.segments),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
