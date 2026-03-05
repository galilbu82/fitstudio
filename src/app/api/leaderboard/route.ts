import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { LeaderboardMetric, LeaderboardPeriod } from "@prisma/client"
import { startOfWeek, startOfMonth } from "date-fns"

// Live calculation for when no cached data exists yet
async function computeLive(metric: LeaderboardMetric, period: LeaderboardPeriod) {
  const now = new Date()
  const from =
    period === "WEEKLY"
      ? startOfWeek(now)
      : period === "MONTHLY"
      ? startOfMonth(now)
      : new Date(0)

  if (metric === "TOTAL_VOLUME") {
    const logs = await prisma.exerciseLog.groupBy({
      by: ["traineeId"],
      where: { completedAt: { gte: from }, weight: { not: null } },
      _sum: { weight: true },
      orderBy: { _sum: { weight: "desc" } },
      take: 20,
    })
    return logs.map((l, i) => ({
      userId: l.traineeId,
      value: l._sum.weight ?? 0,
      rank: i + 1,
    }))
  }

  if (metric === "WORKOUT_COUNT") {
    const sessions = await prisma.workoutSession.groupBy({
      by: ["traineeId"],
      where: { completedAt: { gte: from, not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    })
    return sessions.map((s, i) => ({
      userId: s.traineeId,
      value: s._count.id,
      rank: i + 1,
    }))
  }

  return []
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const metric = (searchParams.get("metric") ?? "TOTAL_VOLUME") as LeaderboardMetric
  const period = (searchParams.get("period") ?? "WEEKLY") as LeaderboardPeriod
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50)

  // Try cached leaderboard first
  const cached = await prisma.leaderboardEntry.findMany({
    where: { metric, period },
    orderBy: { value: "desc" },
    take: limit,
  })

  let entries: { userId: string; value: number; rank: number }[]

  if (cached.length > 0) {
    entries = cached.map((e) => ({ userId: e.userId, value: e.value, rank: e.rank ?? 0 }))
  } else {
    entries = await computeLive(metric, period)
  }

  // Hydrate with user data
  const userIds = entries.map((e) => e.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { profile: true },
  })
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

  const leaderboard = entries
    .map((e) => ({
      rank: e.rank,
      value: e.value,
      user: userMap[e.userId]
        ? {
            id: e.userId,
            name: userMap[e.userId].profile
              ? `${userMap[e.userId].profile!.firstName} ${userMap[e.userId].profile!.lastName}`
              : userMap[e.userId].email,
            avatarUrl: userMap[e.userId].profile?.avatarUrl ?? null,
          }
        : null,
    }))
    .filter((e) => e.user !== null)

  // Current user's position
  const myEntry = entries.find((e) => e.userId === session.user.id)

  return NextResponse.json({ leaderboard, myRank: myEntry?.rank ?? null, myValue: myEntry?.value ?? 0 })
}
