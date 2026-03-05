import { prisma } from "@/lib/prisma"
import { startOfWeek, startOfMonth } from "date-fns"
import { LeaderboardMetric, LeaderboardPeriod } from "@prisma/client"

export async function calculateLeaderboards() {
  const now = new Date()
  const weekStart = startOfWeek(now)
  const monthStart = startOfMonth(now)

  const trainees = await prisma.user.findMany({
    where: { role: "TRAINEE" },
    select: { id: true },
  })

  for (const trainee of trainees) {
    const [weeklyVol, monthlyVol, allTimeVol, weeklyCount, monthlyCount, streak, attendance] =
      await Promise.all([
        calculateVolume(trainee.id, weekStart, now),
        calculateVolume(trainee.id, monthStart, now),
        calculateVolume(trainee.id, new Date(0), now),
        countWorkouts(trainee.id, weekStart, now),
        countWorkouts(trainee.id, monthStart, now),
        calculateStreak(trainee.id),
        calculateAttendanceRate(trainee.id, monthStart, now),
      ])

    await Promise.all([
      upsert(trainee.id, "TOTAL_VOLUME", "WEEKLY", weeklyVol),
      upsert(trainee.id, "TOTAL_VOLUME", "MONTHLY", monthlyVol),
      upsert(trainee.id, "TOTAL_VOLUME", "ALL_TIME", allTimeVol),
      upsert(trainee.id, "WORKOUT_COUNT", "WEEKLY", weeklyCount),
      upsert(trainee.id, "WORKOUT_COUNT", "MONTHLY", monthlyCount),
      upsert(trainee.id, "CURRENT_STREAK", "ALL_TIME", streak),
      upsert(trainee.id, "ATTENDANCE_RATE", "MONTHLY", attendance),
    ])

    // Update personal records
    await updatePersonalRecords(trainee.id)
  }

  await updateRanks()
}

async function calculateVolume(userId: string, from: Date, to: Date): Promise<number> {
  const logs = await prisma.exerciseLog.findMany({
    where: { traineeId: userId, completedAt: { gte: from, lte: to } },
    select: { weight: true, reps: true },
  })
  return logs.reduce((sum, l) => sum + (l.weight ?? 0) * l.reps, 0)
}

async function countWorkouts(userId: string, from: Date, to: Date): Promise<number> {
  return prisma.workoutSession.count({
    where: { traineeId: userId, completedAt: { gte: from, lte: to, not: null } },
  })
}

export async function calculateStreak(userId: string): Promise<number> {
  const sessions = await prisma.workoutSession.findMany({
    where: { traineeId: userId, completedAt: { not: null } },
    select: { completedAt: true },
    orderBy: { completedAt: "desc" },
  })

  if (sessions.length === 0) return 0

  let streak = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  for (const s of sessions) {
    const d = new Date(s.completedAt!)
    d.setHours(0, 0, 0, 0)
    const diff = Math.floor((cursor.getTime() - d.getTime()) / 86400000)
    if (diff <= 1) {
      streak++
      cursor = d
    } else {
      break
    }
  }

  return streak
}

async function calculateAttendanceRate(userId: string, from: Date, to: Date): Promise<number> {
  const [total, attended] = await Promise.all([
    prisma.classRegistration.count({
      where: { traineeId: userId, registeredAt: { gte: from, lte: to }, status: { in: ["REGISTERED", "ATTENDED", "NO_SHOW"] } },
    }),
    prisma.classRegistration.count({
      where: { traineeId: userId, registeredAt: { gte: from, lte: to }, status: "ATTENDED" },
    }),
  ])
  return total > 0 ? (attended / total) * 100 : 0
}

async function upsert(userId: string, metric: LeaderboardMetric, period: LeaderboardPeriod, value: number) {
  await prisma.leaderboardEntry.upsert({
    where: { userId_metric_period: { userId, metric, period } },
    create: { userId, metric, period, value },
    update: { value, calculatedAt: new Date() },
  })
}

async function updatePersonalRecords(userId: string) {
  // Find max weight per exercise for this user
  const records = await prisma.exerciseLog.groupBy({
    by: ["exerciseId"],
    where: { traineeId: userId, weight: { not: null } },
    _max: { weight: true },
  })

  for (const r of records) {
    if (!r._max.weight) continue
    // Find the reps for that max weight
    const log = await prisma.exerciseLog.findFirst({
      where: { traineeId: userId, exerciseId: r.exerciseId, weight: r._max.weight },
      orderBy: { completedAt: "desc" },
    })
    if (!log) continue

    await prisma.personalRecord.upsert({
      where: { userId_exerciseId: { userId, exerciseId: r.exerciseId } },
      create: { userId, exerciseId: r.exerciseId, weight: r._max.weight, reps: log.reps },
      update: { weight: r._max.weight, reps: log.reps, achievedAt: log.completedAt },
    })
  }
}

async function updateRanks() {
  const combos: { metric: LeaderboardMetric; period: LeaderboardPeriod }[] = [
    { metric: "TOTAL_VOLUME", period: "WEEKLY" },
    { metric: "TOTAL_VOLUME", period: "MONTHLY" },
    { metric: "TOTAL_VOLUME", period: "ALL_TIME" },
    { metric: "WORKOUT_COUNT", period: "WEEKLY" },
    { metric: "WORKOUT_COUNT", period: "MONTHLY" },
    { metric: "CURRENT_STREAK", period: "ALL_TIME" },
    { metric: "ATTENDANCE_RATE", period: "MONTHLY" },
  ]

  for (const { metric, period } of combos) {
    const entries = await prisma.leaderboardEntry.findMany({
      where: { metric, period },
      orderBy: { value: "desc" },
      select: { id: true },
    })
    await Promise.all(
      entries.map((e, i) =>
        prisma.leaderboardEntry.update({ where: { id: e.id }, data: { rank: i + 1 } })
      )
    )
  }
}
