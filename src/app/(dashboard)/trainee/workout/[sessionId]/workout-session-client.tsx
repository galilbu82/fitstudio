"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, ChevronRight, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ExerciseLog = {
  exerciseId: string
  setNumber: number
  weight: number | null
  reps: number
}

type WorkoutExercise = {
  id: string
  exerciseId: string
  targetSets: number
  targetReps: string
  restSeconds: number | null
  notes: string | null
  exercise: { id: string; name: string; muscleGroup: string }
}

type WorkoutSession = {
  id: string
  completedAt: string | null
  workout: {
    name: string
    exercises: WorkoutExercise[]
  }
  exerciseLogs: ExerciseLog[]
}

type SetState = {
  setNumber: number
  weight: string
  reps: string
  completed: boolean
  prevWeight: number | null
  prevReps: number | null
}

export function WorkoutSessionClient({
  workoutSession,
  previousLogs,
}: {
  workoutSession: WorkoutSession
  previousLogs: ExerciseLog[]
}) {
  const router = useRouter()
  const isCompleted = !!workoutSession.completedAt
  const exercises = workoutSession.workout.exercises

  // Build set state from existing logs + previous logs for reference
  const buildSets = (): Map<string, SetState[]> => {
    const map = new Map<string, SetState[]>()
    for (const we of exercises) {
      const existing = workoutSession.exerciseLogs.filter((l) => l.exerciseId === we.exerciseId)
      const prev = previousLogs.filter((l) => l.exerciseId === we.exerciseId)
      const sets: SetState[] = Array.from({ length: we.targetSets }, (_, i) => {
        const log = existing.find((l) => l.setNumber === i + 1)
        const prevLog = prev.find((l) => l.setNumber === i + 1)
        return {
          setNumber: i + 1,
          weight: log?.weight?.toString() ?? prevLog?.weight?.toString() ?? "",
          reps: log?.reps?.toString() ?? prevLog?.reps?.toString() ?? "",
          completed: !!log,
          prevWeight: prevLog?.weight ?? null,
          prevReps: prevLog?.reps ?? null,
        }
      })
      map.set(we.exerciseId, sets)
    }
    return map
  }

  const [sets, setSets] = useState<Map<string, SetState[]>>(buildSets)
  const [openIdx, setOpenIdx] = useState(0)
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [rating, setRating] = useState(0)
  const [finishing, setFinishing] = useState(false)

  const completedCount = exercises.filter((we) =>
    (sets.get(we.exerciseId) ?? []).every((s) => s.completed)
  ).length

  const progress = exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0

  // Rest timer countdown
  useEffect(() => {
    if (restTimer === null || restTimer <= 0) { setRestTimer(null); return }
    const t = setTimeout(() => setRestTimer((n) => (n ?? 1) - 1), 1000)
    return () => clearTimeout(t)
  }, [restTimer])

  function updateSet(exerciseId: string, setNum: number, field: "weight" | "reps", value: string) {
    setSets((prev) => {
      const next = new Map(prev)
      next.set(
        exerciseId,
        (prev.get(exerciseId) ?? []).map((s) =>
          s.setNumber === setNum ? { ...s, [field]: value } : s
        )
      )
      return next
    })
  }

  async function logSet(we: WorkoutExercise, setNum: number) {
    const exerciseSets = sets.get(we.exerciseId) ?? []
    const s = exerciseSets.find((s) => s.setNumber === setNum)
    if (!s) return

    const weight = parseFloat(s.weight)
    const reps = parseInt(s.reps)
    if (isNaN(weight) || isNaN(reps) || reps < 1) return

    setSaving(true)
    const res = await fetch(`/api/workout-sessions/${workoutSession.id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId: we.exerciseId, setNumber: setNum, weight, reps }),
    })

    if (res.ok) {
      setSets((prev) => {
        const next = new Map(prev)
        next.set(
          we.exerciseId,
          (prev.get(we.exerciseId) ?? []).map((s) =>
            s.setNumber === setNum ? { ...s, completed: true } : s
          )
        )
        return next
      })
      setRestTimer(we.restSeconds ?? 90)

      // Auto-advance to next exercise if all sets done
      const allDone = exerciseSets.every((s) => s.setNumber === setNum || s.completed)
      if (allDone) {
        const nextIdx = exercises.findIndex((e) => e.exerciseId === we.exerciseId) + 1
        if (nextIdx < exercises.length) setTimeout(() => setOpenIdx(nextIdx), 500)
      }
    }
    setSaving(false)
  }

  async function finishWorkout() {
    setFinishing(true)
    await fetch(`/api/workout-sessions/${workoutSession.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: rating || undefined }),
    })
    router.push("/trainee")
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur border-b pb-3 mb-6 z-10 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold">{workoutSession.workout.name}</h1>
            <p className="text-sm text-muted-foreground">{completedCount}/{exercises.length} exercises</p>
          </div>
          {!isCompleted && (
            <Button onClick={() => setFinishing(true)} variant="outline">
              Finish
            </Button>
          )}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Rest timer */}
      {restTimer !== null && restTimer > 0 && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 cursor-pointer"
          onClick={() => setRestTimer(null)}
        >
          <div className="text-center text-white">
            <Timer className="h-14 w-14 mx-auto mb-4 animate-pulse" />
            <div className="text-7xl font-mono font-bold mb-2">
              {Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, "0")}
            </div>
            <p className="text-lg text-white/70 mb-6">Rest — tap to skip</p>
            <Button variant="secondary" onClick={() => setRestTimer(null)}>
              Skip Rest
            </Button>
          </div>
        </div>
      )}

      {/* Finish modal */}
      {finishing && !isCompleted && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Finish Workout?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {completedCount < exercises.length
                  ? `You have ${exercises.length - completedCount} exercise(s) remaining.`
                  : "All exercises completed!"}
              </p>
              <div>
                <p className="text-sm font-medium mb-2">Rate difficulty (optional)</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant={rating === r ? "default" : "outline"}
                      onClick={() => setRating(r)}
                      className="flex-1"
                    >
                      {r}
                    </Button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
                  <span>Easy</span><span>Hard</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setFinishing(false)}>
                  Continue
                </Button>
                <Button className="flex-1" onClick={finishWorkout} disabled={finishing && saving}>
                  {finishing && saving ? "Saving..." : "Finish Workout"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-3">
        {exercises.map((we, idx) => {
          const exerciseSets = sets.get(we.exerciseId) ?? []
          const allDone = exerciseSets.every((s) => s.completed)
          const isOpen = openIdx === idx

          return (
            <Card
              key={we.id}
              className={cn(
                "transition-all",
                isOpen && "ring-2 ring-primary",
                allDone && "opacity-70"
              )}
            >
              <CardHeader
                className="cursor-pointer py-3"
                onClick={() => setOpenIdx(isOpen ? -1 : idx)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    allDone ? "bg-green-500 text-white" : "bg-muted"
                  )}>
                    {allDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{we.exercise.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {we.targetSets} sets × {we.targetReps} reps
                      {we.restSeconds ? ` · ${we.restSeconds}s rest` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{we.exercise.muscleGroup}</Badge>
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              </CardHeader>

              {isOpen && (
                <CardContent className="pt-0 space-y-2">
                  {we.notes && (
                    <div className="p-2 bg-muted rounded text-xs mb-3">
                      <span className="font-medium">Notes: </span>{we.notes}
                    </div>
                  )}

                  {/* Column headers */}
                  <div className="grid grid-cols-[3rem_1fr_1fr_5rem] gap-2 text-xs text-muted-foreground px-1 mb-1">
                    <span>Set</span>
                    <span className="text-center">Weight (kg)</span>
                    <span className="text-center">Reps</span>
                    <span />
                  </div>

                  {exerciseSets.map((s) => (
                    <div
                      key={s.setNumber}
                      className={cn(
                        "grid grid-cols-[3rem_1fr_1fr_5rem] gap-2 items-center p-2 rounded-lg",
                        s.completed ? "bg-green-50 dark:bg-green-950/30" : "bg-muted/50"
                      )}
                    >
                      <span className="text-sm font-medium text-center">{s.setNumber}</span>
                      <div>
                        <Input
                          type="number"
                          value={s.weight}
                          onChange={(e) => updateSet(we.exerciseId, s.setNumber, "weight", e.target.value)}
                          disabled={s.completed || isCompleted}
                          className="text-center h-9"
                          placeholder={s.prevWeight?.toString() ?? "0"}
                        />
                        {s.prevWeight !== null && (
                          <p className="text-xs text-muted-foreground text-center mt-0.5">
                            prev: {s.prevWeight}
                          </p>
                        )}
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={s.reps}
                          onChange={(e) => updateSet(we.exerciseId, s.setNumber, "reps", e.target.value)}
                          disabled={s.completed || isCompleted}
                          className="text-center h-9"
                          placeholder={we.targetReps}
                        />
                        {s.prevReps !== null && (
                          <p className="text-xs text-muted-foreground text-center mt-0.5">
                            prev: {s.prevReps}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="h-9"
                        variant={s.completed ? "ghost" : "default"}
                        disabled={s.completed || isCompleted || saving || !s.weight || !s.reps}
                        onClick={() => logSet(we, s.setNumber)}
                      >
                        {s.completed ? <Check className="h-4 w-4 text-green-600" /> : "Log"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {isCompleted && (
        <div className="mt-8 text-center p-6 bg-green-50 dark:bg-green-950/30 rounded-xl">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <p className="text-lg font-bold text-green-700">Workout Complete!</p>
          <Button className="mt-4" onClick={() => router.push("/trainee")}>
            Back to Dashboard
          </Button>
        </div>
      )}
    </div>
  )
}
