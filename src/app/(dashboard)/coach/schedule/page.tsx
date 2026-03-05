import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SCHEDULED: "default",
  IN_PROGRESS: "outline",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
}

export default async function SchedulePage() {
  const session = await withAuth(["ADMIN", "COACH"])

  const classes = await prisma.class.findMany({
    where: { coachId: session.user.id },
    include: { registrations: true },
    orderBy: { scheduledAt: "asc" },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Schedule</h1>
      {classes.length === 0 ? (
        <p className="text-muted-foreground">No classes scheduled yet.</p>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{cls.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(cls.scheduledAt).toLocaleString()} · {cls.durationMins} min
                  </p>
                  {cls.location && (
                    <p className="text-sm text-muted-foreground">{cls.location}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {cls.registrations.length}/{cls.maxCapacity}
                  </span>
                  <Badge variant={STATUS_COLORS[cls.status]}>
                    {cls.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
