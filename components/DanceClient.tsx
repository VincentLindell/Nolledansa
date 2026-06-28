"use client";

import { useState, useEffect } from "react";
import { Dance, DanceSegment } from "@/lib/types";
import VideoPlayer from "@/components/VideoPlayer";
import SegmentSelector from "@/components/SegmentSelector";
import EditDanceRequestForm from "@/components/EditDanceRequestForm";
import { getSessionId } from "@/lib/utils";

const VIEW_TRACK_THROTTLE_MS = 30_000;

interface DanceClientProps {
  dance: Dance;
  danceId: string;
  videoUrl: string;
  segments: DanceSegment[];
}

export default function DanceClient({ dance, danceId, videoUrl, segments }: DanceClientProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Track view once on mount (throttled to avoid Strict Mode double calls)
  useEffect(() => {
    const sessionId = getSessionId();
    const storageKey = `trackview:${danceId}:${sessionId}`;

    try {
      const lastTracked = Number(window.sessionStorage.getItem(storageKey) ?? "0");
      const now = Date.now();
      if (now - lastTracked < VIEW_TRACK_THROTTLE_MS) {
        return;
      }
      window.sessionStorage.setItem(storageKey, String(now));
    } catch {
      // Ignore storage errors and continue with request.
    }

    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dance_id: danceId, session_id: sessionId }),
      keepalive: true,
    }).catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("[TrackView] Failed to record click:", err);
      }
    });
  }, [danceId]);

  const toggleSegment = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build sorted selected segments list for the player
  const selected = segments
    .filter((s) => selectedIds.has(s.id))
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <VideoPlayer videoUrl={videoUrl} selectedSegments={selected} />

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Välj delar att öva</h2>
        <SegmentSelector
          segments={segments}
          selectedIds={selectedIds}
          onToggle={toggleSegment}
        />
      </div>

      <EditDanceRequestForm dance={dance} segments={segments} />
    </div>
  );
}
