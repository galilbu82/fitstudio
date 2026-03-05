import { withAuth } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { AvailabilityClient } from "./availability-client"

export default async function AvailabilityPage() {
  const session = await withAuth(["ADMIN", "COACH"])

  const availability = await prisma.coachAvailability.findMany({
    where: { coachId: session.user.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  })

  return <AvailabilityClient initialSlots={availability} />
}
