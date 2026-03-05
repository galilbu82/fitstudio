import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function ProgramsPage() {
  const session = await withAuth(["ADMIN", "COACH"])

  const programs = await prisma.trainingProgram.findMany({
    where: { coachId: session.user.id },
    include: { _count: { select: { workouts: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Training Programs</h1>
      </div>

      {programs.length === 0 ? (
        <p className="text-muted-foreground">No programs yet. Create your first training program.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <Card key={program.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{program.name}</CardTitle>
                  <Badge variant={program.isActive ? "default" : "secondary"}>
                    {program.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {program.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {program.description}
                  </p>
                )}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{program.durationWeeks} weeks</span>
                  <span>{program._count.workouts} workouts</span>
                  <span>{program._count.enrollments} enrolled</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
