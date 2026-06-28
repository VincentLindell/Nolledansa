"use server";

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { DanceEditRequest, DanceEditRequestSegment } from "@/lib/types";

export async function approveDance(danceId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("dances")
    .update({ status: "approved" })
    .eq("id", danceId);

  if (error) throw new Error(error.message);

  redirect("/admin");
}

export async function rejectDance(danceId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  const admin = createAdminClient();

  // Ta bort segment först (kaskad gör detta, men vi är explicita)
  await admin.from("dance_segments").delete().eq("dance_id", danceId);

  // Sätt status till rejected (vi sparar dansen men visar den inte)
  const { error } = await admin
    .from("dances")
    .update({ status: "rejected" })
    .eq("id", danceId);

  if (error) throw new Error(error.message);

  redirect("/admin");
}

export async function approveEditRequest(requestId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  const admin = createAdminClient();

  const [requestResult, requestSegmentsResult] = await Promise.all([
    admin.from("dance_edit_requests").select("*").eq("id", requestId).single(),
    admin
      .from("dance_edit_request_segments")
      .select("*")
      .eq("request_id", requestId)
      .order("sort_order", { ascending: true }),
  ]);

  if (requestResult.error || !requestResult.data) {
    throw new Error("Kunde inte hitta ändringsförslaget.");
  }

  const request = requestResult.data as DanceEditRequest;
  const requestSegments = (requestSegmentsResult.data ?? []) as DanceEditRequestSegment[];

  const { error: danceUpdateError } = await admin
    .from("dances")
    .update({
      title: request.title,
      section: request.section,
      year: request.year,
      song_title: request.song_title,
      dancer_names: request.dancer_names ?? "",
      artist: request.artist,
      spotify_url: request.spotify_url,
      thumbnail_url: request.thumbnail_url,
    })
    .eq("id", request.dance_id);

  if (danceUpdateError) throw new Error(danceUpdateError.message);

  const { error: deleteSegmentsError } = await admin
    .from("dance_segments")
    .delete()
    .eq("dance_id", request.dance_id);

  if (deleteSegmentsError) throw new Error(deleteSegmentsError.message);

  if (requestSegments.length > 0) {
    const { error: insertSegmentsError } = await admin.from("dance_segments").insert(
      requestSegments.map((segment, index) => ({
        dance_id: request.dance_id,
        name: segment.name,
        description: segment.description,
        start_time: segment.start_time,
        end_time: segment.end_time,
        sort_order: index,
      }))
    );

    if (insertSegmentsError) throw new Error(insertSegmentsError.message);
  }

  const { error: requestUpdateError } = await admin
    .from("dance_edit_requests")
    .update({
      status: "approved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (requestUpdateError) throw new Error(requestUpdateError.message);

  redirect("/admin");
}

export async function rejectEditRequest(requestId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("dance_edit_requests")
    .update({
      status: "rejected",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) throw new Error(error.message);

  redirect("/admin");
}

export async function approveSectionChant(chantId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("section_chants")
    .update({ status: "approved" })
    .eq("id", chantId);

  if (error) throw new Error(error.message);

  redirect("/admin");
}

export async function rejectSectionChant(chantId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("section_chants")
    .update({ status: "rejected" })
    .eq("id", chantId);

  if (error) throw new Error(error.message);

  redirect("/admin");
}
