/**
 * Neon Auth - Account Management Pages
 *
 * Handles account routes: /account/settings, /account/passkeys, etc.
 */

"use client";

import { AccountView } from "@neondatabase/auth/react";

export default function AccountPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <AccountView />
    </div>
  );
}
