"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Clock, MapPin, Users, Dumbbell, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"

type ClassItem = {
  id: string
  title: string
  description: string | null
  scheduledAt: string
  durationMins: number
  maxCapacity: number
  location: string | null
  coach: {
    email: string
    profile: { firstName: string; lastName: string; avatarUrl: string | null } | null
  }
  workout: { name: string } | null
  registrations: { id: string; status: string }[]
}

type MyReg = { classId: string; status: string }

export function ClassesClient({
  classes: initial,
  myRegistrations: initialRegs,
  userId,
}: {
  classes: ClassItem[]
  myRegistrations: MyReg[]
  userId: string
}) {
  const [classes, setClasses] = useState(initial)
  const [regs, setRegs] = useState<Map<string, string>>(
    new Map(initialRegs.map((r) => [r.classId, r.status]))
  )
  const [loading, setLoading] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  async function register(classId: string) {
    setLoading(classId)
    const res = await fetch(`/api/classes/${classId}/register`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      setRegs((prev) => new Map(prev).set(classId, data.status))
      // Update spot count
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId && data.status === "REGISTERED"
            ? { ...c, registrations: [...c.registrations, { id: data.id, status: "REGISTERED" }] }
            : c
        )
      )
    }
    setLoading(null)
  }

  async function cancel(classId: string) {
    setLoading(classId)
    const res = await fetch(`/api/classes/${classId}/register`, { method: "DELETE" })
    if (res.ok) {
      const prev = regs.get(classId)
      setRegs((r) => { const m = new Map(r); m.delete(classId); return m })
      if (prev === "REGISTERED") {
        setClasses((prev) =>
          prev.map((c) =>
            c.id === classId
              ? { ...c, registrations: c.registrations.filter((r) => r.status !== "REGISTERED").slice(1) }
              : c
          )
        )
      }
    }
    setLoading(null)
  }

  const filtered = classes.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.coach.profile?.firstName.toLowerCase().includes(search.toLowerCase()) ||
    c.workout?.name.toLowerCase().includes(search.toLowerCase())
  )

  // Group by date
  const grouped = filtered.reduce<Record<string, ClassItem[]>>((acc, cls) => {
    const date = format(new Date(cls.scheduledAt), "yyyy-MM-dd")
    if (!acc[date]) acc[date] = []
    acc[date].push(cls)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Available Classes</h1>
          <p className="text-muted-foreground text-sm">Browse and register for upcoming sessions</p>
        </div>
      </div>

      <Input
        placeholder="Search classes, coaches, workouts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 max-w-sm"
      />

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No classes found</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, dayClasses]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {format(new Date(date), "EEEE, MMMM d")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {dayClasses.map((cls) => {
                  const regStatus = regs.get(cls.id)
                  const isRegistered = regStatus === "REGISTERED"
                  const isWaitlisted = regStatus === "WAITLISTED"
                  const spotsLeft = cls.maxCapacity - cls.registrations.filter((r) => r.status === "REGISTERED").length
                  const isFull = spotsLeft <= 0
                  const isLoading = loading === cls.id
                  const coachName = cls.coach.profile
                    ? `${cls.coach.profile.firstName} ${cls.coach.profile.lastName}`
                    : cls.coach.email
                  const initials = coachName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

                  return (
                    <Card key={cls.id} className="hover:shadow-md transition-shadow flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{cls.title}</CardTitle>
                            {cls.workout && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                <Dumbbell className="h-3 w-3 mr-1" />
                                {cls.workout.name}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="font-semibold text-sm">
                              {format(new Date(cls.scheduledAt), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 space-y-3">
                        {cls.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{cls.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {cls.durationMins} min
                          </span>
                          {cls.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {cls.location}
                            </span>
                          )}
                          <span className={`flex items-center gap-1 ${spotsLeft <= 3 && !isFull ? "text-orange-500 font-medium" : ""}`}>
                            <Users className="h-3 w-3" />
                            {isFull ? "Full" : `${spotsLeft} spots left`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">{coachName}</span>
                        </div>
                      </CardContent>

                      <CardFooter className="pt-3">
                        {isRegistered ? (
                          <div className="flex w-full gap-2">
                            <div className="flex-1 flex items-center gap-1 text-sm font-medium text-green-600">
                              <Check className="h-4 w-4" /> Registered
                            </div>
                            <Button variant="outline" size="sm" onClick={() => cancel(cls.id)} disabled={isLoading}>
                              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel"}
                            </Button>
                          </div>
                        ) : isWaitlisted ? (
                          <div className="flex w-full gap-2">
                            <Badge variant="secondary" className="flex-1 justify-center py-1">
                              On Waitlist
                            </Badge>
                            <Button variant="outline" size="sm" onClick={() => cancel(cls.id)} disabled={isLoading}>
                              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Leave"}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            className="w-full"
                            variant={isFull ? "outline" : "default"}
                            onClick={() => register(cls.id)}
                            disabled={isLoading}
                          >
                            {isLoading
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : isFull ? "Join Waitlist" : "Register"}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
