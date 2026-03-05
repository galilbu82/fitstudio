import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const slotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isActive: z.boolean().default(true),
})

const availabilitySchema = z.object({
  slots: z.array(slotSchema),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const slots = await prisma.coachAvailability.findMany({
    where: { coachId: session.user.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })

  return NextResponse.json(slots)
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { slots } = availabilitySchema.parse(body)

    // Replace all slots for this coach
    await prisma.coachAvailability.deleteMany({ where: { coachId: session.user.id } })

    if (slots.length > 0) {
      await prisma.coachAvailability.createMany({
        data: slots.map((s) => ({ ...s, coachId: session.user.id })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to save availability" }, { status: 500 })
  }
}
