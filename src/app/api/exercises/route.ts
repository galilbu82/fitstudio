import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createExerciseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  muscleGroup: z.string().min(1),
  equipment: z.string().optional(),
  instructions: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const muscleGroup = searchParams.get("muscleGroup")
  const search = searchParams.get("search")

  const exercises = await prisma.exercise.findMany({
    where: {
      ...(muscleGroup && { muscleGroup }),
      ...(search && {
        name: { contains: search, mode: "insensitive" },
      }),
    },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  })

  return NextResponse.json(exercises)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = createExerciseSchema.parse(body)

    const exercise = await prisma.exercise.create({ data })
    return NextResponse.json(exercise, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Exercise name already exists" }, { status: 409 })
  }
}
