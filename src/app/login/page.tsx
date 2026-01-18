"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dumbbell, Users, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [familyName, setFamilyName] = useState("");
  const [passkey, setPasskey] = useState("");
  const [confirmPasskey, setConfirmPasskey] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("family-passkey", {
        familyName,
        passkey,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid family name or passkey");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (passkey !== confirmPasskey) {
      setError("Passkeys do not match");
      setIsLoading(false);
      return;
    }

    if (passkey.length < 4) {
      setError("Passkey must be at least 4 characters");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: familyName, passkey }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create family");
        setIsLoading(false);
        return;
      }

      // Auto login after registration
      const result = await signIn("family-passkey", {
        familyName,
        passkey,
        redirect: false,
      });

      if (result?.error) {
        setError("Registration successful but login failed. Please try logging in.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Dumbbell className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Family Workout App</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Enter your family name and passkey to continue"
              : "Create a new family account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === "login" ? handleLogin : handleRegister}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="familyName">Family Name</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="familyName"
                    placeholder="The Smiths"
                    className="pl-10"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passkey">Passkey</Label>
                <Input
                  id="passkey"
                  type="password"
                  placeholder="Enter your family passkey"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  required
                />
              </div>

              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPasskey">Confirm Passkey</Label>
                  <Input
                    id="confirmPasskey"
                    type="password"
                    placeholder="Confirm your passkey"
                    value={confirmPasskey}
                    onChange={(e) => setConfirmPasskey(e.target.value)}
                    required
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login" ? "Sign In" : "Create Family"}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setError("");
                  }}
                >
                  {mode === "login"
                    ? "Don't have a family account? Create one"
                    : "Already have an account? Sign in"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
