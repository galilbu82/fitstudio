import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { CoachScheduleClient } from "./coach-schedule-client"
import { startOfWeek, endOfWeek } from "date-fns"

export default async function SchedulePage() {
  const session = await withAuth(["ADMIN", "COACH"])

  const now = new Date()
  const from = startOfWeek(now)
  const to = endOfWeek(now)

  const [classes, workouts] = await Promise.all([
    prisma.class.findMany({
      where: {
        coachId: session.user.id,
        scheduledAt: { gte: from, lte: to },
        status: { not: "CANCELLED" },
      },
      include: { registrations: { where: { status: "REGISTERED" } }, workout: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.workout.findMany({
      where: { program: { coachId: session.user.id } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <CoachScheduleClient
      initialClasses={JSON.parse(JSON.stringify(classes))}
      workouts={workouts}
    />
  )
}
