import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createProgramSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  durationWeeks: z.number().min(1).max(52).default(4),
  isPublic: z.boolean().default(false),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const programs = await prisma.trainingProgram.findMany({
    where: { coachId: session.user.id },
    include: {
      _count: { select: { workouts: true, enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(programs)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = createProgramSchema.parse(body)

    const program = await prisma.trainingProgram.create({
      data: { ...data, coachId: session.user.id },
    })

    return NextResponse.json(program, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 })
  }
}
