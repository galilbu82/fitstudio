import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const protectedRoutes = ["/admin", "/coach", "/trainee", "/leaderboard"]

const roleRoutes: Record<string, string[]> = {
  "/admin": ["ADMIN"],
  "/coach": ["ADMIN", "COACH"],
  "/trainee": ["ADMIN", "COACH", "TRAINEE"],
  "/leaderboard": ["ADMIN", "COACH", "TRAINEE"],
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtected && !session) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  for (const [route, roles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route)) {
      const userRole = session?.user?.role
      if (!userRole || !roles.includes(userRole)) {
        return NextResponse.redirect(new URL("/unauthorized", req.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
}
