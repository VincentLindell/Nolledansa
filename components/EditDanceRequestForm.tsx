"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, PencilLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SegmentForm from "@/components/SegmentForm";
import {
  Dance,
  DanceSegment,
  Section,
  SegmentFormData,
} from "@/lib/types";
import { parseTime } from "@/lib/utils";

const SORTED_SECTIONS: Section[] = ["A", "D", "E", "F", "I", "ING", "K", "M", "V", "W"];

function toSegmentFormData(segments: DanceSegment[]): SegmentFormData[] {
  return segments.map((segment, index) => ({
    name: segment.name,
    description: segment.description ?? "",
    start_time_str: `${Math.floor(segment.start_time / 60)}:${String(
      Math.floor(segment.start_time % 60)
    ).padStart(2, "0")}`,
    end_time_str: `${Math.floor(segment.end_time / 60)}:${String(
      Math.floor(segment.end_time % 60)
    ).padStart(2, "0")}`,
    sort_order: index,
  }));
}

interface EditDanceRequestFormProps {
  dance: Dance;
  segments: DanceSegment[];
}

export default function EditDanceRequestForm({ dance, segments }: EditDanceRequestFormProps) {
  const supabase = createClient();
  const captureVideoRef = useRef<HTMLVideoElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);
  const pendingThumbnailCaptureRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requesterNote, setRequesterNote] = useState("");
  const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined);
  const [frameTime, setFrameTime] = useState(0);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(dance.thumbnail_url);
  const videoSourceUrl = useMemo(
    () => `/api/video-proxy?url=${encodeURIComponent(dance.video_url)}`,
    [dance.video_url]
  );
  const [form, setForm] = useState({
    title: dance.title,
    section: dance.section,
    year: dance.year,
    song_title: dance.song_title,
    dancer_names: dance.dancer_names ?? "",
    artist: dance.artist ?? "",
    spotify_url: dance.spotify_url ?? "",
  });
  const [proposedSegments, setProposedSegments] = useState<SegmentFormData[]>(
    toSegmentFormData(segments)
  );

  const hasChanges = useMemo(() => {
    const currentDance = JSON.stringify({
      title: dance.title.trim(),
      section: dance.section,
      year: dance.year.trim(),
      song_title: dance.song_title.trim(),
      dancer_names: dance.dancer_names?.trim() ?? "",
      artist: dance.artist?.trim() ?? "",
      spotify_url: dance.spotify_url?.trim() ?? "",
    });

    const nextDance = JSON.stringify({
      title: form.title.trim(),
      section: form.section,
      year: form.year.trim(),
      song_title: form.title.trim(),
      dancer_names: form.dancer_names.trim(),
      artist: form.artist.trim(),
      spotify_url: form.spotify_url.trim(),
    });

    const currentSegments = JSON.stringify(
      segments.map((segment, index) => ({
        name: segment.name.trim(),
        description: segment.description?.trim() ?? "",
        start_time: segment.start_time,
        end_time: segment.end_time,
        sort_order: index,
      }))
    );

    const nextSegments = JSON.stringify(
      proposedSegments.map((segment, index) => ({
        name: segment.name.trim(),
        description: segment.description.trim(),
        start_time: parseTime(segment.start_time_str),
        end_time: parseTime(segment.end_time_str),
        sort_order: index,
      }))
    );

    return currentDance !== nextDance || currentSegments !== nextSegments;
  }, [dance, form, proposedSegments, segments]);

  const thumbnailChanged = thumbnailPreviewUrl !== dance.thumbnail_url;

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl && thumbnailPreviewUrl !== dance.thumbnail_url) {
        URL.revokeObjectURL(thumbnailPreviewUrl);
      }
    };
  }, [dance.thumbnail_url, thumbnailPreviewUrl]);

  const captureThumbnailAtCurrentTime = () => {
    const video = captureVideoRef.current;
    const canvas = frameCanvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return;

    try {
      context.drawImage(video, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) {
          setError("Kunde inte skapa preview-bild. Prova en annan tidpunkt.");
          return;
        }

        setThumbnailBlob(blob);
        if (thumbnailPreviewUrl && thumbnailPreviewUrl !== dance.thumbnail_url) {
          URL.revokeObjectURL(thumbnailPreviewUrl);
        }
        setThumbnailPreviewUrl(URL.createObjectURL(blob));
      }, "image/jpeg", 0.82);
    } catch (captureErr) {
      console.error("[Thumbnail] capture failed:", captureErr);
      setError("Kunde inte skapa preview-bild från videon. Prova en annan frame.");
    }
  };

  const useCurrentFrameAsThumbnail = () => {
    const video = captureVideoRef.current;
    if (!video) return;

    const safeTime = Math.min(frameTime, Math.max(0, (video.duration || frameTime) - 0.1));

    if (Math.abs(video.currentTime - safeTime) > 0.05) {
      pendingThumbnailCaptureRef.current = true;
      video.currentTime = safeTime;
      return;
    }

    captureThumbnailAtCurrentTime();
  };

  const resetThumbnail = () => {
    pendingThumbnailCaptureRef.current = false;
    setThumbnailBlob(null);
    if (thumbnailPreviewUrl && thumbnailPreviewUrl !== dance.thumbnail_url) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
    }
    setThumbnailPreviewUrl(dance.thumbnail_url);
    setFrameTime(0);
  };

  const validate = () => {
    if (!form.title.trim()) return "Titel krävs";
    if (!form.dancer_names.trim()) return "Vilka dansar krävs";
    if (!form.year.trim()) return "År krävs";
    for (let i = 0; i < proposedSegments.length; i++) {
      const segment = proposedSegments[i];
      if (!segment.name.trim()) return `Del ${i + 1}: namn krävs`;
      const start = parseTime(segment.start_time_str);
      const end = parseTime(segment.end_time_str);
      if (isNaN(start)) return `Del ${i + 1}: ogiltig starttid`;
      if (isNaN(end)) return `Del ${i + 1}: ogiltig sluttid`;
      if (start >= end) return `Del ${i + 1}: starttid måste vara före sluttid`;
    }

    if (!hasChanges && !thumbnailChanged) return "Gör minst en ändring innan du skickar in förslaget.";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const requestId = crypto.randomUUID();
      let requestThumbnailUrl: string | null = dance.thumbnail_url;

      if (thumbnailBlob) {
        const thumbPath = `${dance.id}/${requestId}-thumbnail.jpg`;
        const { error: thumbError } = await supabase.storage
          .from("dance-videos")
          .upload(thumbPath, thumbnailBlob, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/jpeg",
          });

        if (thumbError) throw new Error(thumbError.message);

        const { data: thumbData } = supabase.storage.from("dance-videos").getPublicUrl(thumbPath);
        requestThumbnailUrl = thumbData.publicUrl;
      }

      const { error: requestError } = await supabase
        .from("dance_edit_requests")
        .insert({
          id: requestId,
          dance_id: dance.id,
          title: form.title.trim(),
          section: form.section,
          year: form.year.trim(),
          song_title: form.title.trim(),
          dancer_names: form.dancer_names.trim(),
          artist: form.artist.trim() || null,
          spotify_url: form.spotify_url.trim() || null,
          thumbnail_url: requestThumbnailUrl,
          requester_note: requesterNote.trim() || null,
          status: "pending",
        });

      if (requestError) {
        throw new Error(requestError.message);
      }

      const rows = proposedSegments.map((segment, index) => ({
        request_id: requestId,
        name: segment.name.trim(),
        description: segment.description.trim() || null,
        start_time: parseTime(segment.start_time_str),
        end_time: parseTime(segment.end_time_str),
        sort_order: index,
      }));

      if (rows.length > 0) {
        const { error: segmentsError } = await supabase
          .from("dance_edit_request_segments")
          .insert(rows);

        if (segmentsError) {
          throw new Error(segmentsError.message);
        }
      }

      setSuccess(true);
      setOpen(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "";
      if (
        message.toLowerCase().includes("relation") &&
        (message.includes("dance_edit_requests") || message.includes("dance_edit_request_segments"))
      ) {
        setError(
          "Databasen saknar tabeller för ändringsförslag. Kör senaste SQL-migration i Supabase SQL Editor och försök igen."
        );
      } else if (message.toLowerCase().includes("row-level security policy")) {
        setError(
          "Supabase blockerade ändringsförslaget via RLS. Kör senaste SQL-migration i Supabase och försök igen."
        );
      } else {
        setError(message || "Kunde inte skicka förslaget.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-gray-900">Föreslå en ändring</h2>
          <p className="text-sm text-gray-500 mt-1">
            Om något är fel i dansen eller indelningen kan du skicka in ett ändringsförslag.
            Admin måste godkänna det innan den publika versionen uppdateras.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PencilLine className="w-4 h-4" />
          {open ? "Stäng" : "Redigera dans"}
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Ditt ändringsförslag är inskickat och väntar nu på granskning.
        </div>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">1. Video och preview-bild</h2>
            <video
              src={videoSourceUrl}
              controls
              className="w-full max-h-56 rounded-lg"
            />

            <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-800">Välj preview-bild till startsidan</p>

              <video
                ref={captureVideoRef}
                src={videoSourceUrl}
                className="hidden"
                preload="metadata"
                muted
                playsInline
                onLoadedMetadata={() => {
                  const v = captureVideoRef.current;
                  if (!v) return;
                  setVideoDuration(v.duration);
                  const safeTime = Math.min(frameTime, Math.max(0, (v.duration || 0) - 0.1));
                  v.currentTime = safeTime;
                }}
                onSeeked={() => {
                  if (!pendingThumbnailCaptureRef.current) return;
                  pendingThumbnailCaptureRef.current = false;
                  captureThumbnailAtCurrentTime();
                }}
              />

              {videoDuration !== undefined && videoDuration > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs text-gray-600">
                    Tidpunkt: {Math.floor(frameTime / 60)}:{String(Math.floor(frameTime % 60)).padStart(2, "0")}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, Math.floor(videoDuration))}
                    step={1}
                    value={Math.min(frameTime, Math.max(0, Math.floor(videoDuration)))}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      setFrameTime(t);
                      const v = captureVideoRef.current;
                      if (v) {
                        const safeTime = Math.min(t, Math.max(0, (v.duration || t) - 0.1));
                        v.currentTime = safeTime;
                      }
                    }}
                    className="w-full"
                  />
                </div>
              )}

              <canvas ref={frameCanvasRef} className="hidden" />

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={useCurrentFrameAsThumbnail}
                  className="px-3 py-2 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                >
                  Använd denna frame
                </button>
                {thumbnailChanged && (
                  <button
                    type="button"
                    onClick={resetThumbnail}
                    className="px-3 py-2 text-xs font-medium border border-gray-300 hover:border-gray-400 text-gray-700 rounded-md transition-colors"
                  >
                    Återställ till nuvarande thumbnail
                  </button>
                )}
                <span className="text-xs text-gray-500">
                  Nuvarande thumbnail behålls automatiskt om du inte väljer en ny frame.
                </span>
              </div>

              {thumbnailPreviewUrl && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">Vald preview:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailPreviewUrl}
                    alt="Vald preview"
                    className="w-full max-h-40 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">2. Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Dansnamn *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value, song_title: e.target.value })
                  }
                  placeholder="t.ex. D-sektionens nolledans 2023"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Vilka dansar *</label>
                <input
                  type="text"
                  value={form.dancer_names}
                  onChange={(e) => setForm({ ...form, dancer_names: e.target.value })}
                  placeholder="t.ex. Nollor, Phaddrar, Sexmästeriet"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Sektion *</label>
                  <select
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value as Section })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {SORTED_SECTIONS.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">År *</label>
                  <input
                    type="text"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    placeholder="t.ex. 23"
                    maxLength={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Artist</label>
                <input
                  type="text"
                  value={form.artist}
                  onChange={(e) => setForm({ ...form, artist: e.target.value })}
                  placeholder="t.ex. The Weeknd"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">Spotify-länk</label>
                <input
                  type="url"
                  value={form.spotify_url}
                  onChange={(e) => setForm({ ...form, spotify_url: e.target.value })}
                  placeholder="https://open.spotify.com/track/..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900">3. Dansdelar (timestamps)</h2>
            <p className="text-sm text-gray-500">
              Dela upp dansen i övningsbara delar. Användare kan sedan välja och loopa valda delar.
            </p>
            <SegmentForm
              segments={proposedSegments}
              onChange={setProposedSegments}
              videoDuration={videoDuration}
            />
          </section>

          <section className="space-y-2">
            <label className="block text-sm text-gray-700">Kommentar till admin</label>
            <textarea
              value={requesterNote}
              onChange={(e) => setRequesterNote(e.target.value)}
              rows={3}
              placeholder="Beskriv gärna vad som borde ändras och varför."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </section>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">Skickar…</span>
              </>
            ) : (
              "Skicka ändringsförslag"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
