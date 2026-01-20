/**
 * Neon Auth Client - January 2026
 *
 * Client-side auth utilities for React components.
 * Use in client components with "use client" directive.
 */

"use client";

import { createAuthClient } from "@neondatabase/auth/next";

export const authClient = createAuthClient();

// Re-export commonly used hooks
export const { useSession } = authClient;
