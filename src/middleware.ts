import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  // Explicitly set secureCookie based on production environment
  // This solves getToken() failing to infer HTTPS on Vercel deployments
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });
  
  // Fallback direct cookie check just in case (sometimes environment variables like NEXTAUTH_URL are missing)
  const isAuth = !!token || req.cookies.has("__Secure-next-auth.session-token") || req.cookies.has("next-auth.session-token");

  const { pathname } = req.nextUrl;

  // If logged-in user hits the landing page ("/"), send them straight to /home
  if (pathname === "/" && isAuth) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // If a logged-in user visits /login or /register, send them to /home
  if ((pathname === "/login" || pathname === "/register") && isAuth) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run on the routes we care about – avoids running on API, _next static assets, etc.
  matcher: ["/", "/login", "/register"],
};
