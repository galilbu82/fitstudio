import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createWorkoutSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  weekNumber: z.number().min(1).optional(),
  sortOrder: z.number().default(0),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { programId } = await params

  // Verify program belongs to coach
  const program = await prisma.trainingProgram.findUnique({
    where: { id: programId, coachId: session.user.id },
  })
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const body = await req.json()
    const data = createWorkoutSchema.parse(body)

    const workout = await prisma.workout.create({
      data: { ...data, programId },
      include: {
        exercises: { include: { exercise: true } },
      },
    })

    return NextResponse.json(workout, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create workout" }, { status: 500 })
  }
}
