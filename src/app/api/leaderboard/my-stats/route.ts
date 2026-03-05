import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { calculateStreak } from "@/lib/jobs/calculate-leaderboard"
import { startOfMonth } from "date-fns"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const monthStart = startOfMonth(new Date())

  const [streak, totalWorkouts, totalVolumeAgg, attended, totalRegistered] = await Promise.all([
    calculateStreak(userId),
    prisma.workoutSession.count({ where: { traineeId: userId, completedAt: { not: null } } }),
    prisma.exerciseLog.aggregate({
      where: { traineeId: userId, weight: { not: null } },
      _sum: { weight: true },
    }),
    prisma.classRegistration.count({ where: { traineeId: userId, status: "ATTENDED" } }),
    prisma.classRegistration.count({
      where: {
        traineeId: userId,
        registeredAt: { gte: monthStart },
        status: { in: ["REGISTERED", "ATTENDED", "NO_SHOW"] },
      },
    }),
  ])

  // Get volume rank (live)
  const myVolume = totalVolumeAgg._sum.weight ?? 0
  const higherVolumeCount = await prisma.exerciseLog.groupBy({
    by: ["traineeId"],
    where: { weight: { not: null } },
    _sum: { weight: true },
    having: { weight: { _sum: { gt: myVolume } } },
  })
  const volumeRank = higherVolumeCount.length + 1

  // Get workout count rank (live)
  const higherCountUsers = await prisma.workoutSession.groupBy({
    by: ["traineeId"],
    where: { completedAt: { not: null } },
    _count: { id: true },
    having: { id: { _count: { gt: totalWorkouts } } },
  })
  const workoutRank = higherCountUsers.length + 1

  const attendanceRate = totalRegistered > 0 ? (attended / totalRegistered) * 100 : 0

  return NextResponse.json({
    currentStreak: streak,
    totalWorkouts,
    totalVolume: myVolume,
    volumeRank,
    workoutRank,
    attendanceRate,
  })
}
