"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Plus,
  Loader2,
  Trophy,
  CheckCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface FamilyMember {
  id: string;
  name: string;
}

interface Goal {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  description?: string;
  category: string;
  targetValue?: number;
  targetUnit?: string;
  currentValue?: number;
  targetDate?: string;
  status: string;
  aiGenerated: boolean;
  milestones: Milestone[];
}

interface Milestone {
  id: string;
  title: string;
  targetValue?: number;
  targetDate?: string;
  status: string;
}

const categories = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio/Endurance" },
  { value: "skill", label: "Skill/Movement" },
  { value: "weight", label: "Weight/Body Comp" },
  { value: "flexibility", label: "Flexibility" },
  { value: "sport", label: "Sport Performance" },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    memberId: "",
    title: "",
    description: "",
    category: "",
    targetValue: "",
    targetUnit: "",
    currentValue: "",
    targetDate: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsRes, membersRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/members"),
      ]);

      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(data);
      }

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      memberId: "",
      title: "",
      description: "",
      category: "",
      targetValue: "",
      targetUnit: "",
      currentValue: "",
      targetDate: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: formData.memberId,
          title: formData.title,
          description: formData.description || null,
          category: formData.category,
          targetValue: formData.targetValue
            ? parseFloat(formData.targetValue)
            : null,
          targetUnit: formData.targetUnit || null,
          currentValue: formData.currentValue
            ? parseFloat(formData.currentValue)
            : null,
          targetDate: formData.targetDate || null,
        }),
      });

      if (response.ok) {
        toast.success("Goal created successfully");
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create goal");
      }
    } catch (error) {
      console.error("Failed to create goal:", error);
      toast.error("Failed to create goal");
    } finally {
      setSaving(false);
    }
  };

  const updateGoalStatus = async (goalId: string, status: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(
          status === "completed" ? "Congratulations! Goal completed!" : "Goal updated"
        );
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update goal:", error);
    }
  };

  const updateCurrentValue = async (goalId: string, currentValue: number) => {
    try {
      await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update goal:", error);
    }
  };

  const calculateProgress = (goal: Goal) => {
    if (!goal.targetValue || !goal.currentValue) return 0;
    return Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

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
          <h1 className="text-3xl font-bold">Goals & Milestones</h1>
          <p className="text-muted-foreground">
            Track fitness goals for your family members
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Family Member *</Label>
                <Select
                  value={formData.memberId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, memberId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Goal Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Bench press 225 lbs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    value={formData.targetValue}
                    onChange={(e) =>
                      setFormData({ ...formData, targetValue: e.target.value })
                    }
                    placeholder="225"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input
                    value={formData.targetUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, targetUnit: e.target.value })
                    }
                    placeholder="lbs, reps, miles"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Current Value</Label>
                <Input
                  type="number"
                  value={formData.currentValue}
                  onChange={(e) =>
                    setFormData({ ...formData, currentValue: e.target.value })
                  }
                  placeholder="Current progress"
                />
              </div>

              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) =>
                    setFormData({ ...formData, targetDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Any additional details..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Goal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Goals */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Active Goals ({activeGoals.length})
        </h2>

        {activeGoals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No active goals</h3>
              <p className="text-muted-foreground mb-4">
                Set goals to track your family&apos;s fitness progress
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {goal.memberName}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline">{goal.category}</Badge>
                      {goal.aiGenerated && (
                        <Badge variant="secondary">
                          <Sparkles className="mr-1 h-3 w-3" />
                          AI
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {goal.description && (
                    <p className="text-sm text-muted-foreground">
                      {goal.description}
                    </p>
                  )}

                  {goal.targetValue && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>
                          {goal.currentValue || 0} / {goal.targetValue}{" "}
                          {goal.targetUnit}
                        </span>
                      </div>
                      <Progress value={calculateProgress(goal)} />
                    </div>
                  )}

                  {goal.targetDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {goal.targetValue && (
                      <Input
                        type="number"
                        placeholder="Update progress"
                        className="h-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const value = parseFloat(
                              (e.target as HTMLInputElement).value
                            );
                            if (!isNaN(value)) {
                              updateCurrentValue(goal.id, value);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    )}
                    <Button
                      size="sm"
                      onClick={() => updateGoalStatus(goal.id, "completed")}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Completed Goals ({completedGoals.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        {goal.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {goal.memberName}
                      </p>
                    </div>
                    <Badge variant="default">Completed</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {goal.targetValue && (
                    <p className="text-sm">
                      Achieved: {goal.currentValue || goal.targetValue}{" "}
                      {goal.targetUnit}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
