/**
 * Handle Validation Utilities
 * 
 * Validates user handles for format, profanity, reserved words, and uniqueness.
 */

import { z } from "zod";
import { moderateText } from "@/lib/moderation";

// Reserved handles that cannot be used
export const RESERVED_HANDLES = [
  // System/admin
  "admin", "administrator", "support", "help", "api", "www", "app",
  "system", "official", "mod", "moderator", "staff", "team",
  // Routes that exist in the app
  "settings", "login", "signup", "dashboard", "profile", "onboarding",
  "user", "users", "account", "workout", "workouts", "circle", "circles",
  "discover", "you", "home", "messages", "notifications", "challenge",
  "challenges", "program", "programs", "invite", "auth",
  // Common reserved
  "root", "null", "undefined", "anonymous", "guest", "test", "demo",
  "about", "contact", "terms", "privacy", "legal", "copyright",
  "blog", "news", "press", "careers", "jobs",
] as const;

// Zod schema for handle format validation
export const handleFormatSchema = z
  .string()
  .min(3, "Handle must be at least 3 characters")
  .max(20, "Handle must be at most 20 characters")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Handle must start with a letter and contain only lowercase letters, numbers, and underscores"
  );

export interface HandleValidationResult {
  valid: boolean;
  error?: string;
  errorType?: "format" | "profanity" | "reserved" | "taken";
}

/**
 * Validate handle format (local validation)
 */
export function validateHandleFormat(handle: string): HandleValidationResult {
  // Normalize to lowercase
  const normalizedHandle = handle.toLowerCase().trim();
  
  // Check format with Zod
  const formatResult = handleFormatSchema.safeParse(normalizedHandle);
  if (!formatResult.success) {
    return {
      valid: false,
      error: formatResult.error.issues[0]?.message || "Invalid handle format",
      errorType: "format",
    };
  }

  return { valid: true };
}

/**
 * Check if handle contains profanity
 */
export function validateHandleProfanity(handle: string): HandleValidationResult {
  const moderationResult = moderateText(handle);
  
  // Block any profanity in handles (strict)
  if (!moderationResult.isClean) {
    return {
      valid: false,
      error: "This handle contains inappropriate language",
      errorType: "profanity",
    };
  }

  return { valid: true };
}

/**
 * Check if handle is reserved
 */
export function validateHandleReserved(handle: string): HandleValidationResult {
  const normalizedHandle = handle.toLowerCase().trim();
  
  if (RESERVED_HANDLES.includes(normalizedHandle as any)) {
    return {
      valid: false,
      error: "This handle is reserved and cannot be used",
      errorType: "reserved",
    };
  }

  return { valid: true };
}

/**
 * Full handle validation (format + profanity + reserved)
 * Does NOT check uniqueness - that requires database access
 */
export function validateHandle(handle: string): HandleValidationResult {
  // Check format first
  const formatResult = validateHandleFormat(handle);
  if (!formatResult.valid) {
    return formatResult;
  }

  // Check profanity
  const profanityResult = validateHandleProfanity(handle);
  if (!profanityResult.valid) {
    return profanityResult;
  }

  // Check reserved words
  const reservedResult = validateHandleReserved(handle);
  if (!reservedResult.valid) {
    return reservedResult;
  }

  return { valid: true };
}

/**
 * Normalize a handle (lowercase, trim)
 */
export function normalizeHandle(handle: string): string {
  return handle.toLowerCase().trim();
}

/**
 * Suggest alternative handles based on a taken handle
 */
export function suggestAlternativeHandles(handle: string): string[] {
  const base = normalizeHandle(handle);
  const suggestions: string[] = [];
  
  // Add numbers
  for (let i = 1; i <= 99; i++) {
    const suggestion = `${base}${i}`;
    if (suggestion.length <= 20) {
      suggestions.push(suggestion);
    }
    if (suggestions.length >= 5) break;
  }
  
  // Add common suffixes
  const suffixes = ["_fit", "_gym", "_athlete", "_training"];
  for (const suffix of suffixes) {
    const suggestion = `${base}${suffix}`;
    if (suggestion.length <= 20) {
      suggestions.push(suggestion);
    }
    if (suggestions.length >= 8) break;
  }
  
  return suggestions.slice(0, 5);
}
