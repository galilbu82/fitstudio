import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  const session = await auth()
  if (!session || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workoutId } = await params

  // Verify via program ownership
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { program: true },
  })

  if (!workout || workout.program.coachId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.workout.delete({ where: { id: workoutId } })
  return NextResponse.json({ success: true })
}
