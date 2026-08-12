import { auth } from "@/auth";

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user);
}
