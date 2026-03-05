import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, Calendar, Dumbbell, TrendingUp } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

export default async function TraineeDashboard() {
  const session = await withAuth(["ADMIN", "COACH", "TRAINEE"])

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [totalWorkouts, weekWorkouts, volumeAgg, upcomingClasses, achievements] =
    await Promise.all([
      prisma.workoutSession.count({
        where: { traineeId: session.user.id, completedAt: { not: null } },
      }),
      prisma.workoutSession.count({
        where: { traineeId: session.user.id, completedAt: { not: null }, startedAt: { gte: weekAgo } },
      }),
      prisma.exerciseLog.aggregate({
        where: { traineeId: session.user.id, weight: { not: null } },
        _sum: { weight: true },
      }),
      prisma.classRegistration.findMany({
        where: {
          traineeId: session.user.id,
          status: "REGISTERED",
          class: { scheduledAt: { gte: new Date() }, status: "SCHEDULED" },
        },
        include: {
          class: { include: { coach: { include: { profile: true } }, workout: true } },
        },
        orderBy: { class: { scheduledAt: "asc" } },
        take: 5,
      }),
      prisma.userAchievement.findMany({
        where: { userId: session.user.id },
        include: { achievement: true },
        orderBy: { earnedAt: "desc" },
        take: 6,
      }),
    ])

  const totalVolume = Math.round((volumeAgg._sum.weight ?? 0) / 1000)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground text-sm">Track your fitness journey</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Workouts</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalWorkouts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{weekWorkouts}</p>
            <p className="text-xs text-muted-foreground">workouts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalVolume}k</p>
            <p className="text-xs text-muted-foreground">kg lifted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{upcomingClasses.length}</p>
            <p className="text-xs text-muted-foreground">classes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Classes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/trainee/classes">Browse all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingClasses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No upcoming classes.</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href="/trainee/classes">Browse Classes</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingClasses.map((reg) => {
                  const coachName = reg.class.coach.profile
                    ? `${reg.class.coach.profile.firstName} ${reg.class.coach.profile.lastName}`
                    : reg.class.coach.email
                  return (
                    <div key={reg.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{reg.class.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(reg.class.scheduledAt), "EEE MMM d, h:mm a")} · {coachName}
                        </p>
                      </div>
                      <Badge variant="secondary">{reg.class.durationMins}m</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Achievements</CardTitle>
            <span className="text-sm text-muted-foreground">{achievements.length} earned</span>
          </CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">Complete workouts to earn achievements!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {achievements.map((ua) => (
                  <div key={ua.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <p className="text-xs font-medium">{ua.achievement.name}</p>
                      <p className="text-xs text-muted-foreground">{ua.achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
