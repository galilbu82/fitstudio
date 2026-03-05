import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function WorkoutPage() {
  const session = await withAuth(["ADMIN", "COACH", "TRAINEE"])

  const sessions = await prisma.workoutSession.findMany({
    where: { traineeId: session.user.id },
    include: {
      workout: true,
      _count: { select: { exerciseLogs: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 20,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Workouts</h1>
      {sessions.length === 0 ? (
        <p className="text-muted-foreground">No workout sessions yet. Register for a class to get started!</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{s.workout.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span>{new Date(s.startedAt).toLocaleDateString()}</span>
                  <span>{s._count.exerciseLogs} sets logged</span>
                  {s.rating && <span>Rating: {s.rating}/5</span>}
                  {s.completedAt ? (
                    <span className="text-green-600">Completed</span>
                  ) : (
                    <span className="text-yellow-600">In progress</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
