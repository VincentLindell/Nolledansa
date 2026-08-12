function normalizeText(value: string) {
  return value.trim();
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").map(normalizeText).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map(normalizeText)
      .filter(Boolean);
  }
  return [];
}

function extractFromObject(obj: Record<string, unknown>) {
  const candidateKeys = [
    "groups",
    "group",
    "roles",
    "role",
    "ak_groups",
    "cognito:groups",
  ];

  for (const key of candidateKeys) {
    const values = toArray(obj[key]);
    if (values.length > 0) return values;
  }

  return [];
}

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4);
    const json = atob(padded);
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getGroupsFromClaims(source: unknown): string[] {
  if (!source || typeof source !== "object") return [];
  return extractFromObject(source as Record<string, unknown>);
}

export function getGroupsFromJwtString(token: string | undefined | null): string[] {
  if (!token) return [];
  const payload = decodeJwtPayload(token);
  if (!payload) return [];
  return extractFromObject(payload);
}
