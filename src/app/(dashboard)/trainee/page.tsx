import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function TraineeDashboard() {
  const session = await withAuth(["ADMIN", "COACH", "TRAINEE"])

  const [sessionCount, registeredClasses, enrollments] = await Promise.all([
    prisma.workoutSession.count({ where: { traineeId: session.user.id } }),
    prisma.classRegistration.findMany({
      where: {
        traineeId: session.user.id,
        status: "REGISTERED",
        class: { scheduledAt: { gte: new Date() } },
      },
      include: { class: true },
      orderBy: { class: { scheduledAt: "asc" } },
      take: 5,
    }),
    prisma.programEnrollment.count({
      where: { traineeId: session.user.id, isActive: true },
    }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workouts Done</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{sessionCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{registeredClasses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{enrollments}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-4">Upcoming Classes</h2>
      <div className="space-y-2">
        {registeredClasses.length === 0 ? (
          <p className="text-muted-foreground text-sm">No upcoming classes. <a href="/trainee/classes" className="underline">Browse classes</a></p>
        ) : (
          registeredClasses.map((reg) => (
            <Card key={reg.id}>
              <CardContent className="py-4">
                <p className="font-medium">{reg.class.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(reg.class.scheduledAt).toLocaleString()} · {reg.class.durationMins} min
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
