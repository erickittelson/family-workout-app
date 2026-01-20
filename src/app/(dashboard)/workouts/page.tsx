"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ClipboardList,
  Plus,
  Calendar,
  Loader2,
  Play,
  CheckCircle,
  User,
  Users,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
  Zap,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import Link from "next/link";

interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  category?: string;
  difficulty?: string;
  estimatedDuration?: number;
  exerciseCount: number;
}

interface ExerciseSummary {
  name: string;
  category: string;
  setsCompleted: number;
  totalSets: number;
  maxWeight: number | null;
}

interface WorkoutSession {
  id: string;
  name: string;
  date: string;
  status: string;
  memberId: string;
  memberName: string;
  memberProfilePicture?: string | null;
  rating?: number;
  notes?: string;
  duration?: number;
  completedAt?: string | null;
  totalSets: number;
  completedSets: number;
  exerciseCount: number;
  exercises: ExerciseSummary[];
}

interface FamilyMember {
  id: string;
  name: string;
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Start workout dialog
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [starting, setStarting] = useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<WorkoutPlan | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expanded descriptions
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, sessionsRes, membersRes] = await Promise.all([
        fetch("/api/workout-plans"),
        fetch("/api/workout-sessions"),
        fetch("/api/members"),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load workouts");
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    setSelectedMembers(members.map(m => m.id));
  };

  const clearMemberSelection = () => {
    setSelectedMembers([]);
  };

  const startWorkout = async () => {
    if (selectedMembers.length === 0 || !selectedPlan) {
      toast.error("Please select at least one member and a workout plan");
      return;
    }

    setStarting(true);
    try {
      const response = await fetch("/api/workout-sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: selectedMembers,
          planId: selectedPlan,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowStartDialog(false);
        setSelectedMembers([]);

        // Navigate with group session info if multiple members
        if (data.isGroupWorkout && data.sessions) {
          const sessionIds = data.sessions.map((s: any) => s.id).join(",");
          router.push(`/workouts/active/${data.id}?sessions=${sessionIds}`);
        } else {
          router.push(`/workouts/active/${data.id}`);
        }
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to start workout");
      }
    } catch (error) {
      console.error("Failed to start workout:", error);
      toast.error("Failed to start workout");
    } finally {
      setStarting(false);
    }
  };

  // Get in-progress sessions
  const inProgressSessions = sessions.filter((s) => s.status === "in_progress");

  const toggleExpanded = (planId: string) => {
    setExpandedPlans((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const confirmDelete = (plan: WorkoutPlan) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const deletePlan = async () => {
    if (!planToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/workout-plans/${planToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
        toast.success("Workout plan deleted");
        setDeleteDialogOpen(false);
        setPlanToDelete(null);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete plan");
      }
    } catch (error) {
      console.error("Failed to delete plan:", error);
      toast.error("Failed to delete plan");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workouts</h1>
          <p className="text-muted-foreground">
            Create workout plans and track your sessions
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/workouts/log">
              <Calendar className="mr-2 h-4 w-4" />
              Log Past
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/workouts/builder">
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Link>
          </Button>
          <Button onClick={() => setShowStartDialog(true)}>
            <Zap className="mr-2 h-4 w-4" />
            Start Workout
          </Button>
        </div>
      </div>

      {/* In-Progress Workouts */}
      {inProgressSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Play className="h-5 w-5 text-primary animate-pulse" />
            In Progress
          </h2>
          {inProgressSessions.map((session) => (
            <Card key={session.id} className="border-primary bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center border">
                      {session.memberProfilePicture ? (
                        <img
                          src={session.memberProfilePicture}
                          alt={session.memberName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{session.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.memberName} • {session.completedSets}/{session.totalSets} sets
                      </p>
                    </div>
                  </div>
                  <Button asChild>
                    <Link href={`/workouts/active/${session.id}`}>
                      <Play className="mr-2 h-4 w-4" />
                      Continue
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Start Workout Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a Workout</DialogTitle>
            <DialogDescription>
              Select who is working out and which plan to follow
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Member Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Who is working out?
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={selectAllMembers}
                  >
                    Select All
                  </Button>
                  {selectedMembers.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={clearMemberSelection}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMembers.includes(member.id)
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-primary/50"
                    }`}
                    onClick={() => toggleMemberSelection(member.id)}
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={() => toggleMemberSelection(member.id)}
                    />
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium text-sm">{member.name}</span>
                  </div>
                ))}
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedMembers.length} {selectedMembers.length === 1 ? "person" : "people"} selected
                </p>
              )}
            </div>

            {/* Workout Plan Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Which workout plan?
              </Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <ScrollArea className="max-h-[180px]">
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center gap-2 max-w-[280px]">
                          <span className="truncate">{plan.name}</span>
                          {plan.estimatedDuration && (
                            <Badge variant="outline" className="ml-auto shrink-0 text-xs">
                              {plan.estimatedDuration}m
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {plans.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No workout plans yet.{" "}
                <Link href="/workouts/builder" className="text-primary underline">
                  Create one first
                </Link>
              </p>
            )}

            <Button
              className="w-full"
              onClick={startWorkout}
              disabled={starting || selectedMembers.length === 0 || !selectedPlan}
            >
              {starting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Start Workout
              {selectedMembers.length > 1 && ` (${selectedMembers.length} people)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Workout Plans</TabsTrigger>
          <TabsTrigger value="sessions">Recent Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          {plans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No workout plans yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first workout plan to get started
                </p>
                <Button asChild>
                  <Link href="/workouts/builder">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workout Plan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const isExpanded = expandedPlans.has(plan.id);
                const hasLongDescription = plan.description && plan.description.length > 100;

                return (
                  <Card key={plan.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/workouts/builder?edit=${plan.id}`}>Edit Plan</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => confirmDelete(plan)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Plan
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {plan.description && (
                        <div className="mb-3">
                          <p
                            className={`text-sm text-muted-foreground ${
                              !isExpanded && hasLongDescription ? "line-clamp-2" : ""
                            }`}
                          >
                            {plan.description}
                          </p>
                          {hasLongDescription && (
                            <button
                              onClick={() => toggleExpanded(plan.id)}
                              className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" /> Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" /> Show more
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {plan.category && (
                          <Badge variant="outline">{plan.category}</Badge>
                        )}
                        {plan.difficulty && (
                          <Badge variant="secondary">{plan.difficulty}</Badge>
                        )}
                        {plan.estimatedDuration && (
                          <Badge variant="outline">{plan.estimatedDuration} min</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {plan.exerciseCount} exercises
                      </p>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link href={`/workouts/builder?edit=${plan.id}`}>Edit</Link>
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedPlan(plan.id);
                            setShowStartDialog(true);
                          }}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          Start
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No workout sessions yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start logging your workouts to track progress
                </p>
                <Button asChild>
                  <Link href="/workouts/log">
                    <Calendar className="mr-2 h-4 w-4" />
                    Log Workout
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Collapsible key={session.id}>
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Member Avatar */}
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center border">
                            {session.memberProfilePicture ? (
                              <img
                                src={session.memberProfilePicture}
                                alt={session.memberName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>

                          {/* Workout Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{session.name}</p>
                              {session.status === "completed" && (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {session.memberName}
                              </span>
                              <span>•</span>
                              <span>{new Date(session.date).toLocaleDateString()}</span>
                              {session.duration && (
                                <>
                                  <span>•</span>
                                  <Clock className="h-3 w-3" />
                                  <span>{session.duration} min</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Completion Progress */}
                          {session.totalSets > 0 && (
                            <div className="text-right mr-2">
                              <p className="text-sm font-medium">
                                {session.completedSets}/{session.totalSets} sets
                              </p>
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    session.status === "completed"
                                      ? "bg-green-500"
                                      : "bg-primary"
                                  }`}
                                  style={{
                                    width: `${(session.completedSets / session.totalSets) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Rating */}
                          {session.rating && (
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="h-4 w-4 fill-current" />
                              <span className="text-sm font-medium">{session.rating}</span>
                            </div>
                          )}

                          <Badge
                            variant={
                              session.status === "completed"
                                ? "default"
                                : session.status === "in_progress"
                                ? "secondary"
                                : "outline"
                            }
                            className={
                              session.status === "completed"
                                ? "bg-green-500"
                                : ""
                            }
                          >
                            {session.status === "completed"
                              ? "Completed"
                              : session.status === "in_progress"
                              ? "In Progress"
                              : "Planned"}
                          </Badge>

                          {/* Expand Button */}
                          {session.exercises.length > 0 && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                          )}

                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={
                                session.status === "in_progress"
                                  ? `/workouts/active/${session.id}`
                                  : `/workouts/session/${session.id}`
                              }
                            >
                              {session.status === "in_progress" ? "Continue" : "View"}
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Exercise Details */}
                      <CollapsibleContent>
                        {session.exercises.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Dumbbell className="h-4 w-4" />
                              Exercises ({session.exerciseCount})
                            </p>
                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                              {session.exercises.map((ex, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{ex.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {ex.setsCompleted}/{ex.totalSets} sets
                                      {ex.maxWeight && ` • ${ex.maxWeight} lbs`}
                                    </p>
                                  </div>
                                  {ex.setsCompleted === ex.totalSets && ex.totalSets > 0 && (
                                    <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{planToDelete?.name}"? This action cannot be undone.
              Past workout sessions using this plan will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletePlan}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
