import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminDashboard() {
  await withAuth(["ADMIN"])

  const [userCount, coachCount, traineeCount, classCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "COACH" } }),
    prisma.user.count({ where: { role: "TRAINEE" } }),
    prisma.class.count(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Coaches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{coachCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trainees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{traineeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{classCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
