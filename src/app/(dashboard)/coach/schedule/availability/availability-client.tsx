"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, Plus, ChevronLeft } from "lucide-react"
import Link from "next/link"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6
  const min = i % 2 === 0 ? "00" : "30"
  return `${hour.toString().padStart(2, "0")}:${min}`
})

type Slot = {
  id?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

export function AvailabilityClient({ initialSlots }: { initialSlots: Slot[] }) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function addSlot(dayOfWeek: number) {
    setSlots((prev) => [...prev, { dayOfWeek, startTime: "09:00", endTime: "17:00", isActive: true }])
    setSaved(false)
  }

  function updateSlot(index: number, field: keyof Slot, value: string | boolean) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
    setSaved(false)
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index))
    setSaved(false)
  }

  async function save() {
    setIsSaving(true)
    await fetch("/api/coach/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots }),
    })
    setIsSaving(false)
    setSaved(true)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/coach/schedule">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Schedule
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Set Availability</h1>
      </div>

      <div className="space-y-4 max-w-2xl">
        {DAYS.map((day, dayIdx) => {
          const daySlots = slots
            .map((s, i) => ({ ...s, _idx: i }))
            .filter((s) => s.dayOfWeek === dayIdx)

          return (
            <div key={day} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{day}</h3>
                <Button variant="outline" size="sm" onClick={() => addSlot(dayIdx)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Slot
                </Button>
              </div>

              {daySlots.length === 0 && (
                <p className="text-sm text-muted-foreground">No availability set</p>
              )}

              {daySlots.map((slot) => (
                <div key={slot._idx} className="flex items-center gap-3 mb-2">
                  <Switch
                    checked={slot.isActive}
                    onCheckedChange={(v) => updateSlot(slot._idx, "isActive", v)}
                  />
                  <Select
                    value={slot.startTime}
                    onValueChange={(v) => updateSlot(slot._idx, "startTime", v)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-sm">to</span>
                  <Select
                    value={slot.endTime}
                    onValueChange={(v) => updateSlot(slot._idx, "endTime", v)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSlot(slot._idx)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )
        })}

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Availability"}
          </Button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </div>
    </div>
  )
}
