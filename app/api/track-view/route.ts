import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { dance_id, session_id } = await request.json();

    if (!dance_id) {
      return NextResponse.json({ error: "dance_id required" }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Deduplicate quick duplicate calls (e.g. React Strict Mode dev remount)
    // for the same dance + session within the last 60 seconds.
    const dedupeSince = new Date(Date.now() - 60_000).toISOString();
    if (session_id) {
      const { data: existing } = await admin
        .from("dance_clicks")
        .select("id")
        .eq("dance_id", dance_id)
        .eq("session_id", session_id)
        .gte("created_at", dedupeSince)
        .limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json({ ok: true, deduped: true });
      }
    }

    const { error } = await admin.from("dance_clicks").insert({
      dance_id,
      user_id: user?.id ?? null,
      session_id: session_id ?? null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
