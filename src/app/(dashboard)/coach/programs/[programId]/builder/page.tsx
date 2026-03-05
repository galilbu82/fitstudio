import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ProgramBuilderClient } from "./program-builder-client"

export default async function ProgramBuilderPage({
  params,
}: {
  params: Promise<{ programId: string }>
}) {
  const session = await withAuth(["ADMIN", "COACH"])
  const { programId } = await params

  const program = await prisma.trainingProgram.findUnique({
    where: { id: programId, coachId: session.user.id },
    include: {
      workouts: {
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }, { sortOrder: "asc" }],
      },
    },
  })

  if (!program) redirect("/coach/programs")

  const exercises = await prisma.exercise.findMany({
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  })

  return <ProgramBuilderClient program={program} availableExercises={exercises} />
}
