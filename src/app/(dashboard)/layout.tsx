import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"

const coachNav = [
  { href: "/coach", label: "Dashboard" },
  { href: "/coach/programs", label: "Programs" },
  { href: "/coach/schedule", label: "Schedule" },
  { href: "/coach/trainees", label: "Trainees" },
  { href: "/leaderboard", label: "Leaderboard" },
]

const traineeNav = [
  { href: "/trainee", label: "Dashboard" },
  { href: "/trainee/classes", label: "Classes" },
  { href: "/trainee/workout", label: "My Workouts" },
  { href: "/leaderboard", label: "Leaderboard" },
]

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/coach", label: "Coach Portal" },
  { href: "/leaderboard", label: "Leaderboard" },
]

function getNav(role: string) {
  if (role === "ADMIN") return adminNav
  if (role === "COACH") return coachNav
  return traineeNav
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const navItems = getNav(session.user.role)

  return (
    <div className="flex min-h-screen">
      <Sidebar navItems={navItems} user={session.user} />
      <main className="flex-1 p-8 bg-muted/20">{children}</main>
    </div>
  )
}
