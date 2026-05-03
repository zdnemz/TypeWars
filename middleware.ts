import { auth } from "@/auth"
import { NextResponse } from "next/server"

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/leaderboard"]
const PUBLIC_ROUTE_PREFIXES = ["/profile/"]
const API_AUTH_PREFIX = "/api/auth"

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const pathname = nextUrl.pathname

  // Always allow auth API routes
  if (pathname.startsWith(API_AUTH_PREFIX)) {
    return NextResponse.next()
  }

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  // Allow public profile pages /profile/[username]
  for (const prefix of PUBLIC_ROUTE_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next()
    }
  }

  // Redirect unauthenticated users to login
  if (!session) {
    const loginUrl = new URL("/login", nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
