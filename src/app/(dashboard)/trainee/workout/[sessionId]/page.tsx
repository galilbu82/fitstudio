import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { WorkoutSessionClient } from "./workout-session-client"

export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const session = await withAuth(["ADMIN", "COACH", "TRAINEE"])
  const { sessionId } = await params

  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id: sessionId, traineeId: session.user.id },
    include: {
      workout: {
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      exerciseLogs: {
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
      },
    },
  })

  if (!workoutSession) redirect("/trainee/workout")

  // Previous session for reference weights
  const previousSession = await prisma.workoutSession.findFirst({
    where: {
      traineeId: session.user.id,
      workoutId: workoutSession.workoutId,
      completedAt: { not: null },
      id: { not: sessionId },
    },
    orderBy: { completedAt: "desc" },
    include: { exerciseLogs: true },
  })

  return (
    <WorkoutSessionClient
      workoutSession={JSON.parse(JSON.stringify(workoutSession))}
      previousLogs={JSON.parse(JSON.stringify(previousSession?.exerciseLogs ?? []))}
    />
  )
}
