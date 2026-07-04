import { getR2Object } from "@/lib/r2";

export const runtime = "nodejs";

function isSafeObjectKey(key: string) {
  return !!key && !key.startsWith("/") && !key.includes("..") && !key.includes("\\");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!key || !isSafeObjectKey(key)) {
    return new Response("Invalid R2 object key", { status: 400 });
  }

  try {
    const object = await getR2Object({
      key,
      range: request.headers.get("range"),
    });

    const headers = new Headers();
    if (object.ContentType) headers.set("content-type", object.ContentType);
    if (object.ContentLength !== undefined) headers.set("content-length", String(object.ContentLength));
    if (object.ContentRange) headers.set("content-range", object.ContentRange);
    if (object.AcceptRanges) headers.set("accept-ranges", object.AcceptRanges);
    if (object.CacheControl) headers.set("cache-control", object.CacheControl);
    headers.set("etag", object.ETag ?? "");

    return new Response(object.Body?.transformToWebStream(), {
      status: object.ContentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error("[R2 object] failed:", error);
    return new Response("Could not fetch R2 object", { status: 404 });
  }
}
