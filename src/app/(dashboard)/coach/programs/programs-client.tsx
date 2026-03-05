"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Dumbbell, Users, Trash2 } from "lucide-react"

interface Program {
  id: string
  name: string
  description: string | null
  durationWeeks: number
  isActive: boolean
  isPublic: boolean
  _count: { workouts: number; enrollments: number }
}

export function ProgramsClient({ programs: initial }: { programs: Program[] }) {
  const router = useRouter()
  const [programs, setPrograms] = useState(initial)
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    const fd = new FormData(e.currentTarget)

    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        description: fd.get("description") || undefined,
        durationWeeks: Number(fd.get("durationWeeks")),
      }),
    })

    if (res.ok) {
      setOpen(false)
      router.refresh()
    }
    setIsLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this program? This cannot be undone.")) return
    await fetch(`/api/programs/${id}`, { method: "DELETE" })
    setPrograms((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Training Programs</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Program
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Training Program</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="name">Program Name</Label>
                <Input id="name" name="name" placeholder="e.g. 12-Week Strength Builder" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="What is this program about?" rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationWeeks">Duration (weeks)</Label>
                <Input id="durationWeeks" name="durationWeeks" type="number" min={1} max={52} defaultValue={4} required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Program"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {programs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No programs yet</p>
          <p className="text-sm">Create your first training program to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <Card key={program.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">{program.name}</CardTitle>
                  <Badge variant={program.isActive ? "default" : "secondary"} className="shrink-0 ml-2">
                    {program.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {program.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {program.description}
                  </p>
                )}
                <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                  <span>{program.durationWeeks}w</span>
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" /> {program._count.workouts}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {program._count.enrollments}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/coach/programs/${program.id}/builder`)}
                  >
                    Open Builder
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(program.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
