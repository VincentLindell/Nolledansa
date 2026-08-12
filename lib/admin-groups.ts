function normalizeGroup(value: string) {
  return value.trim().toLowerCase();
}

function toGroups(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((group): group is string => typeof group === "string");
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((group) => group.trim())
      .filter(Boolean);
  }
  return [];
}

export function extractGroupsFromAuthState(state: unknown): string[] {
  if (!state || typeof state !== "object") return [];
  const objectState = state as Record<string, unknown>;
  const fromUser = objectState.user && typeof objectState.user === "object"
    ? toGroups((objectState.user as Record<string, unknown>).groups)
    : [];
  if (fromUser.length > 0) return fromUser;

  const fromToken = objectState.token && typeof objectState.token === "object"
    ? toGroups((objectState.token as Record<string, unknown>).groups)
    : [];
  if (fromToken.length > 0) return fromToken;

  return toGroups(objectState.groups);
}

export function getAdminGroups() {
  const configured = process.env.AUTHENTIK_ADMIN_GROUPS ?? "dsek.noll.pepp";
  return configured
    .split(",")
    .map(normalizeGroup)
    .filter(Boolean);
}

export function isAdminGroupMember(userGroups: readonly string[] | null | undefined) {
  if (!userGroups || userGroups.length === 0) return false;
  const allowed = new Set(getAdminGroups());
  for (const group of userGroups) {
    if (allowed.has(normalizeGroup(group))) {
      return true;
    }
  }
  return false;
}
