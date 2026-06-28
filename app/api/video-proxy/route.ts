export const runtime = "nodejs";

function isAllowedVideoUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const incomingUrl = new URL(request.url);
  const target = incomingUrl.searchParams.get("url");

  if (!target || !isAllowedVideoUrl(target)) {
    return new Response("Invalid video url", { status: 400 });
  }

  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) {
    headers.set("range", range);
  }

  const upstream = await fetch(target, {
    headers,
    cache: "no-store",
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Could not fetch video", { status: upstream.status });
  }

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) responseHeaders.set("content-length", contentLength);
  const acceptRanges = upstream.headers.get("accept-ranges");
  if (acceptRanges) responseHeaders.set("accept-ranges", acceptRanges);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) responseHeaders.set("content-range", contentRange);
  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) responseHeaders.set("cache-control", cacheControl);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}