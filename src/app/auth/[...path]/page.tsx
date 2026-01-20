/**
 * Neon Auth - Authentication Pages
 *
 * Redirects legacy auth routes to proper pages.
 * Keeps callback routes working for OAuth.
 */

"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthView } from "@neondatabase/auth/react/ui";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect sign-in and sign-up to dedicated pages
    if (pathname === "/auth/sign-in") {
      router.replace("/login");
      return;
    }
    if (pathname === "/auth/sign-up") {
      router.replace("/signup");
      return;
    }
  }, [pathname, router]);

  // For callback routes (OAuth), show the AuthView
  if (pathname?.includes("/callback") || pathname?.includes("/verify")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <AuthView />
      </div>
    );
  }

  // Show loading while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
