import NextAuth from "next-auth";

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function getProfileGroups(profile: Record<string, unknown>): string[] {
  const directGroups = getStringArray(profile.groups);
  if (directGroups.length > 0) return directGroups;

  const nestedGroups = getStringArray(profile["cognito:groups"]);
  if (nestedGroups.length > 0) return nestedGroups;

  return [];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "authentik",
      name: "Authentik",
      type: "oidc",
      issuer: process.env.AUTHENTIK_ISSUER ?? "https://example.invalid",
      clientId: process.env.AUTHENTIK_CLIENT_ID ?? "missing-client-id",
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET ?? "missing-client-secret",
      profile(profile) {
        const raw = profile as Record<string, unknown>;
        const groups = getProfileGroups(raw);
        return {
          id: String(raw.sub ?? raw.email ?? "unknown-user"),
          name: typeof raw.name === "string" ? raw.name : null,
          email: typeof raw.email === "string" ? raw.email : null,
          image: null,
          groups,
        };
      },
    },
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.groups = getStringArray(user.groups);
      }
      return token;
    },
    async session({ session, token }) {
      session.user.groups = getStringArray(token.groups);
      return session;
    },
  },
});
