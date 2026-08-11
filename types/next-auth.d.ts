import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      groups: string[];
    };
  }

  interface User {
    groups?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    groups?: string[];
  }
}
