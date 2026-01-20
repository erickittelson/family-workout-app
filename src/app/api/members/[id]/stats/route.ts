import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  circleMembers,
  workoutSessions,
  exerciseSets,
  personalRecords,
  goals,
} from "@/lib/db/schema";
import { eq, and, desc, gte, count, sql } from "drizzle-orm";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt?: string;
  progress?: number;
  target?: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: memberId } = await params;

    // Verify member belongs to this circle
    const member = await db.query.circleMembers.findFirst({
      where: and(
        eq(circleMembers.id, memberId),
        eq(circleMembers.circleId, session.circleId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get all completed workout sessions
    const sessions = await db.query.workoutSessions.findMany({
      where: and(
        eq(workoutSessions.memberId, memberId),
        eq(workoutSessions.status, "completed")
      ),
      orderBy: [desc(workoutSessions.date)],
      columns: {
        id: true,
        date: true,
        rating: true,
      },
    });

    // Calculate streak
    const streak = calculateStreak(sessions.map((s) => s.date));

    // Calculate this week's workouts
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekWorkouts = sessions.filter(
      (s) => new Date(s.date) >= startOfWeek
    ).length;

    // Calculate this month's workouts
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthWorkouts = sessions.filter(
      (s) => new Date(s.date) >= startOfMonth
    ).length;

    // Get total workouts
    const totalWorkouts = sessions.length;

    // Get personal records count
    const prCount = await db
      .select({ count: count() })
      .from(personalRecords)
      .where(eq(personalRecords.memberId, memberId));

    // Get completed goals count
    const completedGoalsCount = await db
      .select({ count: count() })
      .from(goals)
      .where(
        and(eq(goals.memberId, memberId), eq(goals.status, "completed"))
      );

    // Calculate total volume lifted (simplified)
    const volumeResult = await db.execute(sql`
      SELECT COALESCE(SUM(
        COALESCE(es.actual_weight, es.target_weight, 0) *
        COALESCE(es.actual_reps, es.target_reps, 0)
      ), 0) as total_volume
      FROM exercise_sets es
      JOIN workout_session_exercises wse ON es.session_exercise_id = wse.id
      JOIN workout_sessions ws ON wse.session_id = ws.id
      WHERE ws.member_id = ${memberId}
      AND ws.status = 'completed'
    `);

    const totalVolume = Number((volumeResult.rows[0] as { total_volume: number })?.total_volume || 0);

    // Calculate average workout rating
    const ratedWorkouts = sessions.filter((s) => s.rating);
    const avgRating =
      ratedWorkouts.length > 0
        ? ratedWorkouts.reduce((acc, s) => acc + (s.rating || 0), 0) /
          ratedWorkouts.length
        : 0;

    // Build achievements list
    const achievements = buildAchievements({
      totalWorkouts,
      streak,
      thisWeekWorkouts,
      thisMonthWorkouts,
      totalVolume,
      prCount: prCount[0].count,
      completedGoals: completedGoalsCount[0].count,
    });

    return NextResponse.json({
      streak: {
        current: streak.current,
        longest: streak.longest,
        lastWorkoutDate: sessions[0]?.date || null,
      },
      workouts: {
        total: totalWorkouts,
        thisWeek: thisWeekWorkouts,
        thisMonth: thisMonthWorkouts,
        avgRating: Math.round(avgRating * 10) / 10,
      },
      volume: {
        total: totalVolume,
        formatted: formatVolume(totalVolume),
      },
      records: {
        personalRecords: prCount[0].count,
        completedGoals: completedGoalsCount[0].count,
      },
      achievements,
    });
  } catch (error) {
    console.error("Error fetching member stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch member stats" },
      { status: 500 }
    );
  }
}

function calculateStreak(dates: Date[]): { current: number; longest: number } {
  if (dates.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort dates in descending order
  const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime());

  // Normalize dates to start of day
  const normalizedDates = sortedDates.map((d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  // Remove duplicates (same day workouts)
  const uniqueDates: Date[] = [];
  for (const date of normalizedDates) {
    if (
      uniqueDates.length === 0 ||
      uniqueDates[uniqueDates.length - 1].getTime() !== date.getTime()
    ) {
      uniqueDates.push(date);
    }
  }

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if the most recent workout is today or yesterday
  const mostRecentDate = uniqueDates[0];
  if (
    mostRecentDate.getTime() === today.getTime() ||
    mostRecentDate.getTime() === yesterday.getTime()
  ) {
    currentStreak = 1;
    let expectedDate = new Date(mostRecentDate);

    for (let i = 1; i < uniqueDates.length; i++) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      if (uniqueDates[i].getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = uniqueDates[i - 1].getTime() - uniqueDates[i].getTime();
    const dayDiff = diff / (1000 * 60 * 60 * 24);

    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    current: currentStreak,
    longest: Math.max(longestStreak, currentStreak),
  };
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M lbs`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K lbs`;
  }
  return `${volume.toLocaleString()} lbs`;
}

function buildAchievements(stats: {
  totalWorkouts: number;
  streak: { current: number; longest: number };
  thisWeekWorkouts: number;
  thisMonthWorkouts: number;
  totalVolume: number;
  prCount: number;
  completedGoals: number;
}): Achievement[] {
  const achievements: Achievement[] = [];
  const now = new Date().toISOString();

  // Workout count achievements
  const workoutMilestones = [
    { count: 1, title: "First Steps", desc: "Complete your first workout" },
    { count: 10, title: "Getting Started", desc: "Complete 10 workouts" },
    { count: 25, title: "Dedicated", desc: "Complete 25 workouts" },
    { count: 50, title: "Half Century", desc: "Complete 50 workouts" },
    { count: 100, title: "Century Club", desc: "Complete 100 workouts" },
    { count: 250, title: "Iron Will", desc: "Complete 250 workouts" },
    { count: 500, title: "Legend", desc: "Complete 500 workouts" },
  ];

  for (const milestone of workoutMilestones) {
    if (stats.totalWorkouts >= milestone.count) {
      achievements.push({
        id: `workouts-${milestone.count}`,
        title: milestone.title,
        description: milestone.desc,
        icon: "trophy",
        earnedAt: now,
      });
    } else {
      achievements.push({
        id: `workouts-${milestone.count}`,
        title: milestone.title,
        description: milestone.desc,
        icon: "trophy",
        progress: stats.totalWorkouts,
        target: milestone.count,
      });
      break;
    }
  }

  // Streak achievements
  const streakMilestones = [
    { count: 3, title: "Three-peat", desc: "3 day workout streak" },
    { count: 7, title: "Week Warrior", desc: "7 day workout streak" },
    { count: 14, title: "Two Week Terror", desc: "14 day workout streak" },
    { count: 30, title: "Month of Iron", desc: "30 day workout streak" },
    { count: 60, title: "Unstoppable", desc: "60 day workout streak" },
    { count: 100, title: "Centurion", desc: "100 day workout streak" },
  ];

  for (const milestone of streakMilestones) {
    if (stats.streak.longest >= milestone.count) {
      achievements.push({
        id: `streak-${milestone.count}`,
        title: milestone.title,
        description: milestone.desc,
        icon: "flame",
        earnedAt: now,
      });
    } else {
      achievements.push({
        id: `streak-${milestone.count}`,
        title: milestone.title,
        description: milestone.desc,
        icon: "flame",
        progress: stats.streak.current,
        target: milestone.count,
      });
      break;
    }
  }

  // Volume achievements
  const volumeMilestones = [
    { amount: 10000, title: "Ten Thousand", desc: "Lift 10,000 lbs total" },
    { amount: 100000, title: "Hundred K", desc: "Lift 100,000 lbs total" },
    { amount: 500000, title: "Half Ton Club", desc: "Lift 500,000 lbs total" },
    { amount: 1000000, title: "Million Pounder", desc: "Lift 1,000,000 lbs total" },
  ];

  for (const milestone of volumeMilestones) {
    if (stats.totalVolume >= milestone.amount) {
      achievements.push({
        id: `volume-${milestone.amount}`,
        title: milestone.title,
        description: milestone.desc,
        icon: "weight",
        earnedAt: now,
      });
    } else {
      achievements.push({
        id: `volume-${milestone.amount}`,
        title: milestone.title,
        description: milestone.desc,
        icon: "weight",
        progress: Math.round(stats.totalVolume),
        target: milestone.amount,
      });
      break;
    }
  }

  // PR achievements
  if (stats.prCount >= 1) {
    achievements.push({
      id: "first-pr",
      title: "Record Breaker",
      description: "Set your first personal record",
      icon: "medal",
      earnedAt: now,
    });
  }

  if (stats.prCount >= 10) {
    achievements.push({
      id: "pr-10",
      title: "PR Hunter",
      description: "Set 10 personal records",
      icon: "medal",
      earnedAt: now,
    });
  }

  // Goal achievements
  if (stats.completedGoals >= 1) {
    achievements.push({
      id: "first-goal",
      title: "Goal Getter",
      description: "Complete your first goal",
      icon: "target",
      earnedAt: now,
    });
  }

  if (stats.completedGoals >= 5) {
    achievements.push({
      id: "goals-5",
      title: "Achiever",
      description: "Complete 5 goals",
      icon: "target",
      earnedAt: now,
    });
  }

  // Weekly consistency
  if (stats.thisWeekWorkouts >= 5) {
    achievements.push({
      id: "weekly-5",
      title: "Week Champion",
      description: "Complete 5 workouts in a week",
      icon: "calendar",
      earnedAt: now,
    });
  }

  return achievements;
}
