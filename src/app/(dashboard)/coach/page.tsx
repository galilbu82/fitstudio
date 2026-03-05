import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function CoachDashboard() {
  const session = await withAuth(["ADMIN", "COACH"])

  const [programCount, upcomingClasses, traineeCount] = await Promise.all([
    prisma.trainingProgram.count({ where: { coachId: session.user.id } }),
    prisma.class.findMany({
      where: {
        coachId: session.user.id,
        scheduledAt: { gte: new Date() },
        status: "SCHEDULED",
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { registrations: true },
    }),
    prisma.classRegistration.groupBy({
      by: ["traineeId"],
      where: {
        class: { coachId: session.user.id },
        status: "REGISTERED",
      },
    }).then((r) => r.length),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Coach Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{programCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{upcomingClasses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Trainees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{traineeCount}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-4">Upcoming Classes</h2>
      <div className="space-y-2">
        {upcomingClasses.length === 0 ? (
          <p className="text-muted-foreground text-sm">No upcoming classes scheduled.</p>
        ) : (
          upcomingClasses.map((cls) => (
            <Card key={cls.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{cls.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(cls.scheduledAt).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {cls.registrations.length}/{cls.maxCapacity} registered
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
