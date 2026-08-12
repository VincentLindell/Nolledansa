import NextAuth from "next-auth";
import { getGroupsFromClaims, getGroupsFromJwtString } from "@/lib/auth-group-extractor";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
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
        const groups = getGroupsFromClaims(raw);
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
    async jwt({ token, user, profile, account }) {
      const fromUser = user?.groups ?? [];
      const fromProfile = getGroupsFromClaims(profile);
      const fromIdToken = getGroupsFromJwtString(account?.id_token);
      const fromAccessToken = getGroupsFromJwtString(account?.access_token);

      const merged = Array.from(
        new Set([
          ...fromUser,
          ...fromProfile,
          ...fromIdToken,
          ...fromAccessToken,
          ...(Array.isArray(token.groups) ? token.groups : []),
        ])
      );

      if (merged.length > 0) {
        token.groups = merged;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.groups = Array.isArray(token.groups)
        ? token.groups.filter((group): group is string => typeof group === "string")
        : [];
      return session;
    },
  },
});
