import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/neon-auth";
import { db } from "@/lib/db";
import { onboardingProgress } from "@/lib/db/schema";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Check if user has incomplete onboarding
  const progress = await db.query.onboardingProgress.findFirst({
    where: eq(onboardingProgress.userId, session.user.id),
  });

  // Redirect to onboarding if:
  // 1. User has no circles (never completed onboarding)
  // 2. User has incomplete onboarding progress (started but didn't finish)
  if (!session.activeCircle || (progress && !progress.completedAt)) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        circleName={session.activeCircle.name}
        circleId={session.activeCircle.id}
        circles={session.circles}
        userName={session.user.name}
        userImage={session.user.image}
      />
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="container mx-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
