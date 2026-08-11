"use server";

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth-helpers";
import {
  resolveEditRequest,
  restoreHiddenDanceRecord,
  updateDanceStatus,
  updateSectionChantStatus,
} from "@/lib/store";

export async function approveDance(danceId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  await updateDanceStatus(danceId, "approved");

  redirect("/admin");
}

export async function rejectDance(danceId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  await updateDanceStatus(danceId, "rejected");

  redirect("/admin");
}

export async function approveEditRequest(requestId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  await resolveEditRequest(requestId, true);

  redirect("/admin");
}

export async function rejectEditRequest(requestId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  await resolveEditRequest(requestId, false);

  redirect("/admin");
}

export async function restoreHiddenDance(danceId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  await restoreHiddenDanceRecord(danceId);

  redirect("/admin?tab=hidden");
}

export async function approveSectionChant(chantId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  await updateSectionChantStatus(chantId, "approved");

  redirect("/admin");
}

export async function rejectSectionChant(chantId: string) {
  if (!(await isAdmin())) {
    throw new Error("Obehörig");
  }

  await updateSectionChantStatus(chantId, "rejected");

  redirect("/admin");
}
