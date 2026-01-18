"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  GripVertical,
  Plus,
  Trash2,
  Save,
  Loader2,
  ArrowLeft,
  Dumbbell,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleGroups?: string[];
  difficulty?: string;
}

interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  order: number;
  sets?: number;
  reps?: string;
  weight?: string;
  duration?: number;
  restBetweenSets?: number;
  notes?: string;
}

function SortableExerciseItem({
  item,
  onUpdate,
  onRemove,
}: {
  item: WorkoutExercise;
  onUpdate: (id: string, updates: Partial<WorkoutExercise>) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg p-4 bg-card"
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{item.exercise.name}</h4>
              <div className="flex gap-1 mt-1">
                <Badge variant="outline" className="text-xs">
                  {item.exercise.category}
                </Badge>
                {item.exercise.difficulty && (
                  <Badge variant="secondary" className="text-xs">
                    {item.exercise.difficulty}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Sets</Label>
              <Input
                type="number"
                min="1"
                value={item.sets || ""}
                onChange={(e) =>
                  onUpdate(item.id, { sets: parseInt(e.target.value) || undefined })
                }
                placeholder="3"
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Reps</Label>
              <Input
                value={item.reps || ""}
                onChange={(e) => onUpdate(item.id, { reps: e.target.value })}
                placeholder="8-12"
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Weight</Label>
              <Input
                value={item.weight || ""}
                onChange={(e) => onUpdate(item.id, { weight: e.target.value })}
                placeholder="135 lbs"
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Rest (sec)</Label>
              <Input
                type="number"
                min="0"
                value={item.restBetweenSets || ""}
                onChange={(e) =>
                  onUpdate(item.id, {
                    restBetweenSets: parseInt(e.target.value) || undefined,
                  })
                }
                placeholder="60"
                className="h-8"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Input
              value={item.notes || ""}
              onChange={(e) => onUpdate(item.id, { notes: e.target.value })}
              placeholder="Any special instructions..."
              className="h-8"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planCategory, setPlanCategory] = useState("");
  const [planDifficulty, setPlanDifficulty] = useState("");
  const [planDuration, setPlanDuration] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchExercises();
    if (editId) {
      fetchPlan(editId);
    } else {
      setLoading(false);
    }
  }, [editId]);

  const fetchExercises = async () => {
    try {
      const response = await fetch("/api/exercises");
      if (response.ok) {
        const data = await response.json();
        setExercises(data);
      }
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
    }
  };

  const fetchPlan = async (id: string) => {
    try {
      const response = await fetch(`/api/workout-plans/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPlanName(data.name);
        setPlanDescription(data.description || "");
        setPlanCategory(data.category || "");
        setPlanDifficulty(data.difficulty || "");
        setPlanDuration(data.estimatedDuration?.toString() || "");
        setWorkoutExercises(
          data.exercises.map((e: any) => ({
            id: `ex-${e.id}`,
            exerciseId: e.exerciseId,
            exercise: e.exercise,
            order: e.order,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            duration: e.duration,
            restBetweenSets: e.restBetweenSets,
            notes: e.notes,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch plan:", error);
      toast.error("Failed to load workout plan");
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      !search ||
      ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || ex.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const addExercise = (exercise: Exercise) => {
    const newExercise: WorkoutExercise = {
      id: `new-${Date.now()}-${Math.random()}`,
      exerciseId: exercise.id,
      exercise,
      order: workoutExercises.length,
      sets: 3,
      reps: "10",
    };
    setWorkoutExercises([...workoutExercises, newExercise]);
  };

  const updateExercise = (id: string, updates: Partial<WorkoutExercise>) => {
    setWorkoutExercises(
      workoutExercises.map((ex) =>
        ex.id === id ? { ...ex, ...updates } : ex
      )
    );
  };

  const removeExercise = (id: string) => {
    setWorkoutExercises(workoutExercises.filter((ex) => ex.id !== id));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setWorkoutExercises((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index,
        }));
      });
    }
  };

  const handleSave = async () => {
    if (!planName.trim()) {
      toast.error("Please enter a workout name");
      return;
    }

    if (workoutExercises.length === 0) {
      toast.error("Please add at least one exercise");
      return;
    }

    setSaving(true);
    try {
      const url = editId ? `/api/workout-plans/${editId}` : "/api/workout-plans";
      const method = editId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName,
          description: planDescription || null,
          category: planCategory || null,
          difficulty: planDifficulty || null,
          estimatedDuration: planDuration ? parseInt(planDuration) : null,
          exercises: workoutExercises.map((ex, index) => ({
            exerciseId: ex.exerciseId,
            order: index,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            duration: ex.duration,
            restBetweenSets: ex.restBetweenSets,
            notes: ex.notes,
          })),
        }),
      });

      if (response.ok) {
        toast.success(editId ? "Workout plan updated" : "Workout plan created");
        router.push("/workouts");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save workout plan");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save workout plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeExercise = workoutExercises.find((ex) => ex.id === activeId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/workouts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {editId ? "Edit Workout Plan" : "Workout Builder"}
            </h1>
            <p className="text-muted-foreground">
              Drag and drop exercises to build your perfect workout
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Plan
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Exercise Library */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Exercise Library</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="flexibility">Flexibility</SelectItem>
                <SelectItem value="skill">Skill</SelectItem>
                <SelectItem value="sport">Sport</SelectItem>
              </SelectContent>
            </Select>

            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredExercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No exercises found
                  </p>
                ) : (
                  filteredExercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => addExercise(exercise)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{exercise.name}</p>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {exercise.category}
                            </Badge>
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Workout Builder */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Workout Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Workout Name *</Label>
                <Input
                  id="name"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Upper Body Strength"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={planCategory} onValueChange={setPlanCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={planDifficulty} onValueChange={setPlanDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Est. Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={planDuration}
                  onChange={(e) => setPlanDuration(e.target.value)}
                  placeholder="45"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                placeholder="Describe this workout..."
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">
                Exercises ({workoutExercises.length})
              </h4>

              {workoutExercises.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Click exercises from the library to add them here
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={workoutExercises.map((ex) => ex.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {workoutExercises.map((exercise) => (
                        <SortableExerciseItem
                          key={exercise.id}
                          item={exercise}
                          onUpdate={updateExercise}
                          onRemove={removeExercise}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeExercise && (
                      <div className="border rounded-lg p-4 bg-card shadow-lg">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">
                            {activeExercise.exercise.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
