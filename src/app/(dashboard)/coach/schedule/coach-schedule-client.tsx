"use client"

import { useState } from "react"
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
  setHours,
} from "date-fns"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

type ClassItem = {
  id: string
  title: string
  scheduledAt: string
  durationMins: number
  maxCapacity: number
  status: string
  workout: { name: string } | null
  registrations: { id: string }[]
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6) // 6 AM–7 PM
const HOUR_HEIGHT = 64

export function CoachScheduleClient({
  initialClasses,
  workouts,
}: {
  initialClasses: ClassItem[]
  workouts: { id: string; name: string }[]
}) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [classes, setClasses] = useState(initialClasses)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const weekStart = startOfWeek(currentWeek)
  const weekEnd = endOfWeek(currentWeek)
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  async function loadWeek(week: Date) {
    const from = startOfWeek(week)
    const to = endOfWeek(week)
    const res = await fetch(
      `/api/classes?coachId=me&from=${from.toISOString()}&to=${to.toISOString()}`
    )
    if (res.ok) setClasses(await res.json())
  }

  function changeWeek(dir: 1 | -1) {
    const next = dir === 1 ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1)
    setCurrentWeek(next)
    loadWeek(next)
  }

  async function handleCreateClass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedDate) return
    setIsCreating(true)
    const fd = new FormData(e.currentTarget)

    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        workoutId: fd.get("workoutId") || undefined,
        scheduledAt: selectedDate.toISOString(),
        durationMins: Number(fd.get("durationMins")),
        maxCapacity: Number(fd.get("maxCapacity")),
        location: fd.get("location") || undefined,
      }),
    })

    if (res.ok) {
      const newClass = await res.json()
      setClasses((prev) => [...prev, newClass])
      setSelectedDate(null)
    }
    setIsCreating(false)
  }

  async function cancelClass(classId: string) {
    await fetch(`/api/classes/${classId}`, { method: "DELETE" })
    setClasses((prev) => prev.filter((c) => c.id !== classId))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <Link href="/coach/schedule/availability">
          <Button variant="outline" size="sm">Set Availability</Button>
        </Link>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" onClick={() => changeWeek(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium min-w-48 text-center">
          {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </span>
        <Button variant="outline" size="sm" onClick={() => changeWeek(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setCurrentWeek(new Date()); loadWeek(new Date()) }}>
          Today
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden bg-background">
        {/* Header row */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 text-xs text-muted-foreground" />
          {days.map((day) => (
            <div key={day.toISOString()} className="p-2 text-center border-l">
              <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
              <p className={`text-sm font-semibold ${isSameDay(day, new Date()) ? "text-primary" : ""}`}>
                {format(day, "d")}
              </p>
            </div>
          ))}
        </div>

        {/* Time rows */}
        <div className="grid grid-cols-8">
          {/* Time labels */}
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b px-2 flex items-start pt-1">
                <span className="text-xs text-muted-foreground">{format(setHours(new Date(), h), "h a")}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayClasses = classes.filter((c) => isSameDay(parseISO(c.scheduledAt), day))
            return (
              <div key={day.toISOString()} className="border-l relative">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-b hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      const d = new Date(day)
                      d.setHours(h, 0, 0, 0)
                      setSelectedDate(d)
                    }}
                  />
                ))}
                {/* Class blocks */}
                {dayClasses.map((cls) => {
                  const start = parseISO(cls.scheduledAt)
                  const top = (start.getHours() - 6 + start.getMinutes() / 60) * HOUR_HEIGHT
                  const height = (cls.durationMins / 60) * HOUR_HEIGHT
                  const spots = cls.maxCapacity - cls.registrations.length
                  return (
                    <div
                      key={cls.id}
                      className="absolute left-1 right-1 bg-primary text-primary-foreground rounded p-1 text-xs overflow-hidden cursor-pointer group"
                      style={{ top: `${top}px`, height: `${Math.max(height, 20)}px` }}
                    >
                      <p className="font-medium truncate">{cls.title}</p>
                      <p className="opacity-80">{cls.registrations.length}/{cls.maxCapacity}</p>
                      <button
                        className="absolute top-1 right-1 hidden group-hover:block text-primary-foreground/70 hover:text-primary-foreground"
                        onClick={(e) => { e.stopPropagation(); cancelClass(cls.id) }}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Create Class Dialog */}
      <Dialog open={selectedDate !== null} onOpenChange={(o) => !o && setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Schedule Class — {selectedDate ? format(selectedDate, "EEE MMM d, h:mm a") : ""}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateClass} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Class Title</Label>
              <Input name="title" placeholder="e.g. Morning Strength" required />
            </div>
            <div className="space-y-2">
              <Label>Linked Workout (optional)</Label>
              <Select name="workoutId">
                <SelectTrigger>
                  <SelectValue placeholder="Select a workout..." />
                </SelectTrigger>
                <SelectContent>
                  {workouts.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input name="durationMins" type="number" min={15} max={180} defaultValue={60} required />
              </div>
              <div className="space-y-2">
                <Label>Max Capacity</Label>
                <Input name="maxCapacity" type="number" min={1} max={50} defaultValue={10} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <Input name="location" placeholder="e.g. Studio A" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedDate(null)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Class"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
