"use client";

/**
 * Program Schedule Panel Component
 * 
 * A comprehensive scheduling interface for enrolled programs that includes:
 * - Schedule setup wizard for new enrollments
 * - Calendar view with drag-and-drop
 * - List view of upcoming workouts
 * - Missed workout handling
 * - Schedule preferences management
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  List,
  Settings2,
  Play,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Clock,
  CalendarDays,
} from "lucide-react";
import { WorkoutCalendar } from "./workout-calendar";
import { DayPreferenceSelector } from "./day-preference-selector";
import { MissedWorkoutModal } from "./missed-workout-modal";

interface ScheduledWorkout {
  id: string;
  scheduledDate: string;
  scheduledTime?: string | null;
  status: "scheduled" | "completed" | "missed" | "skipped" | "rescheduled";
  originalDate?: string | null;
  rescheduledCount?: number;
  notes?: string | null;
  programWorkout: {
    id: string;
    name: string;
    focus: string;
    weekNumber: number;
    dayNumber: number;
    estimatedDuration: number;
    workoutPlanId?: string;
  };
  program?: {
    id: string;
    name: string;
    category: string;
  };
}

interface SchedulePreferences {
  preferredDays: number[];
  preferredTimeSlot?: string;
  reminderTime?: string;
  autoReschedule: boolean;
  rescheduleWindowDays: number;
  minRestDays: number;
  maxConsecutiveWorkoutDays: number;
}

interface ProgramSchedulePanelProps {
  programId: string;
  programName: string;
  isEnrolled: boolean;
  onStartWorkout?: (workout: ScheduledWorkout) => void;
  className?: string;
}

export function ProgramSchedulePanel({
  programId,
  programName,
  isEnrolled,
  onStartWorkout,
  className,
}: ProgramSchedulePanelProps) {
  const router = useRouter();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [preferences, setPreferences] = useState<SchedulePreferences>({
    preferredDays: [1, 3, 5],
    autoReschedule: true,
    rescheduleWindowDays: 2,
    minRestDays: 1,
    maxConsecutiveWorkoutDays: 3,
  });
  const [needsGeneration, setNeedsGeneration] = useState(false);
  const [missedWorkouts, setMissedWorkouts] = useState<ScheduledWorkout[]>([]);
  const [showMissedModal, setShowMissedModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch schedule data
  const fetchSchedule = useCallback(async () => {
    if (!isEnrolled) return;

    setIsLoading(true);
    try {
      const today = new Date();
      const start = startOfWeek(today);
      const end = addDays(endOfWeek(today), 14); // Two weeks ahead

      const response = await fetch(
        `/api/programs/${programId}/schedule?startDate=${format(start, "yyyy-MM-dd")}&endDate=${format(end, "yyyy-MM-dd")}`
      );

      if (!response.ok) throw new Error("Failed to fetch schedule");

      const data = await response.json();

      if (data.schedule) {
        setPreferences({
          ...preferences,
          ...data.schedule.preferences,
        });
      }

      setScheduledWorkouts(data.scheduledWorkouts || []);
      setNeedsGeneration(data.needsGeneration);

      // Check for missed workouts
      const missed = (data.scheduledWorkouts || []).filter(
        (w: ScheduledWorkout) => w.status === "missed"
      );
      if (missed.length > 0) {
        setMissedWorkouts(missed);
        setShowMissedModal(true);
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
    } finally {
      setIsLoading(false);
    }
  }, [programId, isEnrolled]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Generate schedule
  const generateSchedule = async (regenerate = false) => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/programs/${programId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: format(new Date(), "yyyy-MM-dd"),
          regenerate,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate schedule");

      const data = await response.json();
      setScheduledWorkouts(data.scheduledWorkouts || []);
      setNeedsGeneration(false);
    } catch (error) {
      console.error("Error generating schedule:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Update preferences
  const updatePreferences = async (newPreferences: Partial<SchedulePreferences>) => {
    try {
      const response = await fetch(`/api/programs/${programId}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...preferences, ...newPreferences }),
      });

      if (!response.ok) throw new Error("Failed to update preferences");

      setPreferences({ ...preferences, ...newPreferences });
    } catch (error) {
      console.error("Error updating preferences:", error);
    }
  };

  // Reschedule workout
  const handleReschedule = async (workoutId: string, newDate: string, reason?: string) => {
    try {
      const response = await fetch(`/api/schedule/workouts/${workoutId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          newDate,
          rescheduleReason: reason,
        }),
      });

      if (!response.ok) throw new Error("Failed to reschedule");

      // Update local state
      setScheduledWorkouts((prev) =>
        prev.map((w) =>
          w.id === workoutId
            ? {
                ...w,
                scheduledDate: newDate,
                status: "scheduled" as const,
                rescheduledCount: (w.rescheduledCount || 0) + 1,
              }
            : w
        )
      );
    } catch (error) {
      console.error("Error rescheduling:", error);
    }
  };

  // Skip workout
  const handleSkip = async (workoutId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/schedule/workouts/${workoutId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "skip",
          skipReason: reason,
        }),
      });

      if (!response.ok) throw new Error("Failed to skip");

      // Update local state
      setScheduledWorkouts((prev) =>
        prev.map((w) =>
          w.id === workoutId ? { ...w, status: "skipped" as const } : w
        )
      );
    } catch (error) {
      console.error("Error skipping:", error);
    }
  };

  // Complete workout
  const handleComplete = async (workoutId: string) => {
    try {
      const response = await fetch(`/api/schedule/workouts/${workoutId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });

      if (!response.ok) throw new Error("Failed to complete");

      // Update local state
      setScheduledWorkouts((prev) =>
        prev.map((w) =>
          w.id === workoutId ? { ...w, status: "completed" as const } : w
        )
      );
    } catch (error) {
      console.error("Error completing:", error);
    }
  };

  // Auto-reschedule missed workouts
  const handleAutoReschedule = async (strategy: "next_available" | "end_of_schedule" | "spread_evenly") => {
    try {
      const response = await fetch("/api/schedule/auto-reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy }),
      });

      if (!response.ok) throw new Error("Failed to auto-reschedule");

      // Refresh schedule
      await fetchSchedule();
    } catch (error) {
      console.error("Error auto-rescheduling:", error);
    }
  };

  // Handle workout click
  const handleWorkoutClick = (workout: ScheduledWorkout) => {
    if (workout.programWorkout.workoutPlanId) {
      router.push(`/workout/${workout.programWorkout.workoutPlanId}`);
    }
  };

  if (!isEnrolled) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Schedule Not Available</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Enroll in this program to access the schedule feature
          </p>
          <Button>Enroll Now</Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (needsGeneration) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Set Up Your Schedule
          </CardTitle>
          <CardDescription>
            Let's create a personalized workout schedule for {programName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DayPreferenceSelector
            selectedDays={preferences.preferredDays}
            onDaysChange={(days) => updatePreferences({ preferredDays: days })}
            preferredTimeSlot={preferences.preferredTimeSlot}
            onTimeSlotChange={(slot) => updatePreferences({ preferredTimeSlot: slot })}
            minRestDays={preferences.minRestDays}
            onMinRestDaysChange={(days) => updatePreferences({ minRestDays: days })}
            maxConsecutive={preferences.maxConsecutiveWorkoutDays}
            onMaxConsecutiveChange={(days) =>
              updatePreferences({ maxConsecutiveWorkoutDays: days })
            }
            autoReschedule={preferences.autoReschedule}
            onAutoRescheduleChange={(enabled) =>
              updatePreferences({ autoReschedule: enabled })
            }
          />

          <Button
            className="w-full"
            onClick={() => generateSchedule()}
            disabled={isGenerating || preferences.preferredDays.length === 0}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate My Schedule
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Stats
  const stats = {
    scheduled: scheduledWorkouts.filter((w) => w.status === "scheduled").length,
    completed: scheduledWorkouts.filter((w) => w.status === "completed").length,
    missed: scheduledWorkouts.filter((w) => w.status === "missed").length,
    upcoming: scheduledWorkouts.filter(
      (w) =>
        w.status === "scheduled" &&
        new Date(w.scheduledDate) >= new Date()
    ).length,
  };

  const nextWorkout = scheduledWorkouts.find(
    (w) =>
      w.status === "scheduled" &&
      format(new Date(w.scheduledDate), "yyyy-MM-dd") ===
        format(new Date(), "yyyy-MM-dd")
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Today's Workout CTA */}
      {nextWorkout && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Today's Workout</p>
                  <p className="text-lg font-semibold">{nextWorkout.programWorkout.name}</p>
                </div>
              </div>
              <Button onClick={() => onStartWorkout?.(nextWorkout)}>
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missed workouts alert */}
      {stats.missed > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium">
                  {stats.missed} missed workout{stats.missed !== 1 ? "s" : ""}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMissedModal(true)}
              >
                Handle Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Schedule Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Schedule</CardTitle>
              <CardDescription>
                {stats.upcoming} upcoming, {stats.completed} completed
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center border rounded-lg p-0.5">
                <Button
                  variant={view === "calendar" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("calendar")}
                  className="h-7 px-2"
                >
                  <Calendar className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={view === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("list")}
                  className="h-7 px-2"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Settings */}
              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Schedule Settings</SheetTitle>
                    <SheetDescription>
                      Customize your workout schedule preferences
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <DayPreferenceSelector
                      selectedDays={preferences.preferredDays}
                      onDaysChange={(days) => updatePreferences({ preferredDays: days })}
                      preferredTimeSlot={preferences.preferredTimeSlot}
                      onTimeSlotChange={(slot) =>
                        updatePreferences({ preferredTimeSlot: slot })
                      }
                      minRestDays={preferences.minRestDays}
                      onMinRestDaysChange={(days) =>
                        updatePreferences({ minRestDays: days })
                      }
                      maxConsecutive={preferences.maxConsecutiveWorkoutDays}
                      onMaxConsecutiveChange={(days) =>
                        updatePreferences({ maxConsecutiveWorkoutDays: days })
                      }
                      autoReschedule={preferences.autoReschedule}
                      onAutoRescheduleChange={(enabled) =>
                        updatePreferences({ autoReschedule: enabled })
                      }
                    />
                    <Button
                      className="w-full mt-6"
                      onClick={() => {
                        generateSchedule(true);
                        setSettingsOpen(false);
                      }}
                      disabled={isGenerating}
                    >
                      <RefreshCw
                        className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")}
                      />
                      Regenerate Schedule
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {view === "calendar" ? (
            <WorkoutCalendar
              workouts={scheduledWorkouts}
              onReschedule={handleReschedule}
              onSkip={handleSkip}
              onComplete={handleComplete}
              onWorkoutClick={handleWorkoutClick}
              onStartWorkout={onStartWorkout}
              preferredDays={preferences.preferredDays}
              showViewToggle={false}
            />
          ) : (
            <div className="space-y-2">
              {scheduledWorkouts
                .filter((w) => w.status === "scheduled" || w.status === "missed")
                .sort(
                  (a, b) =>
                    new Date(a.scheduledDate).getTime() -
                    new Date(b.scheduledDate).getTime()
                )
                .slice(0, 10)
                .map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleWorkoutClick(workout)}
                  >
                    <div className="flex items-center gap-3">
                      {workout.status === "missed" ? (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{workout.programWorkout.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(workout.scheduledDate), "EEEE, MMM d")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {workout.programWorkout.estimatedDuration}min
                      </Badge>
                      {workout.status === "missed" && (
                        <Badge variant="destructive">Missed</Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missed Workout Modal */}
      <MissedWorkoutModal
        open={showMissedModal}
        onOpenChange={setShowMissedModal}
        missedWorkouts={missedWorkouts}
        preferredDays={preferences.preferredDays}
        onReschedule={handleReschedule}
        onSkip={handleSkip}
        onAutoReschedule={handleAutoReschedule}
      />
    </div>
  );
}

export default ProgramSchedulePanel;
