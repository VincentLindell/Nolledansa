import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((request) => {
  const isAllowedAdmin = Boolean(request.auth?.user);

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
