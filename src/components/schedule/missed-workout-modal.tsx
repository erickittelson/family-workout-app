"use client";

/**
 * Missed Workout Modal Component
 * 
 * Detects and handles missed workouts with options to:
 * - Reschedule to a new date
 * - Skip with a reason
 * - Auto-reschedule all missed workouts
 */

import { useState, useEffect } from "react";
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertCircle,
  CalendarDays,
  RefreshCw,
  SkipForward,
  ChevronRight,
  Sparkles,
  Clock,
  XCircle,
} from "lucide-react";

interface MissedWorkout {
  id: string;
  scheduledDate: string;
  programWorkout: {
    id: string;
    name: string;
    focus: string;
    weekNumber: number;
    dayNumber: number;
    estimatedDuration: number;
  };
  program?: {
    name: string;
  };
  rescheduledCount?: number;
}

interface MissedWorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missedWorkouts: MissedWorkout[];
  preferredDays: number[];
  onReschedule: (workoutId: string, newDate: string, reason?: string) => void;
  onSkip: (workoutId: string, reason?: string) => void;
  onAutoReschedule: (strategy: "next_available" | "end_of_schedule" | "spread_evenly") => void;
  isLoading?: boolean;
}

type ActionMode = "individual" | "batch";
type IndividualAction = "reschedule" | "skip";
type BatchStrategy = "next_available" | "end_of_schedule" | "spread_evenly";

const SKIP_REASONS = [
  "I was sick",
  "Travel/vacation",
  "Work emergency",
  "Family obligation",
  "Needed extra rest",
  "Other",
];

const BATCH_STRATEGIES = [
  {
    value: "next_available" as const,
    title: "Next Available",
    description: "Reschedule to the next open preferred day",
    icon: CalendarDays,
  },
  {
    value: "end_of_schedule" as const,
    title: "End of Schedule",
    description: "Add missed workouts to the end of your program",
    icon: ChevronRight,
  },
  {
    value: "spread_evenly" as const,
    title: "Spread Evenly",
    description: "Distribute across available days over the next few weeks",
    icon: Sparkles,
  },
];

export function MissedWorkoutModal({
  open,
  onOpenChange,
  missedWorkouts,
  preferredDays,
  onReschedule,
  onSkip,
  onAutoReschedule,
  isLoading = false,
}: MissedWorkoutModalProps) {
  const [mode, setMode] = useState<ActionMode>("batch");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [action, setAction] = useState<IndividualAction>("reschedule");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [skipReason, setSkipReason] = useState("");
  const [customSkipReason, setCustomSkipReason] = useState("");
  const [batchStrategy, setBatchStrategy] = useState<BatchStrategy>("next_available");

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setMode(missedWorkouts.length > 1 ? "batch" : "individual");
      setCurrentIndex(0);
      setAction("reschedule");
      setSelectedDate(undefined);
      setSkipReason("");
      setCustomSkipReason("");
    }
  }, [open, missedWorkouts.length]);

  const currentWorkout = missedWorkouts[currentIndex];
  const hasMoreWorkouts = currentIndex < missedWorkouts.length - 1;

  // Calculate suggested dates for rescheduling
  const getSuggestedDates = () => {
    const today = startOfDay(new Date());
    const suggestions: Date[] = [];
    let checkDate = today;
    
    while (suggestions.length < 3) {
      checkDate = addDays(checkDate, 1);
      if (preferredDays.includes(checkDate.getDay())) {
        suggestions.push(checkDate);
      }
    }
    
    return suggestions;
  };

  const suggestedDates = getSuggestedDates();

  // Handle individual workout action
  const handleIndividualAction = () => {
    if (!currentWorkout) return;

    if (action === "reschedule" && selectedDate) {
      onReschedule(
        currentWorkout.id,
        format(selectedDate, "yyyy-MM-dd"),
        "Rescheduled from missed workout"
      );
    } else if (action === "skip") {
      const reason = skipReason === "Other" ? customSkipReason : skipReason;
      onSkip(currentWorkout.id, reason);
    }

    if (hasMoreWorkouts) {
      setCurrentIndex(currentIndex + 1);
      setAction("reschedule");
      setSelectedDate(undefined);
      setSkipReason("");
      setCustomSkipReason("");
    } else {
      onOpenChange(false);
    }
  };

  // Handle batch auto-reschedule
  const handleBatchReschedule = () => {
    onAutoReschedule(batchStrategy);
    onOpenChange(false);
  };

  // Handle skip all
  const handleSkipAll = () => {
    missedWorkouts.forEach((workout) => {
      onSkip(workout.id, "Batch skipped");
    });
    onOpenChange(false);
  };

  if (!currentWorkout && mode === "individual") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle>
              {missedWorkouts.length === 1
                ? "Missed Workout"
                : `${missedWorkouts.length} Missed Workouts`}
            </DialogTitle>
          </div>
          <DialogDescription>
            {missedWorkouts.length === 1
              ? "You missed a scheduled workout. What would you like to do?"
              : "You have missed workouts that need attention."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode selector for multiple workouts */}
        {missedWorkouts.length > 1 && (
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={mode === "batch" ? "secondary" : "ghost"}
              className="flex-1"
              onClick={() => setMode("batch")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Handle All at Once
            </Button>
            <Button
              variant={mode === "individual" ? "secondary" : "ghost"}
              className="flex-1"
              onClick={() => setMode("individual")}
            >
              <Clock className="h-4 w-4 mr-2" />
              One by One
            </Button>
          </div>
        )}

        {/* Batch Mode */}
        {mode === "batch" && missedWorkouts.length > 1 && (
          <div className="space-y-4">
            {/* Missed workouts summary */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {missedWorkouts.slice(0, 3).map((workout) => (
                    <div
                      key={workout.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium truncate">
                        {workout.programWorkout.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(workout.scheduledDate), "MMM d")}
                      </Badge>
                    </div>
                  ))}
                  {missedWorkouts.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      + {missedWorkouts.length - 3} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Strategy selection */}
            <div className="space-y-3">
              <Label>Choose how to reschedule</Label>
              <RadioGroup
                value={batchStrategy}
                onValueChange={(v) => setBatchStrategy(v as BatchStrategy)}
                className="space-y-2"
              >
                {BATCH_STRATEGIES.map((strategy) => (
                  <div
                    key={strategy.value}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      batchStrategy === strategy.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setBatchStrategy(strategy.value)}
                  >
                    <RadioGroupItem value={strategy.value} id={strategy.value} />
                    <div className="flex-1">
                      <Label
                        htmlFor={strategy.value}
                        className="font-medium cursor-pointer"
                      >
                        {strategy.title}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {strategy.description}
                      </p>
                    </div>
                    <strategy.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Individual Mode */}
        {mode === "individual" && currentWorkout && (
          <div className="space-y-4">
            {/* Progress indicator */}
            {missedWorkouts.length > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Workout {currentIndex + 1} of {missedWorkouts.length}
                </span>
                <div className="flex gap-1">
                  {missedWorkouts.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full",
                        i < currentIndex
                          ? "bg-green-500"
                          : i === currentIndex
                          ? "bg-primary"
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Current workout info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {currentWorkout.programWorkout.name}
                </CardTitle>
                <CardDescription>
                  {currentWorkout.programWorkout.focus}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">
                    Originally: {format(new Date(currentWorkout.scheduledDate), "MMM d")}
                  </Badge>
                  <Badge variant="secondary">
                    {currentWorkout.programWorkout.estimatedDuration} min
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Action selection */}
            <div className="flex gap-2">
              <Button
                variant={action === "reschedule" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setAction("reschedule")}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
              <Button
                variant={action === "skip" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setAction("skip")}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip
              </Button>
            </div>

            {/* Reschedule options */}
            {action === "reschedule" && (
              <div className="space-y-3">
                <Label>Pick a new date</Label>
                
                {/* Quick suggestions */}
                <div className="flex gap-2">
                  {suggestedDates.map((date) => (
                    <Button
                      key={date.toISOString()}
                      variant={
                        selectedDate && format(selectedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedDate(date)}
                    >
                      {format(date, "EEE, MMM d")}
                    </Button>
                  ))}
                </div>

                {/* Calendar picker */}
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) =>
                    isBefore(date, startOfDay(new Date()))
                  }
                  modifiers={{
                    preferred: (date) => preferredDays.includes(date.getDay()),
                  }}
                  modifiersClassNames={{
                    preferred: "ring-2 ring-green-500 ring-offset-2",
                  }}
                  className="rounded-md border"
                />
              </div>
            )}

            {/* Skip options */}
            {action === "skip" && (
              <div className="space-y-3">
                <Label>Why did you miss this workout?</Label>
                <RadioGroup
                  value={skipReason}
                  onValueChange={setSkipReason}
                  className="grid grid-cols-2 gap-2"
                >
                  {SKIP_REASONS.map((reason) => (
                    <div
                      key={reason}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                        skipReason === reason
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setSkipReason(reason)}
                    >
                      <RadioGroupItem value={reason} id={reason} />
                      <Label htmlFor={reason} className="text-sm cursor-pointer">
                        {reason}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                
                {skipReason === "Other" && (
                  <Textarea
                    placeholder="Tell us more..."
                    value={customSkipReason}
                    onChange={(e) => setCustomSkipReason(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {mode === "batch" ? (
            <>
              <Button variant="outline" onClick={handleSkipAll} disabled={isLoading}>
                <XCircle className="h-4 w-4 mr-2" />
                Skip All
              </Button>
              <Button onClick={handleBatchReschedule} disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reschedule All
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (hasMoreWorkouts) {
                    setCurrentIndex(currentIndex + 1);
                  } else {
                    onOpenChange(false);
                  }
                }}
              >
                {hasMoreWorkouts ? "Skip to Next" : "Cancel"}
              </Button>
              <Button
                onClick={handleIndividualAction}
                disabled={
                  isLoading ||
                  (action === "reschedule" && !selectedDate) ||
                  (action === "skip" && !skipReason)
                }
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : action === "reschedule" ? (
                  <RefreshCw className="h-4 w-4 mr-2" />
                ) : (
                  <SkipForward className="h-4 w-4 mr-2" />
                )}
                {action === "reschedule" ? "Reschedule" : "Skip"}
                {hasMoreWorkouts && " & Next"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MissedWorkoutModal;
