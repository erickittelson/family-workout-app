"use client";

/**
 * Day Preference Selector Component
 * 
 * Allows users to select which days of the week they prefer to work out.
 * Features:
 * - Visual day selection with toggle
 * - Quick presets (3-day, 5-day, etc.)
 * - Time slot preference
 * - Rest day configuration
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Clock, Sparkles, CalendarDays } from "lucide-react";

interface DayPreferenceSelectorProps {
  selectedDays: number[];
  onDaysChange: (days: number[]) => void;
  preferredTimeSlot?: string;
  onTimeSlotChange?: (slot: string) => void;
  minRestDays?: number;
  onMinRestDaysChange?: (days: number) => void;
  maxConsecutive?: number;
  onMaxConsecutiveChange?: (days: number) => void;
  autoReschedule?: boolean;
  onAutoRescheduleChange?: (enabled: boolean) => void;
  compact?: boolean;
}

const DAYS = [
  { value: 0, label: "Sun", fullLabel: "Sunday" },
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
];

const TIME_SLOTS = [
  { value: "morning", label: "Morning", description: "6am - 12pm" },
  { value: "afternoon", label: "Afternoon", description: "12pm - 5pm" },
  { value: "evening", label: "Evening", description: "5pm - 9pm" },
  { value: "late_night", label: "Late Night", description: "9pm - 12am" },
];

const PRESETS = [
  {
    name: "3-Day (MWF)",
    days: [1, 3, 5],
    description: "Classic Mon/Wed/Fri split",
  },
  {
    name: "3-Day (TTSa)",
    days: [2, 4, 6],
    description: "Tue/Thu/Sat split",
  },
  {
    name: "4-Day (MTThF)",
    days: [1, 2, 4, 5],
    description: "Upper/Lower 4-day",
  },
  {
    name: "5-Day",
    days: [1, 2, 3, 4, 5],
    description: "Weekdays only",
  },
  {
    name: "6-Day PPL",
    days: [1, 2, 3, 4, 5, 6],
    description: "Push/Pull/Legs x2",
  },
  {
    name: "Weekend Warrior",
    days: [0, 6],
    description: "Weekends only",
  },
];

export function DayPreferenceSelector({
  selectedDays,
  onDaysChange,
  preferredTimeSlot,
  onTimeSlotChange,
  minRestDays = 1,
  onMinRestDaysChange,
  maxConsecutive = 3,
  onMaxConsecutiveChange,
  autoReschedule = true,
  onAutoRescheduleChange,
  compact = false,
}: DayPreferenceSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Toggle a day
  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      onDaysChange(selectedDays.filter((d) => d !== day));
    } else {
      onDaysChange([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  // Apply preset
  const applyPreset = (days: number[]) => {
    onDaysChange(days);
  };

  // Check if preset matches current selection
  const isPresetActive = (presetDays: number[]) => {
    return (
      presetDays.length === selectedDays.length &&
      presetDays.every((d) => selectedDays.includes(d))
    );
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Compact day selector */}
        <div className="flex items-center gap-1">
          {DAYS.map((day) => (
            <button
              key={day.value}
              onClick={() => toggleDay(day.value)}
              className={cn(
                "w-9 h-9 rounded-full text-sm font-medium transition-all",
                selectedDays.includes(day.value)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {day.label.charAt(0)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedDays.length} days selected
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Day Selection */}
      <div className="space-y-4">
        <div>
          <Label className="text-base">Workout Days</Label>
          <p className="text-sm text-muted-foreground">
            Select which days you prefer to work out
          </p>
        </div>

        {/* Day buttons */}
        <div className="flex items-center justify-between gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              onClick={() => toggleDay(day.value)}
              className={cn(
                "flex-1 py-3 rounded-lg border-2 transition-all text-center",
                selectedDays.includes(day.value)
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-background border-border hover:border-primary/50"
              )}
            >
              <div className="text-sm font-medium">{day.label}</div>
            </button>
          ))}
        </div>

        {/* Selected count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedDays.length} day{selectedDays.length !== 1 ? "s" : ""} per
            week selected
          </span>
          {selectedDays.length > 5 && (
            <Badge variant="outline" className="text-amber-600">
              High volume
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Quick Presets
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset.days)}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                isPresetActive(preset.days)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="font-medium text-sm">{preset.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Slot Preference */}
      {onTimeSlotChange && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Preferred Time
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.value}
                onClick={() => onTimeSlotChange(slot.value)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  preferredTimeSlot === slot.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="font-medium text-sm">{slot.label}</div>
                <div className="text-xs text-muted-foreground">
                  {slot.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Settings Toggle */}
      <Button
        variant="ghost"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full justify-start text-muted-foreground"
      >
        <CalendarDays className="h-4 w-4 mr-2" />
        {showAdvanced ? "Hide" : "Show"} Advanced Settings
      </Button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Advanced Schedule Settings</CardTitle>
            <CardDescription>
              Fine-tune how your schedule is generated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Min Rest Days */}
            {onMinRestDaysChange && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Minimum Rest Days Between Workouts</Label>
                  <Badge variant="secondary">{minRestDays} day{minRestDays !== 1 ? "s" : ""}</Badge>
                </div>
                <Slider
                  value={[minRestDays]}
                  onValueChange={([value]) => onMinRestDaysChange(value)}
                  min={0}
                  max={3}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Ensure at least {minRestDays} rest day{minRestDays !== 1 ? "s" : ""} between
                  consecutive workout days
                </p>
              </div>
            )}

            {/* Max Consecutive Days */}
            {onMaxConsecutiveChange && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Maximum Consecutive Workout Days</Label>
                  <Badge variant="secondary">{maxConsecutive} day{maxConsecutive !== 1 ? "s" : ""}</Badge>
                </div>
                <Slider
                  value={[maxConsecutive]}
                  onValueChange={([value]) => onMaxConsecutiveChange(value)}
                  min={1}
                  max={7}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Never schedule more than {maxConsecutive} workout day{maxConsecutive !== 1 ? "s" : ""} in a row
                </p>
              </div>
            )}

            {/* Auto Reschedule */}
            {onAutoRescheduleChange && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Reschedule Missed Workouts</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically move missed workouts to the next available day
                  </p>
                </div>
                <Switch
                  checked={autoReschedule}
                  onCheckedChange={onAutoRescheduleChange}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Schedule Preview</p>
              <p className="text-xs text-muted-foreground">
                You'll work out on{" "}
                <span className="text-foreground font-medium">
                  {selectedDays.length > 0
                    ? selectedDays
                        .map((d) => DAYS.find((day) => day.value === d)?.fullLabel)
                        .join(", ")
                    : "no days (select some!)"}
                </span>
                {preferredTimeSlot && (
                  <>
                    {" "}
                    in the{" "}
                    <span className="text-foreground font-medium">
                      {TIME_SLOTS.find((s) => s.value === preferredTimeSlot)?.label.toLowerCase()}
                    </span>
                  </>
                )}
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DayPreferenceSelector;
