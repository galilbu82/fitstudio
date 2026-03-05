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

export default async function TraineesPage() {
  const session = await withAuth(["ADMIN", "COACH"])

  const registrations = await prisma.classRegistration.findMany({
    where: {
      class: { coachId: session.user.id },
      status: { in: ["REGISTERED", "ATTENDED"] },
    },
    include: {
      trainee: { include: { profile: true } },
    },
    distinct: ["traineeId"],
  })

  const trainees = registrations.map((r) => r.trainee)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Trainees</h1>
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                  No trainees yet.
                </TableCell>
              </TableRow>
            ) : (
              trainees.map((trainee) => {
                const name = trainee.profile
                  ? `${trainee.profile.firstName} ${trainee.profile.lastName}`
                  : trainee.email
                const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                return (
                  <TableRow key={trainee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span>{name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{trainee.email}</TableCell>
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
