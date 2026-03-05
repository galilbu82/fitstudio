import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { ClassesClient } from "./classes-client"
import { startOfWeek, endOfWeek, addWeeks } from "date-fns"

export default async function ClassesPage() {
  const session = await withAuth(["ADMIN", "COACH", "TRAINEE"])
  const now = new Date()

  const [classes, myRegistrations] = await Promise.all([
    prisma.class.findMany({
      where: {
        scheduledAt: { gte: now, lte: endOfWeek(addWeeks(now, 4)) },
        status: "SCHEDULED",
      },
      include: {
        coach: { include: { profile: true } },
        workout: true,
        registrations: { where: { status: { in: ["REGISTERED", "WAITLISTED"] } } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.classRegistration.findMany({
      where: {
        traineeId: session.user.id,
        status: { in: ["REGISTERED", "WAITLISTED"] },
      },
      select: { classId: true, status: true },
    }),
  ])

  return (
    <ClassesClient
      classes={JSON.parse(JSON.stringify(classes))}
      myRegistrations={myRegistrations}
      userId={session.user.id}
    />
  )
}
