import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function HomePage() {
  const session = await auth()

  if (session?.user) {
    const role = session.user.role
    if (role === "ADMIN") redirect("/admin")
    if (role === "COACH") redirect("/coach")
    redirect("/trainee")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20">
      <div className="text-center space-y-6 max-w-lg px-4">
        <h1 className="text-5xl font-bold">FitStudio</h1>
        <p className="text-xl text-muted-foreground">
          Gym Studio Management &amp; Training Tracker
        </p>
        <p className="text-muted-foreground">
          Manage programs, schedule classes, track workouts, and compete on leaderboards.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
