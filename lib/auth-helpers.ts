import { auth } from "@/auth";
import { getAdminEmails } from "@/lib/admin-emails";

export async function isAdmin(): Promise<boolean> {
  const allowed = getAdminEmails();
  if (allowed.length === 0) return false;

  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!email) return false;
  return allowed.includes(email);
}
