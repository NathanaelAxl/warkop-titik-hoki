import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Halaman khusus owner (API tetap dicek ulang di backend)
const OWNER_PAGES = ["/admin", "/reports"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sess = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return sess ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }
  if (!sess) return NextResponse.redirect(new URL("/login", req.url));
  if (OWNER_PAGES.some((p) => pathname.startsWith(p)) && sess.role !== "owner") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Semua halaman kecuali API, aset statis, dan file publik
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
