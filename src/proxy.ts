// Next.js 16 renamed "middleware.ts" to "proxy.ts" (function renamed to
// `proxy`) — confirmed by building against your actual next@16.3.4, since
// this is newer than what I was trained on. Functionality is unchanged.
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secretKey = new TextEncoder().encode(process.env.AUTH_SECRET);
const PUBLIC_PATHS = ["/login", "/api/login"];

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const signedIn = await hasValidSession(req);

  if (isPublic) {
    // Already signed in and hitting the login page -> send them to the app.
    if (pathname === "/login" && signedIn) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!signedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
