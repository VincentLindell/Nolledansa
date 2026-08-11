function normalizeGroup(value: string) {
  return value.trim().toLowerCase();
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
