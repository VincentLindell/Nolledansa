import { auth } from "@/auth";
import { extractGroupsFromAuthState, isAdminGroupMember } from "@/lib/admin-groups";

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return isAdminGroupMember(extractGroupsFromAuthState(session));
}
