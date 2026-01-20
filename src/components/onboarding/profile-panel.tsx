"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Ruler,
  Scale,
  Activity,
  Target,
  AlertTriangle,
  Trophy,
  Calendar,
  Dumbbell,
  ChevronRight,
  Check,
  Pencil,
  X,
  Sparkles,
  Heart,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ExtractedProfileData {
  name?: string;
  age?: number;
  gender?: "male" | "female" | "other";
  heightFeet?: number;
  heightInches?: number;
  weight?: number;
  bodyFatPercentage?: number;
  fitnessLevel?: "beginner" | "intermediate" | "advanced" | "elite";
  primaryMotivation?: string;
  primaryGoal?: {
    type: string;
    description: string;
    targetValue?: number;
    targetUnit?: string;
  };
  secondaryGoals?: string[];
  timeline?: string;
  targetWeight?: number;
  limitations?: Array<{
    bodyPart: string;
    condition: string;
    severity?: "mild" | "moderate" | "severe";
    avoidMovements?: string[];
  }>;
  personalRecords?: Array<{
    exercise: string;
    value: number;
    unit: string;
    isEstimate?: boolean;
  }>;
  workoutDuration?: number;
  equipmentAccess?: string[];
  workoutDays?: string[];
  trainingFrequency?: number;
  currentActivity?: string;
}

// Phase configuration - matches onboarding conversation flow
interface PhaseConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  fields: Array<{
    key: keyof ExtractedProfileData;
    label: string;
    format?: (value: unknown, data: ExtractedProfileData) => string;
  }>;
}

const PHASES: PhaseConfig[] = [
  {
    id: "welcome",
    label: "Getting Started",
    icon: <Sparkles className="w-4 h-4" />,
    fields: [
      { key: "name", label: "Name" },
      { key: "primaryMotivation", label: "Motivation" },
    ],
  },
  {
    id: "basics",
    label: "Basic Info",
    icon: <User className="w-4 h-4" />,
    fields: [
      { key: "age", label: "Age", format: (v) => `${v} years` },
      {
        key: "gender",
        label: "Gender",
        format: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1),
      },
      {
        key: "heightFeet",
        label: "Height",
        format: (v, data) =>
          data.heightInches !== undefined
            ? `${v}'${data.heightInches}"`
            : `${v} ft`,
      },
      { key: "weight", label: "Weight", format: (v) => `${v} lbs` },
    ],
  },
  {
    id: "fitness_background",
    label: "Fitness Level",
    icon: <Activity className="w-4 h-4" />,
    fields: [
      {
        key: "fitnessLevel",
        label: "Experience",
        format: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1),
      },
      {
        key: "trainingFrequency",
        label: "Training Days",
        format: (v) => `${v}x per week`,
      },
      { key: "currentActivity", label: "Current Activity" },
    ],
  },
  {
    id: "goals",
    label: "Goals",
    icon: <Target className="w-4 h-4" />,
    fields: [
      {
        key: "primaryGoal",
        label: "Primary Goal",
        format: (v) => {
          const goal = v as ExtractedProfileData["primaryGoal"];
          return goal?.description || goal?.type || "";
        },
      },
      { key: "timeline", label: "Timeline" },
    ],
  },
  {
    id: "body_composition",
    label: "Body Composition",
    icon: <Scale className="w-4 h-4" />,
    fields: [
      { key: "bodyFatPercentage", label: "Body Fat", format: (v) => `~${v}%` },
      { key: "targetWeight", label: "Target Weight", format: (v) => `${v} lbs` },
    ],
  },
  {
    id: "limitations",
    label: "Limitations",
    icon: <AlertTriangle className="w-4 h-4" />,
    fields: [], // Special handling for limitations array
  },
  {
    id: "personal_records",
    label: "Personal Records",
    icon: <Trophy className="w-4 h-4" />,
    fields: [], // Special handling for PR array
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: <Dumbbell className="w-4 h-4" />,
    fields: [
      {
        key: "workoutDuration",
        label: "Workout Length",
        format: (v) => `${v} min`,
      },
      {
        key: "equipmentAccess",
        label: "Equipment",
        format: (v) => (Array.isArray(v) ? v.slice(0, 2).join(", ") + (v.length > 2 ? "..." : "") : String(v)),
      },
      {
        key: "workoutDays",
        label: "Preferred Days",
        format: (v) => (Array.isArray(v) ? v.slice(0, 3).join(", ") + (v.length > 3 ? "..." : "") : String(v)),
      },
    ],
  },
];

interface ProfilePanelProps {
  data: ExtractedProfileData;
  currentPhase: string;
  onEdit?: (key: string, currentValue: unknown) => void;
  onReviewClick?: () => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ProfilePanel({
  data,
  currentPhase,
  onEdit,
  onReviewClick,
  className,
  isCollapsed = false,
  onToggleCollapse,
}: ProfilePanelProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>("welcome");
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const prevDataRef = useRef<ExtractedProfileData>({});

  // Track changes and highlight newly updated fields
  useEffect(() => {
    const newUpdates = new Set<string>();
    let latestField: string | null = null;
    let latestPhase: string | null = null;

    // Check each field for changes
    for (const phase of PHASES) {
      for (const field of phase.fields) {
        const prevValue = prevDataRef.current[field.key];
        const currValue = data[field.key];

        if (currValue !== undefined && currValue !== prevValue) {
          newUpdates.add(field.key);
          latestField = field.key;
          latestPhase = phase.id;
        }
      }

      // Check special arrays
      if (phase.id === "limitations") {
        const prevLim = prevDataRef.current.limitations;
        const currLim = data.limitations;
        if (JSON.stringify(currLim) !== JSON.stringify(prevLim) && currLim?.length) {
          newUpdates.add("limitations");
          latestField = "limitations";
          latestPhase = "limitations";
        }
      }

      if (phase.id === "personal_records") {
        const prevPR = prevDataRef.current.personalRecords;
        const currPR = data.personalRecords;
        if (JSON.stringify(currPR) !== JSON.stringify(prevPR) && currPR?.length) {
          newUpdates.add("personalRecords");
          latestField = "personalRecords";
          latestPhase = "personal_records";
        }
      }
    }

    if (newUpdates.size > 0) {
      setRecentlyUpdated(newUpdates);
      setHighlightedField(latestField);

      // Auto-expand the phase with the latest update
      if (latestPhase) {
        setExpandedPhase(latestPhase);
      }

      // Clear highlights after animation
      const timeout = setTimeout(() => {
        setRecentlyUpdated(new Set());
        setHighlightedField(null);
      }, 2000);

      prevDataRef.current = { ...data };
      return () => clearTimeout(timeout);
    }

    prevDataRef.current = { ...data };
  }, [data]);

  // Get phase progress
  const getPhaseProgress = (phase: PhaseConfig) => {
    if (phase.id === "limitations") {
      return {
        filled: data.limitations?.length ? 1 : 0,
        total: 1,
        hasData: !!data.limitations?.length,
      };
    }
    if (phase.id === "personal_records") {
      return {
        filled: data.personalRecords?.length ? 1 : 0,
        total: 1,
        hasData: !!data.personalRecords?.length,
      };
    }

    const filledCount = phase.fields.filter(
      (f) => data[f.key] !== undefined
    ).length;
    return {
      filled: filledCount,
      total: phase.fields.length,
      hasData: filledCount > 0,
    };
  };

  // Get total progress
  const allFields = PHASES.flatMap((p) => p.fields);
  const filledFields = allFields.filter((f) => data[f.key] !== undefined).length;
  const totalFields = allFields.length;
  // Add special fields
  const totalWithSpecial = totalFields + 2; // limitations + PRs
  const filledWithSpecial = filledFields +
    (data.limitations?.length ? 1 : 0) +
    (data.personalRecords?.length ? 1 : 0);
  const progressPercent = Math.round((filledWithSpecial / totalWithSpecial) * 100);

  // Collapsed view
  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: 320 }}
        animate={{ width: 56 }}
        className={cn(
          "h-full flex flex-col items-center py-4 border-r border-border/50",
          "bg-sidebar",
          className
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Progress ring */}
        <div className="relative w-10 h-10 mb-6">
          <svg className="w-10 h-10 -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${progressPercent} 100`}
            />
            <defs>
              <linearGradient
                id="progressGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="oklch(0.65 0.28 280)" />
                <stop offset="100%" stopColor="oklch(0.70 0.25 330)" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
            {filledWithSpecial}
          </span>
        </div>

        {/* Phase indicators */}
        <div className="flex flex-col gap-2">
          {PHASES.map((phase) => {
            const progress = getPhaseProgress(phase);
            const isComplete = progress.filled === progress.total && progress.total > 0;
            const isActive = currentPhase === phase.id;
            return (
              <div
                key={phase.id}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  "transition-all duration-200",
                  isComplete
                    ? "bg-success/20 text-success"
                    : progress.hasData
                    ? "bg-brand/20 text-brand"
                    : isActive
                    ? "bg-muted text-foreground ring-1 ring-brand/50"
                    : "bg-muted/50 text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="w-4 h-4" /> : phase.icon}
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 56 }}
      animate={{ width: 320 }}
      className={cn(
        "h-full flex flex-col border-r border-border/50",
        "bg-sidebar",
        className
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Your Profile</h2>
          <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-energy-gradient rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Phases in sequential order */}
      <div className="flex-1 overflow-y-auto py-2">
        {PHASES.map((phase, phaseIdx) => {
          const progress = getPhaseProgress(phase);
          const isExpanded = expandedPhase === phase.id;
          const isCurrentPhase = currentPhase === phase.id;
          const hasUpdates = phase.fields.some((f) => recentlyUpdated.has(f.key)) ||
            (phase.id === "limitations" && recentlyUpdated.has("limitations")) ||
            (phase.id === "personal_records" && recentlyUpdated.has("personalRecords"));

          return (
            <div key={phase.id} className="mb-1">
              {/* Phase header */}
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3",
                  "hover:bg-accent/50 transition-all duration-200",
                  isExpanded && "bg-accent/30",
                  hasUpdates && "bg-brand/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      "transition-all duration-200",
                      progress.filled === progress.total && progress.total > 0
                        ? "bg-success/20 text-success"
                        : progress.hasData
                        ? "bg-brand/20 text-brand"
                        : isCurrentPhase
                        ? "bg-muted text-foreground ring-1 ring-brand/50"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {progress.filled === progress.total && progress.total > 0 ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      phase.icon
                    )}
                  </div>
                  <div className="text-left">
                    <p className={cn(
                      "text-sm font-medium",
                      progress.hasData ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {phase.label}
                    </p>
                    {progress.total > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {progress.filled} of {progress.total}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
              </button>

              {/* Phase fields */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-2 space-y-1">
                      {/* Regular fields */}
                      {phase.fields.map((field) => {
                        const value = data[field.key];
                        const isFilled = value !== undefined;
                        const isHighlighted = highlightedField === field.key;
                        const isRecentlyUpdated = recentlyUpdated.has(field.key);
                        const displayValue = isFilled
                          ? field.format
                            ? field.format(value, data)
                            : String(value)
                          : "—";

                        return (
                          <motion.div
                            key={field.key}
                            initial={isRecentlyUpdated ? { scale: 1.02, backgroundColor: "oklch(0.65 0.28 280 / 0.15)" } : false}
                            animate={{ scale: 1, backgroundColor: isHighlighted ? "oklch(0.65 0.28 280 / 0.1)" : "transparent" }}
                            transition={{ duration: 0.3 }}
                            className={cn(
                              "group flex items-center justify-between py-2 px-3 rounded-lg",
                              "transition-colors duration-200",
                              isHighlighted && "ring-1 ring-brand/30",
                              isFilled && !isHighlighted && "hover:bg-accent/30",
                              !isFilled && "opacity-50"
                            )}
                          >
                            <span className="text-sm text-muted-foreground">
                              {field.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm font-medium truncate max-w-[120px]",
                                  isFilled ? "text-foreground" : "text-muted-foreground"
                                )}
                              >
                                {displayValue}
                              </span>
                              {isFilled && onEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEdit(field.key, value)}
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-accent"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* Limitations special handling */}
                      {phase.id === "limitations" && (
                        <>
                          {data.limitations && data.limitations.length > 0 ? (
                            <div className="space-y-2">
                              {data.limitations.map((lim, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={recentlyUpdated.has("limitations") ? { scale: 1.02 } : false}
                                  animate={{ scale: 1 }}
                                  className="flex items-start gap-2 py-2 px-3 rounded-lg bg-destructive/10"
                                >
                                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                                  <div className="text-sm">
                                    <p className="font-medium text-foreground">
                                      {lim.bodyPart}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {lim.condition}
                                      {lim.severity && ` (${lim.severity})`}
                                    </p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground px-3 py-2 opacity-50">
                              No limitations mentioned
                            </p>
                          )}
                        </>
                      )}

                      {/* Personal records special handling */}
                      {phase.id === "personal_records" && (
                        <>
                          {data.personalRecords && data.personalRecords.length > 0 ? (
                            <div className="space-y-2">
                              {data.personalRecords.map((pr, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={recentlyUpdated.has("personalRecords") ? { scale: 1.02 } : false}
                                  animate={{ scale: 1 }}
                                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-success/10"
                                >
                                  <div className="flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-success" />
                                    <span className="text-sm text-foreground">
                                      {pr.exercise}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-success">
                                    {pr.value} {pr.unit}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground px-3 py-2 opacity-50">
                              No records shared yet
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Review button */}
      {filledWithSpecial >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 p-4 border-t border-border/50"
        >
          <Button
            onClick={onReviewClick}
            className="w-full h-11 bg-energy-gradient hover:opacity-90 text-white font-medium rounded-xl glow-brand"
          >
            <Check className="w-4 h-4 mr-2" />
            Review Profile
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
