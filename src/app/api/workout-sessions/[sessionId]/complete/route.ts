import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { sessionId } = await params
  const body = await req.json().catch(() => ({}))
  const rating = body.rating as number | undefined

  const workoutSession = await prisma.workoutSession.updateMany({
    where: { id: sessionId, traineeId: session.user.id, completedAt: null },
    data: { completedAt: new Date(), rating },
  })

  if (workoutSession.count === 0) {
    return NextResponse.json({ error: "Session not found or already completed" }, { status: 404 })
  }

  // Check and award achievements
  await checkAchievements(session.user.id)

  return NextResponse.json({ success: true })
}

async function checkAchievements(userId: string) {
  const [sessionCount, achievements, earned] = await Promise.all([
    prisma.workoutSession.count({ where: { traineeId: userId, completedAt: { not: null } } }),
    prisma.achievement.findMany({ where: { category: "workout" } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } },)
  ])

  const earnedIds = new Set(earned.map((e) => e.achievementId))

  const toAward = achievements.filter(
    (a) => !earnedIds.has(a.id) && sessionCount >= a.threshold
  )

  if (toAward.length > 0) {
    await prisma.userAchievement.createMany({
      data: toAward.map((a) => ({ userId, achievementId: a.id })),
      skipDuplicates: true,
    })
  }
}
