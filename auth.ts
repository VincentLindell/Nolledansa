import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "authentik",
      name: "Authentik",
      type: "oidc",
      issuer: process.env.AUTHENTIK_ISSUER ?? "https://example.invalid",
      clientId: process.env.AUTHENTIK_CLIENT_ID ?? "missing-client-id",
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET ?? "missing-client-secret",
    },
  ],
  session: {
    strategy: "jwt",
  },
});
