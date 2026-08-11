import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminEmails } from "@/lib/admin-emails";

export default auth((request) => {
  const email = request.auth?.user?.email?.toLowerCase();
  const allowed = getAdminEmails();
  const isAllowedAdmin = Boolean(email) && allowed.includes(email!);

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
