/**
 * Client-side video compression using FFmpeg.wasm.
 *
 * WASM core is loaded lazily from CDN on first use (~25 MB download, then cached).
 *
 * Target output when compression is needed:
 *   - Format: MP4 (H.264 + AAC)
 *   - Max height: 720 px (width scaled proportionally)
 *   - Frame rate: unchanged
 *   - Adaptive bitrate based on video duration (targets ~45 MB output)
 *   - Audio: 96 kbps AAC
 *   - Preset: ultrafast (fast client-side encoding)
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export type CompressionStage =
  | "loading"        // Loading WASM from CDN
  | "compressing"    // FFmpeg transcoding
  | "done";

export interface CompressionProgress {
  stage: CompressionStage;
  /** 0–100, only set during "compressing" and "done" */
  percent?: number;
  /** Human-readable status message */
  message: string;
}

const LIGHT_COMPRESSION_THRESHOLD_MB = 0;
const TARGET_OUTPUT_MB = 45;
const AUDIO_BITRATE_KBPS = 96;
const MIN_VIDEO_BITRATE_KBPS = 900;
const MAX_VIDEO_BITRATE_KBPS = 4500;

export type CompressionMode = "light" | "aggressive";

export interface CompressionOptions {
  skipThresholdMB?: number;
  mode?: CompressionMode;
}

// Singleton FFmpeg instance – loaded once per page session
let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getAdaptiveVideoBitrateKbps(durationSeconds: number | null): number {
  if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 1700;
  }

  const targetTotalKbps = Math.floor((TARGET_OUTPUT_MB * 8192) / durationSeconds);
  const targetVideoKbps = targetTotalKbps - AUDIO_BITRATE_KBPS;

  return clamp(targetVideoKbps, MIN_VIDEO_BITRATE_KBPS, MAX_VIDEO_BITRATE_KBPS);
}

async function getVideoDurationSeconds(file: File): Promise<number | null> {
  if (typeof document === "undefined") return null;

  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    video.src = objectUrl;
  });
}

/**
 * Ensures FFmpeg WASM is loaded. Subsequent calls share the same promise.
 */
function ensureFFmpegLoaded(
  onProgress: (p: CompressionProgress) => void
): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return Promise.resolve(ffmpeg);

  if (!loadPromise) {
    // Assign promise synchronously so concurrent callers share it
    loadPromise = (async () => {
      onProgress({ stage: "loading", message: "Laddar lätt komprimering (~25 MB)…" });
      const instance = new FFmpeg();
      await instance.load({
        coreURL: await toBlobURL(
          `${CORE_BASE}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${CORE_BASE}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });
      ffmpeg = instance;
      return instance;
    })();
  }

  return loadPromise;
}

/**
 * Compress a video file client-side before uploading.
 *
 * Skips compression if the file is already reasonably sized (under skipThresholdMB).
 *
 * @param file              Original video file from <input type="file">
 * @param onProgress        Progress callback
 * @param skipThresholdMB   Skip compression if already below this size (default 0 MB)
 * @returns                 Compressed MP4 File, or original file if skipped
 */
export async function compressVideo(
  file: File,
  onProgress: (p: CompressionProgress) => void,
  optionsOrThreshold: CompressionOptions | number = LIGHT_COMPRESSION_THRESHOLD_MB
): Promise<File> {
  const options: CompressionOptions =
    typeof optionsOrThreshold === "number"
      ? { skipThresholdMB: optionsOrThreshold, mode: "light" }
      : optionsOrThreshold;

  const skipThresholdMB = options.skipThresholdMB ?? LIGHT_COMPRESSION_THRESHOLD_MB;
  const mode = options.mode ?? "light";

  const fileMB = file.size / 1024 / 1024;

  // Already a reasonably sized file – skip compression to save time and CPU.
  if (fileMB <= skipThresholdMB) {
    onProgress({ stage: "done", percent: 100, message: "Video klar för uppladdning." });
    return file;
  }

  const instance = await ensureFFmpegLoaded(onProgress);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const inputName = `input.${ext}`;
  const outputName = "output.mp4";
  const durationSeconds = await getVideoDurationSeconds(file);
  const adaptiveVideoBitrateKbps = getAdaptiveVideoBitrateKbps(durationSeconds);
  const adaptiveMaxrateKbps = Math.round(adaptiveVideoBitrateKbps * 1.15);
  const adaptiveBufsizeKbps = Math.round(adaptiveVideoBitrateKbps * 2.0);

  const ffmpegArgs =
    mode === "aggressive"
      ? [
          "-i", inputName,
          "-vf", "scale=-2:min(ih\\,480)",
          "-c:v", "libx264",
          "-crf", "34",
          "-preset", "ultrafast",
          "-maxrate", "900k",
          "-bufsize", "1200k",
          "-c:a", "aac",
          "-b:a", "64k",
          "-movflags", "+faststart",
          outputName,
        ]
      : [
          "-i", inputName,
          "-vf", "scale=-2:min(ih\\,720)",
          "-c:v", "libx264",
          "-b:v", `${adaptiveVideoBitrateKbps}k`,
          "-maxrate", `${adaptiveMaxrateKbps}k`,
          "-bufsize", `${adaptiveBufsizeKbps}k`,
          "-preset", "ultrafast",
          "-c:a", "aac",
          "-b:a", `${AUDIO_BITRATE_KBPS}k`,
          "-movflags", "+faststart",
          outputName,
        ];

  // Write video to FFmpeg virtual filesystem
  onProgress({ stage: "compressing", percent: 0, message: "Förbereder komprimering…" });
  await instance.writeFile(inputName, await fetchFile(file));

  // Register progress listener
  const handleProgress = ({ progress }: { progress: number }) => {
    const pct = Math.min(99, Math.round(progress * 100));
    onProgress({
      stage: "compressing",
      percent: pct,
      message: `Komprimerar video… ${pct}%`,
    });
  };
  instance.on("progress", handleProgress);

  // Run FFmpeg compression with either light or aggressive settings.
  try {
    await instance.exec(ffmpegArgs);
  } finally {
    instance.off("progress", handleProgress);
  }

  const data = await instance.readFile(outputName);

  // Clean up virtual filesystem
  try {
    await instance.deleteFile(inputName);
    await instance.deleteFile(outputName);
  } catch {
    // Ignore cleanup errors
  }

  onProgress({ stage: "done", percent: 100, message: "Komprimering klar." });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = new Blob([data as any], { type: "video/mp4" });
  return new File([blob], "compressed.mp4", { type: "video/mp4" });
}
