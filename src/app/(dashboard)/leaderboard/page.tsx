import { withAuth } from "@/lib/rbac"
import { LeaderboardClient } from "./leaderboard-client"

export default async function LeaderboardPage() {
  await withAuth(["ADMIN", "COACH", "TRAINEE"])
  return <LeaderboardClient />
}
