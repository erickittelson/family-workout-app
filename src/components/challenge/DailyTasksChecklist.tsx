"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Droplets,
  Book,
  Camera,
  Dumbbell,
  Apple,
  Brain,
  Footprints,
  Target,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyTask {
  name: string;
  description?: string;
  type: "workout" | "nutrition" | "hydration" | "mindset" | "custom" | "pr_check" | "reading" | "steps" | "photo";
  isRequired: boolean;
  // For PR-linked tasks
  exercise?: string;
  targetValue?: number;
  targetUnit?: string;
}

interface TaskCompletion {
  taskName: string;
  completed: boolean;
}

interface DailyTasksChecklistProps {
  tasks: DailyTask[];
  completions: TaskCompletion[];
  onToggle: (taskName: string, completed: boolean) => void;
  compact?: boolean;
  showProgress?: boolean;
  prStatus?: Record<string, { achieved: boolean; currentValue?: number }>;
}

// Icon mapping for task types
const taskIcons: Record<string, React.ReactNode> = {
  workout: <Dumbbell className="h-4 w-4" />,
  nutrition: <Apple className="h-4 w-4" />,
  hydration: <Droplets className="h-4 w-4" />,
  reading: <Book className="h-4 w-4" />,
  photo: <Camera className="h-4 w-4" />,
  mindset: <Brain className="h-4 w-4" />,
  steps: <Footprints className="h-4 w-4" />,
  pr_check: <Target className="h-4 w-4" />,
  custom: <Circle className="h-4 w-4" />,
};

export function DailyTasksChecklist({
  tasks,
  completions,
  onToggle,
  compact = false,
  showProgress = true,
  prStatus = {},
}: DailyTasksChecklistProps) {
  const completionMap = new Map(completions.map((c) => [c.taskName, c.completed]));
  const completedCount = completions.filter((c) => c.completed).length;
  const requiredTasks = tasks.filter((t) => t.isRequired);
  const requiredCompleted = requiredTasks.filter((t) => completionMap.get(t.name)).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <Card className={cn(compact && "border-0 shadow-none")}>
      {!compact && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Daily Tasks
            </CardTitle>
            <Badge variant={requiredCompleted === requiredTasks.length ? "default" : "secondary"}>
              {completedCount}/{tasks.length}
            </Badge>
          </div>
          {showProgress && <Progress value={progress} className="h-1.5 mt-2" />}
        </CardHeader>
      )}
      <CardContent className={cn("space-y-2", compact && "p-0")}>
        {tasks.map((task) => {
          const isCompleted = completionMap.get(task.name) || false;
          const isPRTask = task.type === "pr_check";
          const prInfo = isPRTask && task.exercise ? prStatus[task.exercise] : null;
          const isPRAchieved = prInfo?.achieved;

          return (
            <div
              key={task.name}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                isCompleted
                  ? "bg-success/10 border-success/30"
                  : "bg-card hover:bg-accent/50",
                isPRTask && isPRAchieved && "border-amber-500/30 bg-amber-500/10"
              )}
              onClick={() => {
                // Don't allow manual toggle for PR tasks
                if (!isPRTask) {
                  onToggle(task.name, !isCompleted);
                }
              }}
            >
              <div className="mt-0.5">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : isPRAchieved ? (
                  <CheckCircle2 className="h-5 w-5 text-amber-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    isCompleted && "line-through text-muted-foreground"
                  )}>
                    {task.name}
                  </span>
                  {task.isRequired && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Required
                    </Badge>
                  )}
                  {isPRTask && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600">
                      PR
                    </Badge>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {task.description}
                  </p>
                )}
                {isPRTask && task.exercise && task.targetValue && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Target: {task.targetValue} {task.targetUnit || "lbs"} {task.exercise}
                    </span>
                    {prInfo?.currentValue && (
                      <span className="text-xs text-muted-foreground">
                        (Current: {prInfo.currentValue})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className={cn(
                "flex items-center justify-center h-6 w-6 rounded",
                "text-muted-foreground"
              )}>
                {taskIcons[task.type] || taskIcons.custom}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default DailyTasksChecklist;
