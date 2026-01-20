/**
 * Auth - January 2026
 *
 * Re-exports from Neon Auth for backward compatibility.
 * New code should import directly from @/lib/neon-auth
 */

export {
  getSession as auth,
  requireAuth,
  requireCircle,
  type AppSession,
} from "@/lib/neon-auth";

// Placeholder handlers for NextAuth routes that may still be referenced
export const handlers = {
  GET: async () => new Response("Moved to Neon Auth", { status: 301 }),
  POST: async () => new Response("Moved to Neon Auth", { status: 301 }),
};

// No-op functions for backward compatibility
export async function signIn() {
  throw new Error("Use Neon Auth signIn instead");
}

export async function signOut() {
  throw new Error("Use Neon Auth signOut instead");
}

/**
 * @deprecated Passkey authentication removed - now using Neon Auth
 * This function is kept for backward compatibility but always returns empty string
 */
export async function hashPasskey(_passkey: string): Promise<string> {
  console.warn("hashPasskey is deprecated - passkey authentication removed");
  return "";
}
