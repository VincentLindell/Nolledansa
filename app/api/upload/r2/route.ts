import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createR2ObjectKey, getR2ErrorMessage, uploadR2Object } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;

function isUploadKind(value: FormDataEntryValue | null): value is "video" | "thumbnail" {
  return value === "video" || value === "thumbnail";
}

function validateFile(kind: "video" | "thumbnail", file: File) {
  if (file.size <= 0) {
    return "Filen är tom.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return "Filen är för stor för uppladdning.";
  }

  if (kind === "video" && !file.type.startsWith("video/")) {
    return "Videofilen har fel filtyp.";
  }

  if (kind === "thumbnail" && !file.type.startsWith("image/")) {
    return "Thumbnail-filen har fel filtyp.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const kind = formData.get("kind");
    const file = formData.get("file");

    if (!isUploadKind(kind)) {
      return NextResponse.json({ error: "Ogiltig upload-typ." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Ingen fil skickades." }, { status: 400 });
    }

    const validationError = validateFile(kind, file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const key = createR2ObjectKey({
      kind,
      filename: file.name,
      ownerId: user?.id,
      danceId: formData.get("danceId")?.toString() ?? null,
      requestId: formData.get("requestId")?.toString() ?? null,
    });

    const result = await uploadR2Object({
      key,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[R2 upload] failed:", error);
    return NextResponse.json({ error: getR2ErrorMessage(error) }, { status: 500 });
  }
}
