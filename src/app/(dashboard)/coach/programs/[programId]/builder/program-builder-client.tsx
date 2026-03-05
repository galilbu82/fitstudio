"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Plus, GripVertical, Trash2, X, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

type Exercise = {
  id: string
  name: string
  muscleGroup: string
  equipment: string | null
}

type WorkoutExercise = {
  id: string
  exerciseId: string
  targetSets: number
  targetReps: string
  restSeconds: number | null
  sortOrder: number
  exercise: Exercise
}

type Workout = {
  id: string
  name: string
  dayOfWeek: number | null
  weekNumber: number | null
  sortOrder: number
  exercises: WorkoutExercise[]
}

type Program = {
  id: string
  name: string
  durationWeeks: number
  workouts: Workout[]
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function ProgramBuilderClient({
  program: initialProgram,
  availableExercises,
}: {
  program: Program
  availableExercises: Exercise[]
}) {
  const [workouts, setWorkouts] = useState<Workout[]>(initialProgram.workouts)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [addWorkoutDialog, setAddWorkoutDialog] = useState<{ week: number; day: number } | null>(null)
  const [isAddingWorkout, setIsAddingWorkout] = useState(false)

  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId) ?? null

  async function handleAddWorkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!addWorkoutDialog) return
    setIsAddingWorkout(true)

    const fd = new FormData(e.currentTarget)
    const res = await fetch(`/api/programs/${initialProgram.id}/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        weekNumber: addWorkoutDialog.week,
        dayOfWeek: addWorkoutDialog.day,
        sortOrder: workouts.length,
      }),
    })

    if (res.ok) {
      const newWorkout = await res.json()
      setWorkouts((prev) => [...prev, newWorkout])
      setAddWorkoutDialog(null)
      setSelectedWorkoutId(newWorkout.id)
    }
    setIsAddingWorkout(false)
  }

  async function handleDeleteWorkout(workoutId: string) {
    if (!confirm("Remove this workout?")) return
    await fetch(`/api/workouts/${workoutId}`, { method: "DELETE" })
    setWorkouts((prev) => prev.filter((w) => w.id !== workoutId))
    if (selectedWorkoutId === workoutId) setSelectedWorkoutId(null)
  }

  async function handleAddExercise(workoutId: string, data: {
    exerciseId: string
    targetSets: number
    targetReps: string
    restSeconds: number
  }) {
    const res = await fetch(`/api/workouts/${workoutId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, sortOrder: selectedWorkout?.exercises.length ?? 0 }),
    })

    if (res.ok) {
      const newExercise = await res.json()
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workoutId
            ? { ...w, exercises: [...w.exercises, newExercise] }
            : w
        )
      )
    }
  }

  async function handleRemoveExercise(workoutId: string, workoutExerciseId: string) {
    // We need a DELETE endpoint for workout exercises - for now optimistic update
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === workoutId
          ? { ...w, exercises: w.exercises.filter((e) => e.id !== workoutExerciseId) }
          : w
      )
    )
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination || !selectedWorkout) return
    const exercises = [...selectedWorkout.exercises]
    const [moved] = exercises.splice(result.source.index, 1)
    exercises.splice(result.destination.index, 0, moved)
    const reordered = exercises.map((e, i) => ({ ...e, sortOrder: i }))

    setWorkouts((prev) =>
      prev.map((w) => (w.id === selectedWorkout.id ? { ...w, exercises: reordered } : w))
    )

    await fetch(`/api/workouts/${selectedWorkout.id}/exercises`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercises: reordered.map((e) => ({ id: e.id, sortOrder: e.sortOrder })) }),
    })
  }

  const muscleGroups = [...new Set(availableExercises.map((e) => e.muscleGroup))].sort()

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-8">
      {/* Main builder area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/coach/programs">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Programs
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{initialProgram.name}</h1>
            <p className="text-sm text-muted-foreground">{initialProgram.durationWeeks}-week program</p>
          </div>
        </div>

        <div className="space-y-6">
          {Array.from({ length: initialProgram.durationWeeks }, (_, weekIdx) => {
            const week = weekIdx + 1
            return (
              <Card key={week}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Week {week}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS.map((day, dayIdx) => {
                      const workout = workouts.find(
                        (w) => w.weekNumber === week && w.dayOfWeek === dayIdx
                      )
                      const isSelected = workout?.id === selectedWorkoutId

                      return (
                        <div key={dayIdx} className="min-h-[90px]">
                          <p className="text-xs text-muted-foreground text-center mb-1">{day}</p>
                          {workout ? (
                            <button
                              onClick={() => setSelectedWorkoutId(isSelected ? null : workout.id)}
                              className={`w-full text-left p-2 rounded-lg border text-xs transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-primary/10 hover:bg-primary/20 border-transparent"
                              }`}
                            >
                              <p className="font-medium truncate">{workout.name}</p>
                              <p className="opacity-70">{workout.exercises.length} ex.</p>
                            </button>
                          ) : (
                            <button
                              onClick={() => setAddWorkoutDialog({ week, day: dayIdx })}
                              className="w-full h-[60px] rounded-lg border-2 border-dashed border-muted hover:border-primary/50 hover:bg-muted/50 transition-colors flex items-center justify-center"
                            >
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Workout detail panel */}
      {selectedWorkout && (
        <div className="w-96 border-l bg-background flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{selectedWorkout.name}</h2>
              <p className="text-xs text-muted-foreground">
                {selectedWorkout.exercises.length} exercises
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteWorkout(selectedWorkout.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedWorkoutId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="exercises">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2 mb-4"
                  >
                    {selectedWorkout.exercises.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No exercises yet. Add some below.
                      </p>
                    )}
                    {selectedWorkout.exercises.map((we, index) => (
                      <Draggable key={we.id} draggableId={we.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                          >
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{we.exercise.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {we.targetSets} × {we.targetReps}
                                {we.restSeconds ? ` · ${we.restSeconds}s rest` : ""}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {we.exercise.muscleGroup}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleRemoveExercise(selectedWorkout.id, we.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          <div className="p-4 border-t">
            <AddExerciseDialog
              availableExercises={availableExercises}
              muscleGroups={muscleGroups}
              onAdd={(data) => handleAddExercise(selectedWorkout.id, data)}
            />
          </div>
        </div>
      )}

      {/* Add Workout Dialog */}
      <Dialog open={addWorkoutDialog !== null} onOpenChange={(o) => !o && setAddWorkoutDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Workout — Week {addWorkoutDialog?.week}, {addWorkoutDialog ? DAYS[addWorkoutDialog.day] : ""}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWorkout} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="workout-name">Workout Name</Label>
              <Input id="workout-name" name="name" placeholder="e.g. Push Day, Leg Day" required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddWorkoutDialog(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingWorkout}>
                {isAddingWorkout ? "Adding..." : "Add Workout"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddExerciseDialog({
  availableExercises,
  muscleGroups,
  onAdd,
}: {
  availableExercises: Exercise[]
  muscleGroups: string[]
  onAdd: (data: { exerciseId: string; targetSets: number; targetReps: string; restSeconds: number }) => void
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const [selectedGroup, setSelectedGroup] = useState("all")

  const filtered = availableExercises.filter(
    (e) =>
      (selectedGroup === "all" || e.muscleGroup === selectedGroup) &&
      e.name.toLowerCase().includes(filter.toLowerCase())
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    onAdd({
      exerciseId: fd.get("exerciseId") as string,
      targetSets: Number(fd.get("targetSets")),
      targetReps: fd.get("targetReps") as string,
      restSeconds: Number(fd.get("restSeconds")),
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Exercise
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search exercises..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1"
            />
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All muscles</SelectItem>
                {muscleGroups.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Exercise</Label>
            <div className="max-h-48 overflow-auto border rounded-md">
              {filtered.map((ex) => (
                <label
                  key={ex.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer border-b last:border-0"
                >
                  <input type="radio" name="exerciseId" value={ex.id} required className="shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{ex.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.muscleGroup}{ex.equipment ? ` · ${ex.equipment}` : ""}
                    </p>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No exercises found</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="targetSets">Sets</Label>
              <Input id="targetSets" name="targetSets" type="number" min={1} max={20} defaultValue={3} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="targetReps">Reps</Label>
              <Input id="targetReps" name="targetReps" placeholder="8-12" defaultValue="10" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="restSeconds">Rest (s)</Label>
              <Input id="restSeconds" name="restSeconds" type="number" min={0} defaultValue={90} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Add to Workout</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
