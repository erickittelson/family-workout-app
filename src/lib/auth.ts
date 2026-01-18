import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { families, familyMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// For shared family passkey, we use a simple credential-based auth
// The passkey is a shared PIN/code that the family uses to log in

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "family-passkey",
      name: "Family Passkey",
      credentials: {
        familyName: { label: "Family Name", type: "text" },
        passkey: { label: "Passkey", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.familyName || !credentials?.passkey) {
          return null;
        }

        const familyName = credentials.familyName as string;
        const passkey = credentials.passkey as string;

        // Find family by name and passkey
        const family = await db.query.families.findFirst({
          where: eq(families.name, familyName),
        });

        if (!family) {
          return null;
        }

        // Simple passkey comparison (in production, use bcrypt)
        // For MVP, storing as plain text - should hash in production
        if (family.passkey !== passkey) {
          return null;
        }

        return {
          id: family.id,
          name: family.name,
          email: `${family.id}@family.local`, // Pseudo email for NextAuth
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.familyId = user.id;
        token.familyName = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.familyId as string;
        session.user.name = token.familyName as string;
        session.familyId = token.familyId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

// Type augmentation for session
declare module "next-auth" {
  interface Session {
    familyId: string;
    user: {
      id: string;
      name: string;
      email?: string;
    };
  }
}
