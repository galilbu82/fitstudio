import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { WorkoutHistoryClient } from "./workout-history-client"

export default async function WorkoutPage() {
  const session = await withAuth(["ADMIN", "COACH", "TRAINEE"])

  const [sessions, enrolledPrograms] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { traineeId: session.user.id },
      include: {
        workout: { include: { program: { select: { name: true } } } },
        _count: { select: { exerciseLogs: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 30,
    }),
    prisma.programEnrollment.findMany({
      where: { traineeId: session.user.id, isActive: true },
      include: {
        program: {
          include: {
            workouts: {
              include: { _count: { select: { exercises: true } } },
              orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }],
            },
          },
        },
      },
    }),
  ])

  return (
    <WorkoutHistoryClient
      sessions={JSON.parse(JSON.stringify(sessions))}
      enrolledPrograms={JSON.parse(JSON.stringify(enrolledPrograms))}
    />
  )
}
