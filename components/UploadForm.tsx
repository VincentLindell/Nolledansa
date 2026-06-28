"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Upload, Loader2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DanceFormData, DanceOrganization, SegmentFormData, Section } from "@/lib/types";
import { parseTime } from "@/lib/utils";
import { compressVideo, CompressionProgress } from "@/lib/compress-video";
import SegmentForm from "./SegmentForm";

const SECTIONS: Section[] = ["A", "D", "E", "F", "I", "ING", "K", "M", "V", "W"];
const ORGANIZATIONS: DanceOrganization[] = ["Nollningen", "Sexmästeriet", "Phusk"];
const MAX_UPLOAD_MB = 50;
const LIGHT_COMPRESSION_THRESHOLD_MB = 0;

const isSupabaseObjectTooLargeError = (message?: string) =>
  !!message &&
  message.toLowerCase().includes("exceeded the maximum allowed size");

const isDancesRlsInsertError = (message?: string) =>
  !!message &&
  message.toLowerCase().includes("row-level security policy") &&
  message.toLowerCase().includes("table \"dances\"");

const getSupabaseHost = () => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return "okänd-host";
    return new URL(url).host;
  } catch {
    return "okänd-host";
  }
};

const defaultForm: DanceFormData = {
  title: "",
  section: "D",
  organization: "Nollningen",
  year: "",
  song_title: "",
  dancer_names: "",
  artist: "",
  spotify_url: "",
};

export default function UploadForm() {
  const supabase = createClient();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const captureVideoRef = useRef<HTMLVideoElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);

  const [form, setForm] = useState<DanceFormData>(defaultForm);
  const [segments, setSegments] = useState<SegmentFormData[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [frameTime, setFrameTime] = useState(0);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stage shown in the submit button / status bar
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  // 0–100 compression progress, null = not compressing
  const [compressionPct, setCompressionPct] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [videoPreviewUrl, thumbnailPreviewUrl]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFrameTime(0);
    setThumbnailBlob(null);
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    setThumbnailPreviewUrl(null);

    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setVideoDuration(video.duration);
    };
    video.src = url;
  };

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
        if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
        const preview = URL.createObjectURL(blob);
        setThumbnailPreviewUrl(preview);
      }, "image/jpeg", 0.82);
    } catch (captureErr) {
      console.error("[Thumbnail] capture failed:", captureErr);
      setError("Kunde inte skapa preview-bild från videon. Prova en annan frame.");
    }
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return "Dansnamn krävs";
    if (!form.dancer_names.trim()) return "Vilka dansar krävs";
    if (!form.year.trim()) return "År krävs";
    if (!videoFile) return "Välj en videofil";
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (!s.name.trim()) return `Del ${i + 1}: namn krävs`;
      const start = parseTime(s.start_time_str);
      const end = parseTime(s.end_time_str);
      if (isNaN(start)) return `Del ${i + 1}: ogiltig starttid`;
      if (isNaN(end)) return `Del ${i + 1}: ogiltig sluttid`;
      if (start >= end) return `Del ${i + 1}: starttid måste vara före sluttid`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCompressionPct(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const originalMB = videoFile!.size / 1024 / 1024;

      // ── 1. Komprimera video ──────────────────────────────────────────────
      let fileToUpload = videoFile!;

      const handleCompressionProgress = (p: CompressionProgress) => {
        setStatusMsg(p.message);
        if (p.stage === "compressing" && p.percent !== undefined) {
          setCompressionPct(p.percent);
        } else if (p.stage === "loading") {
          setCompressionPct(null);
        } else if (p.stage === "done") {
          setCompressionPct(null);
        }
      };

      try {
        fileToUpload = await compressVideo(
          videoFile!,
          handleCompressionProgress,
          LIGHT_COMPRESSION_THRESHOLD_MB
        );
      } catch (compressionErr) {
        console.warn("Komprimering misslyckades:", compressionErr);
        throw new Error(
          "Komprimeringen misslyckades. Prova igen eller exportera videon med lägre bitrate/upplösning."
        );
      }

      // Sanity-check final file size
      const finalMB = fileToUpload.size / 1024 / 1024;
      if (finalMB > MAX_UPLOAD_MB) {
        throw new Error(
          `Filen är ${finalMB.toFixed(0)} MB efter komprimering, vilket överstiger ` +
          `gränsen på ${MAX_UPLOAD_MB} MB. Försök med en kortare video.`
        );
      }

      // ── 2. Ladda upp video till Supabase Storage ─────────────────────────
      setStatusMsg("Laddar upp video…");
      setCompressionPct(null);

      const { data: { user } } = await supabase.auth.getUser();
      const folder = user?.id ?? crypto.randomUUID();
      const uploadExt = fileToUpload.name.split(".").pop()?.toLowerCase() || "mp4";
      const videoPath = `${folder}/${Date.now()}.${uploadExt}`;
      const contentType = fileToUpload.type || "application/octet-stream";

      const { error: uploadError } = await supabase.storage
        .from("dance-videos")
        .upload(videoPath, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
          contentType,
        });

      if (uploadError && isSupabaseObjectTooLargeError(uploadError.message)) {
        throw new Error(
          "Videon är större än bucketens max object size i Supabase. " +
          "Gratisplanen stödjer max 50 MB per fil. Prova igen så komprimeras videon hårdare."
        );
      }

      if (uploadError) {
        throw new Error(`Videouppladdning misslyckades: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("dance-videos")
        .getPublicUrl(videoPath);

      // ── 3.5 Ladda upp thumbnail (valfritt) ──────────────────────────────
      let thumbnailUrl: string | null = null;
      if (thumbnailBlob) {
        const thumbPath = `${folder}/${Date.now()}-thumb.jpg`;
        const { error: thumbError } = await supabase.storage
          .from("dance-videos")
          .upload(thumbPath, thumbnailBlob, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/jpeg",
          });

        if (!thumbError) {
          const { data: thumbPublic } = supabase.storage
            .from("dance-videos")
            .getPublicUrl(thumbPath);
          thumbnailUrl = thumbPublic.publicUrl;
        }
      }

      // ── 4. Spara dans ────────────────────────────────────────────────────
      setStatusMsg("Sparar dans…");

      const danceId = crypto.randomUUID();

      const { error: danceError } = await supabase
        .from("dances")
        .insert({
          id: danceId,
          title: form.title.trim(),
          section: form.section,
          organization: form.organization,
          year: form.year.trim(),
          song_title: form.title.trim(),
          dancer_names: form.dancer_names.trim(),
          artist: form.artist.trim() || null,
          spotify_url: form.spotify_url.trim() || null,
          video_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          created_by: user?.id ?? null,
          status: "pending",
        });

      if (danceError) {
        if (isDancesRlsInsertError(danceError.message)) {
          throw new Error(
            "Supabase blockerar uppladdningen via RLS för tabellen dances. " +
            `Verifiera att du körde SQL i samma projekt (${getSupabaseHost()}) och att rätt policy finns.`
          );
        }
        throw new Error(danceError.message);
      }

      // ── 5. Spara dansdelar ───────────────────────────────────────────────
      if (segments.length > 0) {
        setStatusMsg("Sparar dansdelar…");
        const segmentRows = segments.map((s, i) => ({
          dance_id: danceId,
          name: s.name.trim(),
          description: s.description.trim() || null,
          start_time: parseTime(s.start_time_str),
          end_time: parseTime(s.end_time_str),
          sort_order: i,
        }));

        const { error: segError } = await supabase
          .from("dance_segments")
          .insert(segmentRows);

        if (segError) throw new Error(segError.message);
      }

      setStatusMsg(null);
      setLoading(false);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
      setLoading(false);
      setStatusMsg(null);
      setCompressionPct(null);
    }
  };

  // ── Bekräftelseskärm ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="text-center py-10 space-y-4">
        <CheckCircle className="mx-auto w-14 h-14 text-green-500" />
        <h2 className="text-xl font-bold text-gray-900">Tack för uppladdningen!</h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Din dans har sparats och väntar nu på granskning. Den visas publikt på hemsidan
          så snart en admin har godkänt den.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            href="/"
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Till startsidan
          </Link>
          <button
            onClick={() => {
              setSuccess(false);
              setForm(defaultForm);
              setSegments([]);
              setVideoFile(null);
              setVideoPreviewUrl(null);
              setVideoDuration(undefined);
              setFrameTime(0);
              setThumbnailBlob(null);
              if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
              setThumbnailPreviewUrl(null);
            }}
            className="border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Ladda upp en till
          </button>
        </div>
      </div>
    );
  }

  // ── Formulär ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Video */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">1. Videofil *</h2>
        <div
          onClick={() => !loading && videoInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            loading
              ? "opacity-60 cursor-not-allowed"
              : "cursor-pointer"
          } ${
            videoFile
              ? "border-purple-400 bg-purple-50"
              : "border-gray-300 hover:border-purple-400"
          }`}
        >
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoChange}
            disabled={loading}
          />
          {videoFile ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-purple-700">{videoFile.name}</p>
              <p className="text-xs text-gray-500">
                {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                {videoDuration !== undefined &&
                  ` · ${Math.floor(videoDuration / 60)}:${String(
                    Math.floor(videoDuration % 60)
                  ).padStart(2, "0")}`}
              </p>
              <p className="text-xs text-gray-400">
                Alla videostorlekar kan väljas här. Videon komprimeras före uppladdning till max {MAX_UPLOAD_MB} MB.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto w-8 h-8 text-gray-400" />
              <p className="text-sm text-gray-600">Klicka för att välja videofil</p>
              <p className="text-xs text-gray-400">
                MP4, MOV, WebM, etc. · Komprimeras automatiskt till max {MAX_UPLOAD_MB} MB före uppladdning
              </p>
            </div>
          )}
        </div>

        {videoPreviewUrl && !loading && (
          <div className="space-y-3">
            <video
              src={videoPreviewUrl}
              controls
              className="w-full max-h-56 rounded-lg"
            />

            <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-800">Välj preview-bild till startsidan</p>

              <video
                ref={captureVideoRef}
                src={videoPreviewUrl}
                className="hidden"
                preload="metadata"
                muted
                playsInline
                onLoadedMetadata={() => {
                  const v = captureVideoRef.current;
                  if (!v) return;
                  const safeTime = Math.min(frameTime, Math.max(0, (v.duration || 0) - 0.1));
                  v.currentTime = safeTime;
                }}
                onSeeked={captureThumbnailAtCurrentTime}
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

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={captureThumbnailAtCurrentTime}
                  className="px-3 py-2 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                >
                  Använd denna frame
                </button>
                <span className="text-xs text-gray-500">Du kan ändra frame innan uppladdning.</span>
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
          </div>
        )}
      </section>

      {/* Basic info */}
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
              placeholder="t.ex. First Girl On The Moon"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Vilka dansar *</label>
            <input
              type="text"
              value={form.dancer_names}
              onChange={(e) => setForm({ ...form, dancer_names: e.target.value })}
              placeholder="t.ex. Peppfinity, Staben, Sex on the beach"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Sektion *</label>
              <select
                value={form.section}
                onChange={(e) =>
                  setForm({ ...form, section: e.target.value as Section })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Tillhör *</label>
              <select
                value={form.organization}
                onChange={(e) =>
                  setForm({ ...form, organization: e.target.value as DanceOrganization })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {ORGANIZATIONS.map((organization) => (
                  <option key={organization} value={organization}>
                    {organization}
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
              placeholder="t.ex. Klaas, R3HAB"
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

      {/* Segments */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">3. Dansdelar (timestamps)</h2>
        <p className="text-sm text-gray-500">
          Dela upp dansen i övningsbara delar. Användare kan sedan välja och loopa valda delar.
        </p>
        <SegmentForm
          segments={segments}
          onChange={setSegments}
          videoDuration={videoDuration}
        />
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Submit + progress */}
      <div className="space-y-3">
        {/* Compression progress bar */}
        {loading && compressionPct !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Komprimerar video…</span>
              <span>{compressionPct}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${compressionPct}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span className="truncate">{statusMsg ?? "Bearbetar…"}</span>
            </>
          ) : (
            "Ladda upp dans"
          )}
        </button>
      </div>
    </form>
  );
}
