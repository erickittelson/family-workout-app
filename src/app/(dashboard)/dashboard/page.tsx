import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { circleMembers, workoutSessions, goals } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CircleOnboardingPrompt } from "@/components/circle-onboarding-prompt";
import Link from "next/link";
import {
  Users,
  Dumbbell,
  Target,
  TrendingUp,
  ArrowRight,
  CalendarDays,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const circleId = session.circleId;

  // Fetch circle members
  const members = await db.query.circleMembers.findMany({
    where: eq(circleMembers.circleId, circleId),
    with: {
      metrics: {
        orderBy: (metrics, { desc }) => [desc(metrics.date)],
        limit: 1,
      },
    },
  });

  // Fetch recent workouts (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentWorkouts = await db.query.workoutSessions.findMany({
    where: and(
      gte(workoutSessions.date, sevenDaysAgo),
      eq(workoutSessions.status, "completed")
    ),
    with: {
      member: true,
    },
    orderBy: [desc(workoutSessions.date)],
    limit: 5,
  });

  // Fetch active goals
  const activeGoals = await db.query.goals.findMany({
    where: eq(goals.status, "active"),
    with: {
      member: true,
    },
    limit: 5,
  });

  // Calculate stats
  const totalWorkoutsThisWeek = recentWorkouts.length;
  const totalActiveGoals = activeGoals.length;

  // Check if user is new (just completed onboarding)
  // New users have only their auto-created personal circle with just themselves
  const isNewUser = session.circles.length === 1 && members.length === 1;
  // For circle prompt, check if they only have their personal space
  const hasMultipleMembers = members.length > 1;

  return (
    <div className="space-y-6">
      {/* Circle onboarding prompt for new users */}
      <CircleOnboardingPrompt
        userName={session.user.name?.split(" ")[0]}
        hasCircles={hasMultipleMembers || session.circles.length > 1}
        isNewUser={isNewUser}
      />
      <div>
        <h1 className="text-3xl font-bold">Welcome, {session.user.name}!</h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your circle&apos;s fitness journey
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Circle Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              {members.length === 0
                ? "Add your first member"
                : "Active members"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workouts This Week</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkoutsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              Completed sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveGoals}</div>
            <p className="text-xs text-muted-foreground">
              Goals in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Days active
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Circle Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Circle Members</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/members">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-6">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No members yet</h3>
                <p className="text-sm text-muted-foreground">
                  Add members to get started
                </p>
                <Button asChild className="mt-4">
                  <Link href="/members">Add Member</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.metrics[0]?.fitnessLevel || "Not set"}
                        </p>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/members/${member.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Workouts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Workouts</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/workouts">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentWorkouts.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No recent workouts</h3>
                <p className="text-sm text-muted-foreground">
                  Start logging workouts to track progress
                </p>
                <Button asChild className="mt-4">
                  <Link href="/workouts">Log Workout</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentWorkouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Dumbbell className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{workout.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {workout.member.name} •{" "}
                          {new Date(workout.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Goals */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Goals</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/goals">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activeGoals.length === 0 ? (
              <div className="text-center py-6">
                <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold">No active goals</h3>
                <p className="text-sm text-muted-foreground">
                  Set goals to track your circle&apos;s progress
                </p>
                <Button asChild className="mt-4">
                  <Link href="/goals">Set Goal</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{goal.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {goal.member.name}
                      </span>
                    </div>
                    <h4 className="font-medium">{goal.title}</h4>
                    {goal.targetValue && (
                      <p className="text-sm text-muted-foreground">
                        Target: {goal.targetValue} {goal.targetUnit}
                        {goal.currentValue && (
                          <span className="ml-2">
                            (Current: {goal.currentValue})
                          </span>
                        )}
                      </p>
                    )}
                    {goal.targetDate && (
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(goal.targetDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
