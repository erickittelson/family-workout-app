import { redirect } from "next/navigation";
import { getSession } from "@/lib/neon-auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Not authenticated - redirect to login
  if (!session) {
    redirect("/login");
  }

  // Note: We no longer redirect users who have circles.
  // The new onboarding flow creates an individual profile first,
  // then prompts to create/join a circle from the dashboard.
  // Users can revisit /onboarding if they want to redo their profile.

  return <>{children}</>;
}
