/**
 * User Scheduled Workouts API
 * 
 * GET - Get all scheduled workouts for a user (across all programs) in a date range
 * Useful for calendar view showing all upcoming workouts
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  scheduledWorkouts,
  programWorkouts,
  programEnrollments,
  communityPrograms,
  userProgramSchedules,
} from "@/lib/db/schema";
import { eq, and, gte, lte, asc, desc, or } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const status = url.searchParams.get("status"); // scheduled, completed, missed, skipped
    const includeCompleted = url.searchParams.get("includeCompleted") === "true";

    // Default to current week if no dates provided
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultStart.getDate() + 13); // Two weeks

    const start = startDate || defaultStart.toISOString().split("T")[0];
    const end = endDate || defaultEnd.toISOString().split("T")[0];

    // Build query conditions
    const conditions = [
      eq(scheduledWorkouts.userId, session.user.id),
      gte(scheduledWorkouts.scheduledDate, start),
      lte(scheduledWorkouts.scheduledDate, end),
    ];

    if (status) {
      conditions.push(eq(scheduledWorkouts.status, status));
    } else if (!includeCompleted) {
      // By default, don't include completed workouts in calendar view
      conditions.push(
        or(
          eq(scheduledWorkouts.status, "scheduled"),
          eq(scheduledWorkouts.status, "missed")
        )!
      );
    }

    // Get all scheduled workouts for the user in the date range
    const workouts = await db
      .select({
        id: scheduledWorkouts.id,
        scheduledDate: scheduledWorkouts.scheduledDate,
        scheduledTime: scheduledWorkouts.scheduledTime,
        status: scheduledWorkouts.status,
        originalDate: scheduledWorkouts.originalDate,
        rescheduledCount: scheduledWorkouts.rescheduledCount,
        notes: scheduledWorkouts.notes,
        completedAt: scheduledWorkouts.completedAt,
        programWorkout: {
          id: programWorkouts.id,
          name: programWorkouts.name,
          focus: programWorkouts.focus,
          weekNumber: programWorkouts.weekNumber,
          dayNumber: programWorkouts.dayNumber,
          estimatedDuration: programWorkouts.estimatedDuration,
          programId: programWorkouts.programId,
        },
        program: {
          id: communityPrograms.id,
          name: communityPrograms.name,
          category: communityPrograms.category,
        },
      })
      .from(scheduledWorkouts)
      .innerJoin(programWorkouts, eq(scheduledWorkouts.programWorkoutId, programWorkouts.id))
      .innerJoin(communityPrograms, eq(programWorkouts.programId, communityPrograms.id))
      .where(and(...conditions))
      .orderBy(asc(scheduledWorkouts.scheduledDate));

    // Group by date for calendar view
    const workoutsByDate: Record<string, typeof workouts> = {};
    for (const workout of workouts) {
      const date = workout.scheduledDate;
      if (!workoutsByDate[date]) {
        workoutsByDate[date] = [];
      }
      workoutsByDate[date].push(workout);
    }

    // Check for missed workouts (past scheduled workouts not completed)
    const todayStr = today.toISOString().split("T")[0];
    const missedWorkouts = workouts.filter(
      (w) => w.scheduledDate < todayStr && w.status === "scheduled"
    );

    // Update missed workouts status
    if (missedWorkouts.length > 0) {
      await db
        .update(scheduledWorkouts)
        .set({ status: "missed", updatedAt: new Date() })
        .where(
          and(
            eq(scheduledWorkouts.userId, session.user.id),
            eq(scheduledWorkouts.status, "scheduled"),
            lte(scheduledWorkouts.scheduledDate, todayStr)
          )
        );

      // Update the local data
      for (const w of workouts) {
        if (w.scheduledDate < todayStr && w.status === "scheduled") {
          w.status = "missed";
        }
      }
    }

    // Summary stats
    const stats = {
      total: workouts.length,
      scheduled: workouts.filter((w) => w.status === "scheduled").length,
      completed: workouts.filter((w) => w.status === "completed").length,
      missed: workouts.filter((w) => w.status === "missed").length,
      skipped: workouts.filter((w) => w.status === "skipped").length,
    };

    return Response.json({
      workouts,
      workoutsByDate,
      stats,
      dateRange: { start, end },
      hasMissedWorkouts: stats.missed > 0,
    });
  } catch (error) {
    console.error("Error fetching scheduled workouts:", error);
    return Response.json({ error: "Failed to fetch workouts" }, { status: 500 });
  }
}
