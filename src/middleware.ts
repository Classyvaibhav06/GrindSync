import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // If logged-in user hits the landing page ("/"), send them straight to /home
  if (pathname === "/" && token) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // If a logged-in user visits /login or /register, send them to /home
  if ((pathname === "/login" || pathname === "/register") && token) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run on the routes we care about – avoids running on API, _next static assets, etc.
  matcher: ["/", "/login", "/register"],
};
