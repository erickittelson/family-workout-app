"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BodyFatOption {
  range: string;
  value: number;
  label: string;
  description: string;
  characteristics: string[];
}

const MALE_BODY_FAT_OPTIONS: BodyFatOption[] = [
  {
    range: "3-6%",
    value: 5,
    label: "Competition",
    description: "Bodybuilder stage-ready",
    characteristics: ["Extreme vascularity", "Striations visible", "Every muscle defined", "Not sustainable"],
  },
  {
    range: "7-9%",
    value: 8,
    label: "Very Lean",
    description: "Fitness model condition",
    characteristics: ["Clear six-pack abs", "Visible veins on arms", "Face looks angular", "Obliques visible"],
  },
  {
    range: "10-12%",
    value: 11,
    label: "Lean/Athletic",
    description: "Beach-ready physique",
    characteristics: ["Abs visible", "Some vascularity", "Muscle definition clear", "V-taper visible"],
  },
  {
    range: "13-15%",
    value: 14,
    label: "Fit",
    description: "Healthy athletic look",
    characteristics: ["Upper abs visible", "Slight muscle definition", "No love handles", "Athletic appearance"],
  },
  {
    range: "16-19%",
    value: 17,
    label: "Average",
    description: "Typical healthy male",
    characteristics: ["Abs not visible", "Soft midsection", "Some muscle visible", "Slight love handles"],
  },
  {
    range: "20-24%",
    value: 22,
    label: "Above Average",
    description: "Some excess body fat",
    characteristics: ["No muscle definition", "Noticeable belly", "Love handles present", "Round face"],
  },
  {
    range: "25-30%",
    value: 27,
    label: "Overweight",
    description: "Excess fat accumulation",
    characteristics: ["Belly protrudes", "No visible muscle", "Face appears full", "Neck thickening"],
  },
  {
    range: "30%+",
    value: 32,
    label: "Obese",
    description: "Health risk category",
    characteristics: ["Large midsection", "Fat throughout body", "Rounded appearance", "Health concerns"],
  },
];

const FEMALE_BODY_FAT_OPTIONS: BodyFatOption[] = [
  {
    range: "10-13%",
    value: 12,
    label: "Competition",
    description: "Fitness competitor ready",
    characteristics: ["Extreme definition", "Visible abs and striations", "Very low curves", "Not sustainable"],
  },
  {
    range: "14-17%",
    value: 15,
    label: "Very Lean",
    description: "Fitness model condition",
    characteristics: ["Clear ab definition", "Visible muscle tone", "Athletic but feminine", "Some vascularity"],
  },
  {
    range: "18-22%",
    value: 20,
    label: "Lean/Athletic",
    description: "Athletic, fit physique",
    characteristics: ["Abs visible", "Toned arms and legs", "Healthy curves", "Athletic look"],
  },
  {
    range: "23-25%",
    value: 24,
    label: "Fit",
    description: "Healthy fit appearance",
    characteristics: ["Slight ab definition", "Toned overall", "Natural curves", "Healthy appearance"],
  },
  {
    range: "26-29%",
    value: 27,
    label: "Average",
    description: "Typical healthy female",
    characteristics: ["Soft midsection", "Some muscle tone", "Fuller figure", "Healthy weight"],
  },
  {
    range: "30-34%",
    value: 32,
    label: "Above Average",
    description: "Some excess body fat",
    characteristics: ["No visible definition", "Rounded midsection", "Fuller arms/legs", "Curves pronounced"],
  },
  {
    range: "35-39%",
    value: 37,
    label: "Overweight",
    description: "Excess fat accumulation",
    characteristics: ["Larger midsection", "No muscle definition", "Full figure throughout", "Some health concerns"],
  },
  {
    range: "40%+",
    value: 42,
    label: "Obese",
    description: "Health risk category",
    characteristics: ["Significant excess fat", "Rounded appearance", "Health concerns", "Mobility may be affected"],
  },
];

// SVG silhouettes for visual reference
function MaleSilhouette({ bodyFat, isSelected }: { bodyFat: number; isSelected: boolean }) {
  // Adjust silhouette appearance based on body fat percentage
  const getBodyShape = () => {
    if (bodyFat <= 9) return { waist: 28, chest: 42, belly: 0, opacity: 0.9 };
    if (bodyFat <= 12) return { waist: 30, chest: 42, belly: 2, opacity: 0.85 };
    if (bodyFat <= 15) return { waist: 32, chest: 42, belly: 4, opacity: 0.8 };
    if (bodyFat <= 19) return { waist: 34, chest: 42, belly: 6, opacity: 0.75 };
    if (bodyFat <= 24) return { waist: 38, chest: 44, belly: 10, opacity: 0.7 };
    if (bodyFat <= 30) return { waist: 42, chest: 44, belly: 14, opacity: 0.65 };
    return { waist: 48, chest: 46, belly: 18, opacity: 0.6 };
  };

  const shape = getBodyShape();

  return (
    <svg
      viewBox="0 0 80 120"
      className={cn(
        "w-full h-full transition-all duration-200",
        isSelected ? "drop-shadow-lg" : ""
      )}
    >
      {/* Head */}
      <ellipse cx="40" cy="12" rx="10" ry="12" fill="currentColor" opacity={shape.opacity} />

      {/* Neck */}
      <rect x="35" y="22" width="10" height="8" fill="currentColor" opacity={shape.opacity} />

      {/* Torso */}
      <path
        d={`
          M ${40 - shape.chest / 2} 30
          Q ${40 - shape.chest / 2 - 2} 45 ${40 - shape.waist / 2 - shape.belly / 2} 65
          Q ${40 - shape.waist / 2} 80 40 85
          Q ${40 + shape.waist / 2} 80 ${40 + shape.waist / 2 + shape.belly / 2} 65
          Q ${40 + shape.chest / 2 + 2} 45 ${40 + shape.chest / 2} 30
          Z
        `}
        fill="currentColor"
        opacity={shape.opacity}
      />

      {/* Arms */}
      <ellipse cx="12" cy="50" rx="6" ry="20" fill="currentColor" opacity={shape.opacity} />
      <ellipse cx="68" cy="50" rx="6" ry="20" fill="currentColor" opacity={shape.opacity} />

      {/* Legs */}
      <ellipse cx="32" cy="100" rx="8" ry="18" fill="currentColor" opacity={shape.opacity} />
      <ellipse cx="48" cy="100" rx="8" ry="18" fill="currentColor" opacity={shape.opacity} />

      {/* Abs indication for low body fat */}
      {bodyFat <= 15 && (
        <g stroke="currentColor" strokeWidth="0.5" opacity={0.3}>
          <line x1="40" y1="40" x2="40" y2="60" />
          {bodyFat <= 12 && (
            <>
              <line x1="34" y1="44" x2="46" y2="44" />
              <line x1="34" y1="50" x2="46" y2="50" />
              <line x1="34" y1="56" x2="46" y2="56" />
            </>
          )}
        </g>
      )}
    </svg>
  );
}

function FemaleSilhouette({ bodyFat, isSelected }: { bodyFat: number; isSelected: boolean }) {
  const getBodyShape = () => {
    if (bodyFat <= 17) return { waist: 24, hips: 36, chest: 34, belly: 0, opacity: 0.9 };
    if (bodyFat <= 22) return { waist: 26, hips: 38, chest: 36, belly: 2, opacity: 0.85 };
    if (bodyFat <= 25) return { waist: 28, hips: 40, chest: 38, belly: 3, opacity: 0.8 };
    if (bodyFat <= 29) return { waist: 32, hips: 42, chest: 40, belly: 5, opacity: 0.75 };
    if (bodyFat <= 34) return { waist: 36, hips: 44, chest: 42, belly: 8, opacity: 0.7 };
    if (bodyFat <= 39) return { waist: 40, hips: 46, chest: 44, belly: 12, opacity: 0.65 };
    return { waist: 46, hips: 48, chest: 46, belly: 16, opacity: 0.6 };
  };

  const shape = getBodyShape();

  return (
    <svg
      viewBox="0 0 80 120"
      className={cn(
        "w-full h-full transition-all duration-200",
        isSelected ? "drop-shadow-lg" : ""
      )}
    >
      {/* Head */}
      <ellipse cx="40" cy="12" rx="9" ry="11" fill="currentColor" opacity={shape.opacity} />

      {/* Neck */}
      <rect x="36" y="21" width="8" height="7" fill="currentColor" opacity={shape.opacity} />

      {/* Torso - hourglass shape */}
      <path
        d={`
          M ${40 - shape.chest / 2} 28
          Q ${40 - shape.chest / 2 + 2} 38 ${40 - shape.waist / 2 - shape.belly / 3} 50
          Q ${40 - shape.waist / 2 - shape.belly / 2} 60 ${40 - shape.hips / 2} 70
          Q ${40 - shape.hips / 2 - 2} 80 40 85
          Q ${40 + shape.hips / 2 + 2} 80 ${40 + shape.hips / 2} 70
          Q ${40 + shape.waist / 2 + shape.belly / 2} 60 ${40 + shape.waist / 2 + shape.belly / 3} 50
          Q ${40 + shape.chest / 2 - 2} 38 ${40 + shape.chest / 2} 28
          Z
        `}
        fill="currentColor"
        opacity={shape.opacity}
      />

      {/* Arms */}
      <ellipse cx="14" cy="48" rx="5" ry="18" fill="currentColor" opacity={shape.opacity} />
      <ellipse cx="66" cy="48" rx="5" ry="18" fill="currentColor" opacity={shape.opacity} />

      {/* Legs */}
      <ellipse cx="32" cy="100" rx="7" ry="18" fill="currentColor" opacity={shape.opacity} />
      <ellipse cx="48" cy="100" rx="7" ry="18" fill="currentColor" opacity={shape.opacity} />

      {/* Abs indication for low body fat */}
      {bodyFat <= 22 && (
        <g stroke="currentColor" strokeWidth="0.5" opacity={0.3}>
          <line x1="40" y1="42" x2="40" y2="58" />
          {bodyFat <= 17 && (
            <>
              <line x1="35" y1="46" x2="45" y2="46" />
              <line x1="35" y1="51" x2="45" y2="51" />
            </>
          )}
        </g>
      )}
    </svg>
  );
}

interface BodyFatSelectorProps {
  value: string;
  onChange: (value: string) => void;
  gender?: string;
  className?: string;
}

export function BodyFatSelector({ value, onChange, gender, className }: BodyFatSelectorProps) {
  const [activeTab, setActiveTab] = useState<"male" | "female">(
    gender?.toLowerCase() === "female" ? "female" : "male"
  );

  const options = activeTab === "male" ? MALE_BODY_FAT_OPTIONS : FEMALE_BODY_FAT_OPTIONS;
  const currentValue = parseFloat(value) || 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Body Fat %</Label>
        {value && (
          <span className="text-sm font-semibold text-primary">{value}%</span>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "male" | "female")}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="male">Male</TabsTrigger>
          <TabsTrigger value="female">Female</TabsTrigger>
        </TabsList>

        <TabsContent value="male" className="mt-0">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {MALE_BODY_FAT_OPTIONS.map((option) => {
              const isSelected = currentValue >= option.value - 3 && currentValue <= option.value + 3;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value.toString())}
                  className={cn(
                    "relative flex flex-col items-center p-2 rounded-lg border-2 transition-all",
                    "hover:border-primary/50 hover:bg-accent/50",
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border bg-card"
                  )}
                >
                  <div className="w-12 h-16 sm:w-14 sm:h-20 text-muted-foreground">
                    <MaleSilhouette bodyFat={option.value} isSelected={isSelected} />
                  </div>
                  <span className="text-xs font-bold mt-1">{option.range}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{option.label}</span>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="female" className="mt-0">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {FEMALE_BODY_FAT_OPTIONS.map((option) => {
              const isSelected = currentValue >= option.value - 3 && currentValue <= option.value + 3;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value.toString())}
                  className={cn(
                    "relative flex flex-col items-center p-2 rounded-lg border-2 transition-all",
                    "hover:border-primary/50 hover:bg-accent/50",
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border bg-card"
                  )}
                >
                  <div className="w-12 h-16 sm:w-14 sm:h-20 text-muted-foreground">
                    <FemaleSilhouette bodyFat={option.value} isSelected={isSelected} />
                  </div>
                  <span className="text-xs font-bold mt-1">{option.range}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{option.label}</span>
                </button>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Selected option details */}
      {value && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          {(() => {
            const selectedOption = options.find(
              (o) => currentValue >= o.value - 3 && currentValue <= o.value + 3
            );
            if (!selectedOption) return null;
            return (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedOption.label}</span>
                  <span className="text-sm text-muted-foreground">{selectedOption.range}</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedOption.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedOption.characteristics.map((char, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 bg-background rounded border"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Manual input option */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">Or enter manually:</Label>
        <input
          type="number"
          min="3"
          max="50"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 18"
          className="flex h-8 w-20 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Select the silhouette that most closely matches your current physique, or enter a specific percentage.
        Reference images are approximations. For accurate measurement, consider DEXA scans or hydrostatic weighing.
      </p>
    </div>
  );
}

export default BodyFatSelector;
