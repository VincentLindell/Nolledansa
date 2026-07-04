import "server-only";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type UploadKind = "video" | "thumbnail";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

export function getR2ErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "R2-uppladdningen misslyckades.";
  }

  const code = "Code" in error && typeof error.Code === "string" ? error.Code : undefined;
  const name = error.name;

  if (name === "SignatureDoesNotMatch" || code === "SignatureDoesNotMatch") {
    return (
      "R2 kunde inte verifiera signaturen. Kontrollera att CLOUDFLARE_R2_ACCOUNT_ID, " +
      "CLOUDFLARE_R2_ACCESS_KEY_ID och CLOUDFLARE_R2_SECRET_ACCESS_KEY kommer från samma " +
      "Cloudflare R2 Access Key, och att token har Object Read & Write för rätt bucket."
    );
  }

  if (name === "InvalidAccessKeyId" || code === "InvalidAccessKeyId") {
    return "R2 access key är ogiltig. Kontrollera CLOUDFLARE_R2_ACCESS_KEY_ID.";
  }

  if (name === "NoSuchBucket" || code === "NoSuchBucket") {
    return "R2-bucketen hittades inte. Kontrollera CLOUDFLARE_R2_BUCKET_NAME.";
  }

  return error.message || "R2-uppladdningen misslyckades.";
}

function getR2BucketName() {
  return requireEnv("CLOUDFLARE_R2_BUCKET_NAME");
}

function getR2Client() {
  const accountId = requireEnv("CLOUDFLARE_R2_ACCOUNT_ID");
  const endpoint =
    process.env.CLOUDFLARE_R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    },
  });
}

function cleanExtension(filename: string, fallback: string) {
  const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || fallback;
}

export function createR2ObjectKey(params: {
  kind: UploadKind;
  filename: string;
  ownerId?: string | null;
  danceId?: string | null;
  requestId?: string | null;
}) {
  const ext = cleanExtension(params.filename, params.kind === "video" ? "mp4" : "jpg");
  const owner = params.ownerId ?? "anonymous";
  const date = new Date().toISOString().slice(0, 10);
  const id = crypto.randomUUID();

  if (params.kind === "thumbnail" && params.danceId && params.requestId) {
    return `thumbnails/edits/${params.danceId}/${params.requestId}-${id}.${ext}`;
  }

  return `${params.kind}s/${owner}/${date}/${Date.now()}-${id}.${ext}`;
}

export function getR2ObjectUrl(key: string) {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/+$/, "");
  if (publicUrl) {
    return `${publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  return `/api/r2/object?key=${encodeURIComponent(key)}`;
}

export async function uploadR2Object(params: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key: params.key,
    url: getR2ObjectUrl(params.key),
  };
}

export async function getR2Object(params: {
  key: string;
  range?: string | null;
}) {
  return getR2Client().send(
    new GetObjectCommand({
      Bucket: getR2BucketName(),
      Key: params.key,
      Range: params.range ?? undefined,
    })
  );
}
