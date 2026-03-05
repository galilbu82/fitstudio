import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function ClassesPage() {
  const session = await withAuth(["ADMIN", "COACH", "TRAINEE"])

  const classes = await prisma.class.findMany({
    where: {
      scheduledAt: { gte: new Date() },
      status: "SCHEDULED",
    },
    include: {
      coach: { include: { profile: true } },
      registrations: { where: { status: "REGISTERED" } },
      _count: { select: { registrations: true } },
    },
    orderBy: { scheduledAt: "asc" },
  })

  const myRegistrations = await prisma.classRegistration.findMany({
    where: { traineeId: session.user.id, status: "REGISTERED" },
    select: { classId: true },
  })
  const myClassIds = new Set(myRegistrations.map((r) => r.classId))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Available Classes</h1>
      {classes.length === 0 ? (
        <p className="text-muted-foreground">No upcoming classes scheduled.</p>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => {
            const spotsLeft = cls.maxCapacity - cls.registrations.length
            const isRegistered = myClassIds.has(cls.id)
            const coachName = cls.coach.profile
              ? `${cls.coach.profile.firstName} ${cls.coach.profile.lastName}`
              : cls.coach.email

            return (
              <Card key={cls.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{cls.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(cls.scheduledAt).toLocaleString()} · {cls.durationMins} min
                    </p>
                    <p className="text-sm text-muted-foreground">Coach: {coachName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {spotsLeft} spots left
                    </span>
                    {isRegistered ? (
                      <Badge variant="default">Registered</Badge>
                    ) : spotsLeft > 0 ? (
                      <Badge variant="outline">Open</Badge>
                    ) : (
                      <Badge variant="secondary">Full</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
