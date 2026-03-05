import { Role } from "@prisma/client"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export const PERMISSIONS = {
  "users:read": ["ADMIN", "COACH"],
  "users:write": ["ADMIN"],
  "users:delete": ["ADMIN"],
  "programs:read": ["ADMIN", "COACH", "TRAINEE"],
  "programs:write": ["ADMIN", "COACH"],
  "programs:delete": ["ADMIN", "COACH"],
  "classes:read": ["ADMIN", "COACH", "TRAINEE"],
  "classes:write": ["ADMIN", "COACH"],
  "classes:delete": ["ADMIN", "COACH"],
  "workouts:log": ["TRAINEE"],
  "workouts:view-all": ["ADMIN", "COACH"],
  "leaderboard:view": ["ADMIN", "COACH", "TRAINEE"],
} as const

type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}

export async function requirePermission(permission: Permission) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!hasPermission(session.user.role as Role, permission)) {
    redirect("/unauthorized")
  }

  return session
}

export async function withAuth(allowedRoles: Role[]) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (!allowedRoles.includes(session.user.role as Role)) {
    redirect("/unauthorized")
  }

  return session
}
