import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { isAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Dance,
  DanceEditRequest,
  DanceEditRequestSegment,
  DanceSegment,
} from "@/lib/types";
import { formatTime, sectionLabel } from "@/lib/utils";
import { approveEditRequest, rejectEditRequest } from "../../actions";

export const metadata: Metadata = { title: "Granska ändringsförslag – NolleDansa" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function segmentKey(segment: { name: string; start_time: number; end_time: number }) {
  return `${segment.name}::${segment.start_time}::${segment.end_time}`;
}

export default async function AdminEditRequestPage({ params }: PageProps) {
  const admin = await isAdmin();
  if (!admin) redirect("/admin");

  const { id } = await params;
  const supabase = createAdminClient();

  const [requestResult, requestSegmentsResult] = await Promise.all([
    supabase.from("dance_edit_requests").select("*").eq("id", id).single(),
    supabase
      .from("dance_edit_request_segments")
      .select("*")
      .eq("request_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (requestResult.error || !requestResult.data) notFound();

  const request = requestResult.data as DanceEditRequest;
  const proposedSegments = (requestSegmentsResult.data ?? []) as DanceEditRequestSegment[];

  const [danceResult, currentSegmentsResult] = await Promise.all([
    supabase.from("dances").select("*").eq("id", request.dance_id).single(),
    supabase
      .from("dance_segments")
      .select("*")
      .eq("dance_id", request.dance_id)
      .order("sort_order", { ascending: true }),
  ]);

  if (danceResult.error || !danceResult.data) notFound();

  const dance = danceResult.data as Dance;
  const currentSegments = (currentSegmentsResult.data ?? []) as DanceSegment[];

  const currentKeys = new Set(currentSegments.map(segmentKey));
  const proposedKeys = new Set(proposedSegments.map(segmentKey));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Tillbaka till admin
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ändringsförslag</h1>
            <p className="text-sm text-gray-500 mt-1">
              För dansen {sectionLabel(dance.section, dance.year)} · {dance.title}
            </p>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
            {request.status === "pending"
              ? "Väntar"
              : request.status === "approved"
                ? "Godkänd"
                : "Nekad"}
          </span>
        </div>

        {request.requester_note && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Kommentar från användare</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.requester_note}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4 space-y-2">
            <p className="text-xs text-gray-500">Nuvarande info</p>
            <p className="text-sm text-gray-800"><span className="font-medium">Titel:</span> {dance.title}</p>
            <p className="text-sm text-gray-800"><span className="font-medium">Sektion/år:</span> {sectionLabel(dance.section, dance.year)}</p>
            <p className="text-sm text-gray-800"><span className="font-medium">Vilka dansar:</span> {dance.dancer_names}</p>
            <p className="text-sm text-gray-800"><span className="font-medium">Låt:</span> {dance.song_title}{dance.artist ? ` · ${dance.artist}` : ""}</p>
          </div>

          <div className="border border-blue-200 rounded-lg p-4 space-y-2 bg-blue-50/40">
            <p className="text-xs text-blue-700">Föreslagen info</p>
            <p className="text-sm text-gray-800"><span className="font-medium">Titel:</span> {request.title}</p>
            <p className="text-sm text-gray-800"><span className="font-medium">Sektion/år:</span> {sectionLabel(request.section, request.year)}</p>
            <p className="text-sm text-gray-800"><span className="font-medium">Vilka dansar:</span> {request.dancer_names}</p>
            <p className="text-sm text-gray-800"><span className="font-medium">Låt:</span> {request.song_title}{request.artist ? ` · ${request.artist}` : ""}</p>
            <div className="pt-2">
              <p className="text-xs text-blue-700 mb-2">Thumbnail</p>
              {request.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={request.thumbnail_url}
                  alt="Föreslagen thumbnail"
                  className="w-full max-h-44 object-cover rounded-lg border border-blue-200"
                />
              ) : (
                <p className="text-sm text-gray-500">Ingen ny thumbnail föreslagen.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Nuvarande dansdelar</h2>
          <div className="space-y-2">
            {currentSegments.map((segment) => {
              const removed = !proposedKeys.has(segmentKey(segment));
              return (
                <div
                  key={segment.id}
                  className={`border rounded-lg px-3 py-2 text-sm ${
                    removed
                      ? "border-red-200 bg-red-50"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-800">{segment.name}</span>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {formatTime(segment.start_time)} – {formatTime(segment.end_time)}
                    </span>
                  </div>
                  {removed && (
                    <p className="text-xs text-red-700 mt-1">Tas bort i förslaget</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-blue-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Föreslagna dansdelar</h2>
          <div className="space-y-2">
            {proposedSegments.map((segment) => {
              const added = !currentKeys.has(segmentKey(segment));
              return (
                <div
                  key={segment.id}
                  className={`border rounded-lg px-3 py-2 text-sm ${
                    added
                      ? "border-green-200 bg-green-50"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-800">{segment.name}</span>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {formatTime(segment.start_time)} – {formatTime(segment.end_time)}
                    </span>
                  </div>
                  {added && (
                    <p className="text-xs text-green-700 mt-1">Ny eller ändrad del</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {request.status === "pending" && (
        <div className="flex gap-3">
          <form
            action={async () => {
              "use server";
              await approveEditRequest(request.id);
            }}
            className="flex-1"
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl text-sm transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Godkänn ändring
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await rejectEditRequest(request.id);
            }}
            className="flex-1"
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium py-3 rounded-xl text-sm transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Neka ändring
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
