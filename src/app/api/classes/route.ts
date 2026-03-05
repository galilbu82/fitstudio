import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createClassSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  workoutId: z.string().optional(),
  scheduledAt: z.string().datetime(),
  durationMins: z.number().min(15).max(180).default(60),
  maxCapacity: z.number().min(1).max(50).default(10),
  location: z.string().optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const coachId = searchParams.get("coachId")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const classes = await prisma.class.findMany({
    where: {
      ...(coachId ? { coachId } : {}),
      ...(from && to
        ? { scheduledAt: { gte: new Date(from), lte: new Date(to) } }
        : {}),
      status: { not: "CANCELLED" },
    },
    include: {
      coach: { include: { profile: true } },
      workout: true,
      registrations: { where: { status: "REGISTERED" } },
    },
    orderBy: { scheduledAt: "asc" },
  })

  return NextResponse.json(classes)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = createClassSchema.parse(body)

    const newClass = await prisma.class.create({
      data: {
        coachId: session.user.id,
        ...data,
        scheduledAt: new Date(data.scheduledAt),
      },
      include: {
        workout: true,
        registrations: true,
      },
    })

    return NextResponse.json(newClass, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
  }
}
