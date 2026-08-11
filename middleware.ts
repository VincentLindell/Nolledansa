import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminGroupMember } from "@/lib/admin-groups";

export default auth((request) => {
  const isAllowedAdmin = isAdminGroupMember(request.auth?.user?.groups);

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
