import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const addExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  targetSets: z.number().min(1).max(20).default(3),
  targetReps: z.string().default("10"),
  restSeconds: z.number().min(0).max(600).optional(),
  notes: z.string().optional(),
  sortOrder: z.number().default(0),
})

async function verifyCoachOwnsWorkout(workoutId: string, coachId: string) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { program: true },
  })
  return workout?.program.coachId === coachId ? workout : null
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workoutId } = await params
  const workout = await verifyCoachOwnsWorkout(workoutId, session.user.id)
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const body = await req.json()
    const data = addExerciseSchema.parse(body)

    const workoutExercise = await prisma.workoutExercise.create({
      data: { ...data, workoutId },
      include: { exercise: true },
    })

    return NextResponse.json(workoutExercise, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    // Handle duplicate (exercise already in workout)
    return NextResponse.json({ error: "Exercise already in workout" }, { status: 409 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workoutId } = await params
  const workout = await verifyCoachOwnsWorkout(workoutId, session.user.id)
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Reorder exercises: expects { exercises: [{id, sortOrder}] }
  const { exercises } = await req.json()

  await Promise.all(
    exercises.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
      prisma.workoutExercise.update({ where: { id }, data: { sortOrder } })
    )
  )

  return NextResponse.json({ success: true })
}
