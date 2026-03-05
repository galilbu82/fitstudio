import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateProgramSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  durationWeeks: z.number().min(1).max(52).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
        orderBy: [{ weekNumber: "asc" }, { sortOrder: "asc" }],
      },
    },
  })

  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(program)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { programId } = await params

  try {
    const body = await req.json()
    const data = updateProgramSchema.parse(body)

    const program = await prisma.trainingProgram.updateMany({
      where: { id: programId, coachId: session.user.id },
      data,
    })

    if (program.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update program" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ programId: string }> }
) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { programId } = await params

  const deleted = await prisma.trainingProgram.deleteMany({
    where: { id: programId, coachId: session.user.id },
  })

  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}
