import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractGroupsFromAuthState, isAdminGroupMember } from "@/lib/admin-groups";

export default auth((request) => {
  const groups = extractGroupsFromAuthState(request.auth);
  const isAllowedAdmin = isAdminGroupMember(groups);

  if (!isAllowedAdmin && request.nextUrl.pathname !== "/admin") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
