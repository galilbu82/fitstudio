import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default async function LeaderboardPage() {
  await withAuth(["ADMIN", "COACH", "TRAINEE"])

  const leaderboard = await prisma.workoutSession.groupBy({
    by: ["traineeId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  })

  const userIds = leaderboard.map((l) => l.traineeId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    include: { profile: true },
  })

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

  const entries = leaderboard.map((l, i) => ({
    rank: i + 1,
    user: userMap[l.traineeId],
    sessionCount: l._count.id,
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Leaderboard</h1>
      <p className="text-muted-foreground mb-6">Ranked by total workout sessions</p>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Athlete</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No workout data yet. Be the first!
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const name = entry.user?.profile
                  ? `${entry.user.profile.firstName} ${entry.user.profile.lastName}`
                  : entry.user?.email ?? "Unknown"
                const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

                return (
                  <TableRow key={entry.user?.id}>
                    <TableCell>
                      {entry.rank <= 3 ? (
                        <Badge variant={entry.rank === 1 ? "default" : "secondary"}>
                          #{entry.rank}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">#{entry.rank}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {entry.sessionCount}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
