"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Loader2,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Brain,
  Heart,
  Zap,
  Moon,
  Target,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Frown,
  Smile,
  Sparkles,
  AlertCircle,
  X,
  Shield,
  TrendingUp,
  Star,
} from "lucide-react";

// Types for the reflection data
export interface WorkoutReflection {
  // Physical state
  energyLevel: number; // 1-5
  sorenessLevel: number; // 0-10
  painAreas: string[];
  fatigueLevel: number; // 1-5

  // Mental state
  mood: "great" | "good" | "okay" | "tired" | "stressed" | "frustrated" | null;
  stressLevel: number; // 1-5
  motivationLevel: number; // 1-5
  focusLevel: number; // 1-5

  // Mental block / confidence (for skills work)
  confidenceLevel: number; // 1-5
  fearLevel: number; // 1-5
  mentalBlockTags: string[];

  // Workout feedback
  workoutDifficulty: "too_easy" | "just_right" | "challenging" | "too_hard" | null;
  overallRating: number; // 1-5
  wentWell: string[];
  challenges: string[];
  challengeDetails: string;

  // Recovery context
  sleepQuality: number; // 1-5
  sleepHours: number | null;
  nutritionRating: number; // 1-5
  hydrationRating: number; // 1-5

  // Additional notes
  notes: string;
  tags: string[];

  // Progress tracking
  progressMade: string[];
  nextTimeGoals: string[];
}

interface WorkoutReflectionWizardProps {
  workoutDuration: number; // seconds
  completedSets: number;
  totalExercises: number;
  onComplete: (reflection: WorkoutReflection) => void;
  onCancel: () => void;
  saving?: boolean;
}

// Mood options with icons
const moodOptions = [
  { value: "great", label: "Pumped!", icon: Sparkles, color: "text-green-500", desc: "Feeling amazing" },
  { value: "good", label: "Good", icon: Smile, color: "text-blue-500", desc: "Solid session" },
  { value: "okay", label: "Meh", icon: Meh, color: "text-yellow-500", desc: "Not my best" },
  { value: "tired", label: "Tired", icon: Moon, color: "text-purple-500", desc: "Low energy" },
  { value: "stressed", label: "Anxious", icon: AlertCircle, color: "text-orange-500", desc: "Worried/nervous" },
  { value: "frustrated", label: "Frustrated", icon: Frown, color: "text-red-500", desc: "Things didn't go well" },
] as const;

// Pain areas
const painAreaOptions = [
  "Lower Back", "Upper Back", "Neck", "Shoulders",
  "Knees", "Hips", "Ankles", "Wrists",
  "Elbows", "Chest", "Core", "None",
];

// Specific "what went well" options
const wentWellOptions = [
  { id: "form", label: "My form felt good", icon: "✓" },
  { id: "stronger", label: "I felt stronger than last time", icon: "💪" },
  { id: "completed", label: "I finished everything I planned", icon: "🎯" },
  { id: "pushed", label: "I pushed through when it got hard", icon: "🔥" },
  { id: "technique", label: "I improved a technique/skill", icon: "⭐" },
  { id: "no_fear", label: "I did something that scared me", icon: "🦁" },
  { id: "consistent", label: "I showed up even when I didn't want to", icon: "📅" },
  { id: "focused", label: "I stayed focused the whole time", icon: "🎯" },
  { id: "pr", label: "I hit a personal record", icon: "🏆" },
  { id: "fun", label: "I actually had fun", icon: "😄" },
];

// Specific challenge options (prescriptive, not "I don't know")
const challengeOptions = [
  { id: "scared", label: "I was scared to try something", icon: "😰", category: "mental" },
  { id: "mental_block", label: "I have a mental block on a skill", icon: "🧱", category: "mental" },
  { id: "no_confidence", label: "I didn't believe I could do it", icon: "😔", category: "mental" },
  { id: "overthinking", label: "I was overthinking too much", icon: "🤯", category: "mental" },
  { id: "distracted", label: "I couldn't focus / kept getting distracted", icon: "📱", category: "mental" },
  { id: "tired_body", label: "My body felt tired/weak", icon: "😴", category: "physical" },
  { id: "sore", label: "I was too sore from before", icon: "🤕", category: "physical" },
  { id: "pain", label: "Something hurt/was painful", icon: "⚠️", category: "physical" },
  { id: "hard_exercises", label: "The exercises were too hard", icon: "😤", category: "workout" },
  { id: "boring", label: "It was boring / I lost interest", icon: "😑", category: "workout" },
  { id: "too_long", label: "It took too long", icon: "⏰", category: "workout" },
  { id: "none", label: "Nothing - it was a good day!", icon: "✨", category: "none" },
];

// Mental block specific tags
const mentalBlockOptions = [
  { id: "fear_falling", label: "Scared of falling", icon: "😨" },
  { id: "fear_flipping", label: "Scared to flip/rotate", icon: "🔄" },
  { id: "fear_height", label: "Scared of the height", icon: "📏" },
  { id: "fear_pain", label: "Scared it will hurt", icon: "🤕" },
  { id: "fear_fail", label: "Scared of failing/messing up", icon: "❌" },
  { id: "cant_commit", label: "Can't fully commit to the skill", icon: "🚫" },
  { id: "lost_skill", label: "I used to do it but now I can't", icon: "😢" },
  { id: "overthink", label: "I think about it too much", icon: "🧠" },
  { id: "bad_experience", label: "Had a bad experience before", icon: "😣" },
  { id: "pressure", label: "Feel too much pressure", icon: "😰" },
];

// Progress options
const progressOptions = [
  { id: "closer", label: "Got closer to a skill I'm working on", icon: "📈" },
  { id: "drill_better", label: "Did a drill better than before", icon: "⬆️" },
  { id: "less_scared", label: "Felt less scared than last time", icon: "😌" },
  { id: "new_pr", label: "Lifted more weight / did more reps", icon: "🏋️" },
  { id: "faster", label: "Was faster or more powerful", icon: "⚡" },
  { id: "consistent", label: "Was more consistent", icon: "🎯" },
  { id: "understood", label: "Finally understood something", icon: "💡" },
  { id: "first_time", label: "Did something for the first time", icon: "🌟" },
  { id: "no_spot", label: "Needed less help/spotting", icon: "🙌" },
];

// Next time goals
const nextTimeGoalOptions = [
  { id: "try_scary", label: "Try the thing that scares me", icon: "🦁" },
  { id: "more_reps", label: "Do more reps/sets", icon: "🔢" },
  { id: "better_form", label: "Focus on better form", icon: "✓" },
  { id: "stay_focused", label: "Stay more focused", icon: "🎯" },
  { id: "push_harder", label: "Push myself harder", icon: "🔥" },
  { id: "have_fun", label: "Have more fun with it", icon: "😄" },
  { id: "ask_help", label: "Ask for help when I need it", icon: "🙋" },
  { id: "trust_myself", label: "Trust myself more", icon: "💪" },
  { id: "breathe", label: "Remember to breathe", icon: "🌬️" },
  { id: "positive", label: "Stay positive even if it's hard", icon: "☀️" },
];

// Quick tags
const quickTags = [
  "PR Day", "Deload Needed", "Felt Strong", "Need More Rest",
  "Great Progress", "Skill Breakthrough", "Mental Win", "Just Showed Up",
  "Recovery Focus", "Technique Day", "Confidence Boost", "Rough Day",
];

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Rating selector component with descriptive labels
function RatingSelector({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: [string, string, string, string, string];
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1 justify-center">
        {[1, 2, 3, 4, 5].map((num) => (
          <Button
            key={num}
            type="button"
            variant={value === num ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(num)}
            className={cn(
              "flex-1 h-auto py-2 flex flex-col",
              value === num && "ring-2 ring-primary ring-offset-2"
            )}
          >
            <span className="text-lg font-bold">{num}</span>
            <span className="text-[10px] leading-tight">{labels[num - 1]}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

// Multi-select option grid
function OptionGrid({
  options,
  selected,
  onToggle,
  columns = 2,
}: {
  options: { id: string; label: string; icon: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  columns?: number;
}) {
  return (
    <div className={cn("grid gap-2", columns === 2 ? "grid-cols-2" : "grid-cols-1")}>
      {options.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant={selected.includes(option.id) ? "default" : "outline"}
          className={cn(
            "h-auto py-2 px-3 justify-start text-left",
            selected.includes(option.id) && "ring-2 ring-primary ring-offset-1"
          )}
          onClick={() => onToggle(option.id)}
        >
          <span className="mr-2">{option.icon}</span>
          <span className="text-sm">{option.label}</span>
        </Button>
      ))}
    </div>
  );
}

export default function WorkoutReflectionWizard({
  workoutDuration,
  completedSets,
  totalExercises,
  onComplete,
  onCancel,
  saving = false,
}: WorkoutReflectionWizardProps) {
  const [step, setStep] = useState(0);
  const [reflection, setReflection] = useState<WorkoutReflection>({
    energyLevel: 3,
    sorenessLevel: 0,
    painAreas: [],
    fatigueLevel: 3,
    mood: null,
    stressLevel: 3,
    motivationLevel: 3,
    focusLevel: 3,
    confidenceLevel: 3,
    fearLevel: 1,
    mentalBlockTags: [],
    workoutDifficulty: null,
    overallRating: 0,
    wentWell: [],
    challenges: [],
    challengeDetails: "",
    sleepQuality: 3,
    sleepHours: null,
    nutritionRating: 3,
    hydrationRating: 3,
    notes: "",
    tags: [],
    progressMade: [],
    nextTimeGoals: [],
  });

  const updateReflection = <K extends keyof WorkoutReflection>(
    key: K,
    value: WorkoutReflection[K]
  ) => {
    setReflection((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: keyof WorkoutReflection, item: string) => {
    const current = reflection[key] as string[];
    if (item === "none") {
      updateReflection(key, []);
      return;
    }
    if (current.includes(item)) {
      updateReflection(key, current.filter((i) => i !== item) as any);
    } else {
      updateReflection(key, [...current.filter((i) => i !== "none"), item] as any);
    }
  };

  const togglePainArea = (area: string) => {
    if (area === "None") {
      updateReflection("painAreas", []);
      return;
    }
    const current = reflection.painAreas;
    if (current.includes(area)) {
      updateReflection("painAreas", current.filter((a) => a !== area));
    } else {
      updateReflection("painAreas", [...current.filter((a) => a !== "None"), area]);
    }
  };

  const toggleTag = (tag: string) => {
    const current = reflection.tags;
    if (current.includes(tag)) {
      updateReflection("tags", current.filter((t) => t !== tag));
    } else {
      updateReflection("tags", [...current, tag]);
    }
  };

  // Check if user selected mental block challenges
  const hasMentalBlockChallenge = reflection.challenges.some(c =>
    ["scared", "mental_block", "no_confidence", "overthinking"].includes(c)
  );

  const steps = [
    { title: "Nice Work!", icon: Trophy, description: "You showed up - that's what matters" },
    { title: "Quick Check-In", icon: Heart, description: "Pick the one that fits best" },
    { title: "What Went Well?", icon: Star, description: "Pick at least one win (there's always something!)" },
    { title: "What Was Hard?", icon: Target, description: "Be honest - this helps your coach help you" },
    ...(hasMentalBlockChallenge ? [{ title: "Let's Talk About It", icon: Shield, description: "Understanding fear helps beat it" }] : []),
    { title: "Any Progress?", icon: TrendingUp, description: "Even tiny progress counts!" },
    { title: "Next Time", icon: Flame, description: "What's one thing you want to work on?" },
    { title: "Almost Done!", icon: CheckCircle, description: "Any last thoughts?" },
  ];

  const canProceed = () => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return reflection.mood !== null;
      case 2:
        return reflection.wentWell.length > 0;
      case 3:
        return reflection.challenges.length > 0;
      case 4:
        if (hasMentalBlockChallenge) {
          return reflection.mentalBlockTags.length > 0 || reflection.confidenceLevel > 0;
        }
        return reflection.progressMade.length >= 0; // Progress step
      case 5:
        if (hasMentalBlockChallenge) {
          return true; // Progress step when mental block exists
        }
        return reflection.nextTimeGoals.length > 0; // Next time step
      case 6:
        if (hasMentalBlockChallenge) {
          return reflection.nextTimeGoals.length > 0;
        }
        return true; // Final step
      case 7:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(reflection);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const progressPercent = ((step + 1) / steps.length) * 100;

  // Determine current step content based on whether mental block step is included
  const getStepContent = () => {
    const baseStep = step;
    const mentalBlockStepIndex = 4;

    if (!hasMentalBlockChallenge) {
      // No mental block - steps are: 0-intro, 1-mood, 2-wentWell, 3-challenges, 4-progress, 5-nextTime, 6-final
      switch (baseStep) {
        case 0: return "intro";
        case 1: return "mood";
        case 2: return "wentWell";
        case 3: return "challenges";
        case 4: return "progress";
        case 5: return "nextTime";
        case 6: return "final";
        default: return "final";
      }
    } else {
      // Has mental block - steps are: 0-intro, 1-mood, 2-wentWell, 3-challenges, 4-mentalBlock, 5-progress, 6-nextTime, 7-final
      switch (baseStep) {
        case 0: return "intro";
        case 1: return "mood";
        case 2: return "wentWell";
        case 3: return "challenges";
        case 4: return "mentalBlock";
        case 5: return "progress";
        case 6: return "nextTime";
        case 7: return "final";
        default: return "final";
      }
    }
  };

  const currentContent = getStepContent();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-lg my-4 max-h-[90vh] flex flex-col">
        {/* Header with progress */}
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {(() => {
                const StepIcon = steps[step]?.icon || Trophy;
                return <StepIcon className="h-5 w-5 text-primary" />;
              })()}
              <CardTitle className="text-lg">{steps[step]?.title || "Done!"}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>{steps[step]?.description || ""}</CardDescription>
          <Progress value={progressPercent} className="h-1 mt-2" />
        </CardHeader>

        <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-6">
          {/* Step 0: Intro/Summary */}
          {currentContent === "intro" && (
            <div className="text-center space-y-4">
              <div className="py-4">
                <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <p className="text-4xl font-mono font-bold mb-2">
                  {formatTime(workoutDuration)}
                </p>
                <p className="text-muted-foreground">
                  {completedSets} sets across {totalExercises} exercises
                </p>
              </div>
              <div className="bg-primary/5 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">Let's do a quick check-in!</p>
                <p className="text-muted-foreground">
                  Answer a few quick questions so your coach knows how to help you improve.
                  Be honest - there's no wrong answers!
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Mood (simplified, prescriptive) */}
          {currentContent === "mood" && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Right now, how are you feeling?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {moodOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={reflection.mood === option.value ? "default" : "outline"}
                    className={cn(
                      "flex flex-col h-auto py-3",
                      reflection.mood === option.value && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => updateReflection("mood", option.value)}
                  >
                    <option.icon className={cn("h-6 w-6 mb-1", option.color)} />
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.desc}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: What went well (prescriptive options) */}
          {currentContent === "wentWell" && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground mb-4">
                Pick everything that applies - even small wins count!
              </p>
              <OptionGrid
                options={wentWellOptions}
                selected={reflection.wentWell}
                onToggle={(id) => toggleArrayItem("wentWell", id)}
                columns={1}
              />
            </div>
          )}

          {/* Step 3: What was challenging (prescriptive options) */}
          {currentContent === "challenges" && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground mb-4">
                What made today hard? (It's okay, everyone has hard days)
              </p>
              <OptionGrid
                options={challengeOptions}
                selected={reflection.challenges}
                onToggle={(id) => toggleArrayItem("challenges", id)}
                columns={1}
              />
            </div>
          )}

          {/* Step 4: Mental Block deep-dive (only if selected) */}
          {currentContent === "mentalBlock" && (
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-orange-800 mb-1">You're not alone!</p>
                <p className="text-orange-700">
                  Mental blocks are super common. Understanding what's going on helps us work through it together.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">What's the fear about? (pick all that fit)</label>
                <OptionGrid
                  options={mentalBlockOptions}
                  selected={reflection.mentalBlockTags}
                  onToggle={(id) => toggleArrayItem("mentalBlockTags", id)}
                  columns={1}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  How confident did you feel today?
                </label>
                <RatingSelector
                  value={reflection.confidenceLevel}
                  onChange={(v) => updateReflection("confidenceLevel", v)}
                  labels={["Not at all", "A little", "Okay", "Pretty good", "Super confident"]}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">
                  How scared were you when trying the skill?
                </label>
                <RatingSelector
                  value={reflection.fearLevel}
                  onChange={(v) => updateReflection("fearLevel", v)}
                  labels={["Not scared", "A little", "Medium", "Pretty scared", "Terrified"]}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Want to add anything else about how you're feeling?</label>
                <Textarea
                  value={reflection.challengeDetails}
                  onChange={(e) => updateReflection("challengeDetails", e.target.value)}
                  placeholder="Like: 'I can do it on the trampoline but not on floor' or 'I used to be able to do it but then I fell once'"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Progress step */}
          {currentContent === "progress" && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground mb-4">
                Did you make any progress today? Even tiny steps forward count!
              </p>
              <OptionGrid
                options={progressOptions}
                selected={reflection.progressMade}
                onToggle={(id) => toggleArrayItem("progressMade", id)}
                columns={1}
              />
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => updateReflection("progressMade", [])}
              >
                Not really, and that's okay
              </Button>
            </div>
          )}

          {/* Next time goals */}
          {currentContent === "nextTime" && (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground mb-4">
                Pick 1-3 things you want to focus on next workout
              </p>
              <OptionGrid
                options={nextTimeGoalOptions}
                selected={reflection.nextTimeGoals}
                onToggle={(id) => toggleArrayItem("nextTimeGoals", id)}
                columns={1}
              />
            </div>
          )}

          {/* Final step */}
          {currentContent === "final" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">Quick tags (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {quickTags.map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant={reflection.tags.includes(tag) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Anything else you want your coach to know?</label>
                <Textarea
                  value={reflection.notes}
                  onChange={(e) => updateReflection("notes", e.target.value)}
                  placeholder="Like: 'My ankle felt weird' or 'I was nervous because people were watching' or 'I finally understood the timing!'"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Overall, how was this workout?</label>
                <RatingSelector
                  value={reflection.overallRating}
                  onChange={(v) => updateReflection("overallRating", v)}
                  labels={["Bad day", "Meh", "Okay", "Good", "Great!"]}
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-green-800 mb-1">You did it!</p>
                <p className="text-green-700">
                  Your coach will use this info to help you improve. Remember: showing up is already a win!
                </p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 pt-4 flex-shrink-0">
            {step > 0 ? (
              <Button variant="outline" className="flex-1" onClick={handleBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Skip
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={handleNext}
              disabled={!canProceed() || saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : step === steps.length - 1 ? (
                <>
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Done!
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
