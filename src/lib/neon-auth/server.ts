/**
 * Neon Auth Server - January 2026
 *
 * Server-side auth utilities for API routes and Server Components.
 */

import { createAuthServer } from "@neondatabase/auth/next/server";

export const authServer = createAuthServer();

// Re-export the neonAuth utility for quick access in server components
export { neonAuth } from "@neondatabase/auth/next/server";
