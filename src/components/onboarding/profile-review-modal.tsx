"use client";

import { useState } from "react";
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
  Check,
  X,
  Pencil,
  Sparkles,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExtractedProfileData } from "./profile-panel";

interface ProfileReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: (key: string, currentValue: unknown) => void;
  data: ExtractedProfileData;
  isSubmitting?: boolean;
}

// Section configuration
interface SectionConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  fields: Array<{
    key: keyof ExtractedProfileData;
    label: string;
    format?: (value: unknown, data: ExtractedProfileData) => string;
  }>;
}

const SECTIONS: SectionConfig[] = [
  {
    id: "personal",
    title: "Personal Information",
    icon: <User className="w-5 h-5" />,
    fields: [
      { key: "name", label: "Name" },
      { key: "age", label: "Age", format: (v) => `${v} years old` },
      {
        key: "gender",
        label: "Gender",
        format: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1),
      },
      {
        key: "heightFeet",
        label: "Height",
        format: (v, d) =>
          d.heightInches !== undefined ? `${v}'${d.heightInches}"` : `${v} ft`,
      },
      { key: "weight", label: "Weight", format: (v) => `${v} lbs` },
      {
        key: "bodyFatPercentage",
        label: "Body Fat",
        format: (v) => `~${v}%`,
      },
    ],
  },
  {
    id: "fitness",
    title: "Fitness Background",
    icon: <Activity className="w-5 h-5" />,
    fields: [
      {
        key: "fitnessLevel",
        label: "Experience Level",
        format: (v) => String(v).charAt(0).toUpperCase() + String(v).slice(1),
      },
      {
        key: "trainingFrequency",
        label: "Current Training",
        format: (v) => `${v} days per week`,
      },
      { key: "currentActivity", label: "Activities" },
    ],
  },
  {
    id: "goals",
    title: "Goals & Motivation",
    icon: <Target className="w-5 h-5" />,
    fields: [
      { key: "primaryMotivation", label: "Motivation" },
      {
        key: "primaryGoal",
        label: "Primary Goal",
        format: (v) => {
          const goal = v as ExtractedProfileData["primaryGoal"];
          return goal?.description || goal?.type || "";
        },
      },
      { key: "targetWeight", label: "Target Weight", format: (v) => `${v} lbs` },
      { key: "timeline", label: "Timeline" },
    ],
  },
  {
    id: "preferences",
    title: "Training Preferences",
    icon: <Dumbbell className="w-5 h-5" />,
    fields: [
      {
        key: "workoutDuration",
        label: "Workout Duration",
        format: (v) => `${v} minutes`,
      },
      {
        key: "workoutDays",
        label: "Preferred Days",
        format: (v) => (Array.isArray(v) ? v.join(", ") : String(v)),
      },
      {
        key: "equipmentAccess",
        label: "Equipment",
        format: (v) => (Array.isArray(v) ? v.join(", ") : String(v)),
      },
    ],
  },
];

export function ProfileReviewModal({
  isOpen,
  onClose,
  onConfirm,
  onEdit,
  data,
  isSubmitting = false,
}: ProfileReviewModalProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(
    SECTIONS.map((s) => s.id)
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Count filled fields
  const totalPossibleFields = SECTIONS.flatMap((s) => s.fields).length;
  const filledFields = SECTIONS.flatMap((s) => s.fields).filter(
    (f) => data[f.key] !== undefined
  ).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full max-w-2xl max-h-[85vh] overflow-hidden",
              "bg-card rounded-3xl shadow-2xl border border-border/50",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex-shrink-0 relative overflow-hidden">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-brand-gradient opacity-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />

              <div className="relative px-6 pt-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center glow-brand">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        Review Your Profile
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {filledFields} of {totalPossibleFields} fields completed
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Progress indicator */}
                <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(filledFields / totalPossibleFields) * 100}%`,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full bg-energy-gradient rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {SECTIONS.map((section) => {
                  const isExpanded = expandedSections.includes(section.id);
                  const sectionFields = section.fields.filter(
                    (f) => data[f.key] !== undefined
                  );
                  const hasData = sectionFields.length > 0;

                  return (
                    <div
                      key={section.id}
                      className={cn(
                        "rounded-2xl border transition-colors",
                        hasData
                          ? "border-border/50 bg-surface/50"
                          : "border-border/30 bg-muted/20 opacity-60"
                      )}
                    >
                      {/* Section header */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              hasData
                                ? "bg-brand/15 text-brand"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {section.icon}
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-foreground">
                              {section.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {sectionFields.length} of {section.fields.length}{" "}
                              fields
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={cn(
                            "w-5 h-5 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>

                      {/* Section content */}
                      <AnimatePresence>
                        {isExpanded && hasData && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-2">
                              {sectionFields.map((field) => {
                                const value = data[field.key];
                                const displayValue = field.format
                                  ? field.format(value, data)
                                  : String(value);

                                return (
                                  <div
                                    key={field.key}
                                    className={cn(
                                      "group flex items-center justify-between",
                                      "py-3 px-4 rounded-xl",
                                      "bg-background/50 hover:bg-background/80",
                                      "transition-colors"
                                    )}
                                  >
                                    <span className="text-sm text-muted-foreground">
                                      {field.label}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-foreground">
                                        {displayValue}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(field.key, value)}
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* Limitations section */}
                {data.limitations && data.limitations.length > 0 && (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Physical Limitations
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          We'll work around these
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {data.limitations.map((lim, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 py-2 px-3 rounded-lg bg-background/50"
                        >
                          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {lim.bodyPart}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {lim.condition}
                              {lim.severity && ` (${lim.severity})`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personal records section */}
                {data.personalRecords && data.personalRecords.length > 0 && (
                  <div className="rounded-2xl border border-success/30 bg-success/5 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Personal Records
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Starting benchmarks
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {data.personalRecords.map((pr, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50"
                        >
                          <span className="text-sm text-muted-foreground">
                            {pr.exercise}
                          </span>
                          <span className="text-sm font-medium text-success">
                            {pr.value} {pr.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-border/50 p-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 h-12 rounded-xl"
                >
                  Keep Chatting
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={isSubmitting || filledFields < 5}
                  className={cn(
                    "flex-1 h-12 rounded-xl font-medium",
                    "bg-energy-gradient hover:opacity-90",
                    "text-white shadow-lg glow-brand",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirm & Start
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-3">
                You can always update your profile later in settings
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
