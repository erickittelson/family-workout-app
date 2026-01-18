"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList,
  Plus,
  Calendar,
  Loader2,
  Play,
  CheckCircle,
} from "lucide-react";
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

interface WorkoutSession {
  id: string;
  name: string;
  date: string;
  status: string;
  memberName: string;
  rating?: number;
}

export default function WorkoutsPage() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, sessionsRes] = await Promise.all([
        fetch("/api/workout-plans"),
        fetch("/api/workout-sessions"),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load workouts");
    } finally {
      setLoading(false);
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
              Log Workout
            </Link>
          </Button>
          <Button asChild>
            <Link href="/workouts/builder">
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Link>
          </Button>
        </div>
      </div>

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
              {plans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {plan.description}
                      </p>
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
                      <Button asChild size="sm" className="flex-1">
                        <Link href={`/workouts/log?plan=${plan.id}`}>
                          <Play className="mr-1 h-3 w-3" />
                          Start
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                <Card key={session.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            session.status === "completed"
                              ? "bg-green-500/10"
                              : session.status === "in_progress"
                              ? "bg-yellow-500/10"
                              : "bg-muted"
                          }`}
                        >
                          {session.status === "completed" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Play className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{session.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.memberName} •{" "}
                            {new Date(session.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            session.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {session.status}
                        </Badge>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/workouts/session/${session.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
