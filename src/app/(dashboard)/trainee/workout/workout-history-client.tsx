"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Dumbbell, Play, CheckCircle, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Session = {
  id: string
  startedAt: string
  completedAt: string | null
  rating: number | null
  workout: { id: string; name: string; program: { name: string } | null }
  _count: { exerciseLogs: number }
}

type EnrolledProgram = {
  program: {
    id: string
    name: string
    workouts: {
      id: string
      name: string
      weekNumber: number | null
      dayOfWeek: number | null
      _count: { exercises: number }
    }[]
  }
}

export function WorkoutHistoryClient({
  sessions,
  enrolledPrograms,
}: {
  sessions: Session[]
  enrolledPrograms: EnrolledProgram[]
}) {
  const router = useRouter()
  const [starting, setStarting] = useState<string | null>(null)

  async function startSession(workoutId: string) {
    setStarting(workoutId)
    const res = await fetch("/api/workout-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workoutId }),
    })
    if (res.ok) {
      const s = await res.json()
      router.push(`/trainee/workout/${s.id}`)
    }
    setStarting(null)
  }

  const completedSessions = sessions.filter((s) => s.completedAt)
  const inProgress = sessions.filter((s) => !s.completedAt)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Workouts</h1>

      <Tabs defaultValue="programs">
        <TabsList className="mb-6">
          <TabsTrigger value="programs">My Programs</TabsTrigger>
          <TabsTrigger value="history">History ({completedSessions.length})</TabsTrigger>
          {inProgress.length > 0 && (
            <TabsTrigger value="inprogress">In Progress ({inProgress.length})</TabsTrigger>
          )}
        </TabsList>

        {/* Programs tab — start a session */}
        <TabsContent value="programs">
          {enrolledPrograms.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No programs enrolled</p>
              <p className="text-sm">Ask your coach to enroll you in a training program.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {enrolledPrograms.map(({ program }) => (
                <Card key={program.id}>
                  <CardHeader className="pb-3">
                    <CardTitle>{program.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {program.workouts.map((workout) => (
                        <div
                          key={workout.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">{workout.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {workout._count.exercises} exercises
                              {workout.weekNumber ? ` · Week ${workout.weekNumber}` : ""}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => startSession(workout.id)}
                            disabled={starting === workout.id}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            {starting === workout.id ? "Starting..." : "Start"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* In-progress tab */}
        <TabsContent value="inprogress">
          <div className="space-y-3">
            {inProgress.map((s) => (
              <Card key={s.id} className="border-yellow-300">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{s.workout.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Started {format(new Date(s.startedAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => router.push(`/trainee/workout/${s.id}`)}>
                    <Play className="h-3 w-3 mr-1" /> Resume
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history">
          {completedSessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No completed workouts yet.</p>
          ) : (
            <div className="space-y-3">
              {completedSessions.map((s) => (
                <Card key={s.id} className="hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => router.push(`/trainee/workout/${s.id}`)}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                      <div>
                        <p className="font-medium">{s.workout.name}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(s.startedAt), "MMM d, yyyy")}
                          </span>
                          <span>{s._count.exerciseLogs} sets logged</span>
                          {s.workout.program && <span>{s.workout.program.name}</span>}
                        </div>
                      </div>
                    </div>
                    {s.rating && (
                      <Badge variant="outline" className="shrink-0">
                        {s.rating}/5
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
