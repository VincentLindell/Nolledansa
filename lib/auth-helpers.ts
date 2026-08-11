import { auth } from "@/auth";
import { isAdminGroupMember } from "@/lib/admin-groups";

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return isAdminGroupMember(session?.user?.groups);
}
