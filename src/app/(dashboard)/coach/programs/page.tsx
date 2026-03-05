import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { ProgramsClient } from "./programs-client"

export default async function ProgramsPage() {
  const session = await withAuth(["ADMIN", "COACH"])

  const programs = await prisma.trainingProgram.findMany({
    where: { coachId: session.user.id },
    include: { _count: { select: { workouts: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  })

  return <ProgramsClient programs={programs} />
}
