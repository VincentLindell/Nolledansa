import { POST as uploadPost } from "@/app/api/upload/r2/route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return uploadPost(request);
}
