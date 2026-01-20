/**
 * Neon Auth API Route Handler
 *
 * Routes all authentication requests through Neon Auth.
 * All auth APIs are available at /api/auth/*
 */

import { authApiHandler } from "@neondatabase/auth/next/server";

export const { GET, POST } = authApiHandler();
