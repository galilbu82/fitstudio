import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const logSchema = z.object({
  exerciseId: z.string().min(1),
  setNumber: z.number().min(1),
  weight: z.number().min(0),
  reps: z.number().min(1),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { sessionId } = await params

  const workoutSession = await prisma.workoutSession.findUnique({
    where: { id: sessionId, traineeId: session.user.id },
  })

  if (!workoutSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  if (workoutSession.completedAt) {
    return NextResponse.json({ error: "Session already completed" }, { status: 400 })
  }

  const body = await req.json()
  const data = logSchema.parse(body)

  const log = await prisma.exerciseLog.upsert({
    where: {
      workoutSessionId_exerciseId_setNumber: {
        workoutSessionId: sessionId,
        exerciseId: data.exerciseId,
        setNumber: data.setNumber,
      },
    },
    create: {
      workoutSessionId: sessionId,
      exerciseId: data.exerciseId,
      traineeId: session.user.id,
      setNumber: data.setNumber,
      weight: data.weight,
      reps: data.reps,
      rpe: data.rpe,
      notes: data.notes,
    },
    update: {
      weight: data.weight,
      reps: data.reps,
      rpe: data.rpe,
      notes: data.notes,
    },
  })

  return NextResponse.json(log)
}
