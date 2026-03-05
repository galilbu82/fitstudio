import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { classId } = await params

  const classItem = await prisma.class.findUnique({
    where: { id: classId },
    include: { registrations: { where: { status: "REGISTERED" } } },
  })

  if (!classItem) return NextResponse.json({ error: "Class not found" }, { status: 404 })
  if (classItem.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Class is not open for registration" }, { status: 400 })
  }

  // Check existing active registration
  const existing = await prisma.classRegistration.findUnique({
    where: { classId_traineeId: { classId, traineeId: session.user.id } },
  })

  if (existing && existing.status !== "CANCELLED") {
    return NextResponse.json({ error: "Already registered" }, { status: 400 })
  }

  const isFull = classItem.registrations.length >= classItem.maxCapacity
  const status = isFull ? "WAITLISTED" : "REGISTERED"

  const registration = await prisma.classRegistration.upsert({
    where: { classId_traineeId: { classId, traineeId: session.user.id } },
    create: { classId, traineeId: session.user.id, status },
    update: { status, cancelledAt: null },
  })

  return NextResponse.json({ ...registration, status })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { classId } = await params

  const registration = await prisma.classRegistration.update({
    where: { classId_traineeId: { classId, traineeId: session.user.id } },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  })

  // Promote first waitlisted person
  const waitlisted = await prisma.classRegistration.findFirst({
    where: { classId, status: "WAITLISTED" },
    orderBy: { registeredAt: "asc" },
  })

  if (waitlisted) {
    await prisma.classRegistration.update({
      where: { id: waitlisted.id },
      data: { status: "REGISTERED" },
    })
  }

  return NextResponse.json(registration)
}
