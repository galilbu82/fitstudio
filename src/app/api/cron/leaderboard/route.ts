import { NextResponse } from "next/server"
import { calculateLeaderboards } from "@/lib/jobs/calculate-leaderboard"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await calculateLeaderboards()
  return NextResponse.json({ success: true, calculatedAt: new Date().toISOString() })
}
