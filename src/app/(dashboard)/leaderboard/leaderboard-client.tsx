"use client"

import { useState, useEffect, useCallback } from "react"
import { Trophy, Medal, Award, Flame, Target, TrendingUp, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type LeaderboardEntry = {
  rank: number
  value: number
  user: { id: string; name: string; avatarUrl: string | null }
}

type MyStats = {
  currentStreak: number
  totalWorkouts: number
  totalVolume: number
  volumeRank: number
  workoutRank: number
  attendanceRate: number
}

type MetricConfig = {
  key: string
  label: string
  unit: string
  formatValue: (v: number) => string
}

const METRICS: MetricConfig[] = [
  {
    key: "TOTAL_VOLUME",
    label: "Volume",
    unit: "kg",
    formatValue: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k kg` : `${Math.round(v)} kg`,
  },
  {
    key: "WORKOUT_COUNT",
    label: "Workouts",
    unit: "workouts",
    formatValue: (v) => `${v} workouts`,
  },
  {
    key: "CURRENT_STREAK",
    label: "Streak",
    unit: "days",
    formatValue: (v) => `${v} days`,
  },
  {
    key: "ATTENDANCE_RATE",
    label: "Attendance",
    unit: "%",
    formatValue: (v) => `${v.toFixed(0)}%`,
  },
]

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
  return <span className="text-sm font-semibold text-muted-foreground w-5 text-center">{rank}</span>
}

function LeaderboardTable({
  metric,
  myUserId,
}: {
  metric: MetricConfig
  myUserId?: string
}) {
  const [period, setPeriod] = useState("WEEKLY")
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [myValue, setMyValue] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/leaderboard?metric=${metric.key}&period=${period}&limit=20`)
    if (res.ok) {
      const data = await res.json()
      setEntries(data.leaderboard)
      setMyRank(data.myRank)
      setMyValue(data.myValue)
    }
    setLoading(false)
  }, [metric.key, period])

  useEffect(() => { load() }, [load])

  const myInTop = entries.some((e) => e.user.id === myUserId)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Rankings</CardTitle>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WEEKLY">This Week</SelectItem>
            <SelectItem value="MONTHLY">This Month</SelectItem>
            <SelectItem value="ALL_TIME">All Time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>No data yet. Start logging workouts!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const isMe = entry.user.id === myUserId
              const initials = entry.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              return (
                <div
                  key={entry.user.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                    i === 0 && "bg-yellow-50 dark:bg-yellow-950/30",
                    i === 1 && "bg-slate-50 dark:bg-slate-900/30",
                    i === 2 && "bg-amber-50 dark:bg-amber-950/30",
                    i > 2 && "hover:bg-muted/50",
                    isMe && "ring-2 ring-primary"
                  )}
                >
                  <div className="w-6 flex justify-center shrink-0">
                    <RankIcon rank={entry.rank} />
                  </div>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {entry.user.name}
                      {isMe && <Badge variant="outline" className="ml-2 text-xs">You</Badge>}
                    </p>
                  </div>
                  <p className="font-bold text-sm shrink-0">{metric.formatValue(entry.value)}</p>
                </div>
              )
            })}

            {/* Show user if outside top 20 */}
            {!myInTop && myRank !== null && myUserId && (
              <>
                <div className="text-center text-muted-foreground text-sm py-1">• • •</div>
                <div className="flex items-center gap-3 p-3 rounded-lg ring-2 ring-primary bg-primary/5">
                  <div className="w-6 flex justify-center shrink-0">
                    <span className="text-sm font-semibold text-muted-foreground">{myRank}</span>
                  </div>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs">Me</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">You</p>
                  </div>
                  <p className="font-bold text-sm">{metric.formatValue(myValue)}</p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function LeaderboardClient() {
  const [stats, setStats] = useState<MyStats | null>(null)
  const [myUserId, setMyUserId] = useState<string>()

  useEffect(() => {
    fetch("/api/leaderboard/my-stats")
      .then((r) => r.json())
      .then(setStats)

    // Get current user id from session
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => s?.user?.id && setMyUserId(s.user.id))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground text-sm">See how you stack up against fellow members</p>
      </div>

      {/* My stats card */}
      {stats && (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
              <div>
                <Trophy className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
                <p className="text-2xl font-bold">#{stats.volumeRank}</p>
                <p className="text-xs text-muted-foreground">Volume Rank</p>
              </div>
              <div>
                <Target className="h-6 w-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">#{stats.workoutRank}</p>
                <p className="text-xs text-muted-foreground">Workout Rank</p>
              </div>
              <div>
                <Flame className="h-6 w-6 mx-auto mb-1 text-orange-500" />
                <p className="text-2xl font-bold">{stats.currentStreak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div>
                <TrendingUp className="h-6 w-6 mx-auto mb-1 text-green-500" />
                <p className="text-2xl font-bold">
                  {stats.totalVolume >= 1000
                    ? `${(stats.totalVolume / 1000).toFixed(1)}k`
                    : Math.round(stats.totalVolume)}
                </p>
                <p className="text-xs text-muted-foreground">kg lifted</p>
              </div>
              <div>
                <Award className="h-6 w-6 mx-auto mb-1 text-purple-500" />
                <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
                <p className="text-xs text-muted-foreground">Workouts</p>
              </div>
              <div>
                <Calendar className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <p className="text-2xl font-bold">{stats.attendanceRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard tabs */}
      <Tabs defaultValue="TOTAL_VOLUME">
        <TabsList className="grid w-full grid-cols-4">
          {METRICS.map((m) => (
            <TabsTrigger key={m.key} value={m.key}>{m.label}</TabsTrigger>
          ))}
        </TabsList>
        {METRICS.map((m) => (
          <TabsContent key={m.key} value={m.key}>
            <LeaderboardTable metric={m} myUserId={myUserId} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
