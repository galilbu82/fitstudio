import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateClassSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  maxCapacity: z.number().min(1).optional(),
  location: z.string().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { classId } = await params

  try {
    const body = await req.json()
    const data = updateClassSchema.parse(body)

    const updated = await prisma.class.updateMany({
      where: { id: classId, coachId: session.user.id },
      data,
    })

    if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { classId } = await params

  // Soft delete — set to CANCELLED
  const updated = await prisma.class.updateMany({
    where: { id: classId, coachId: session.user.id },
    data: { status: "CANCELLED" },
  })

  if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true })
}
