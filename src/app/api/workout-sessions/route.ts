import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const startSessionSchema = z.object({
  workoutId: z.string().min(1),
  classId: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const data = startSessionSchema.parse(body)

    // Verify workout exists
    const workout = await prisma.workout.findUnique({ where: { id: data.workoutId } })
    if (!workout) return NextResponse.json({ error: "Workout not found" }, { status: 404 })

    const workoutSession = await prisma.workoutSession.create({
      data: {
        traineeId: session.user.id,
        workoutId: data.workoutId,
        classId: data.classId,
      },
    })

    return NextResponse.json(workoutSession, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to start session" }, { status: 500 })
  }
}
