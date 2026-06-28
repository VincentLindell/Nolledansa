import { createClient } from "./server";
import { getAdminEmails } from "@/lib/admin-emails";

/**
 * Returns true if the currently authenticated user is an admin.
 * Admins are defined by the ADMIN_EMAILS env var (comma-separated list).
 *
 * Example .env.local:
 *   ADMIN_EMAILS=vincent@example.com,other@example.com
 */
export async function isAdmin(): Promise<boolean> {
  const allowed = getAdminEmails();
  if (allowed.length === 0) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return false;
  return allowed.includes(user.email.toLowerCase());
}
