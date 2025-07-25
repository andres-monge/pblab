"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { verifyInviteToken, joinTeam } from "@/lib/actions/teams";

interface AuthFormProps {
  mode: 'login' | 'signup';
  className?: string;
}

function AuthFormContent({
  mode,
  className,
  ...props
}: AuthFormProps & React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [teamName, setTeamName] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSignup = mode === 'signup';
  
  // Get invite context from URL parameters
  const inviteToken = searchParams.get('invite');
  const teamId = searchParams.get('team');
  const isInviteSignup = isSignup && inviteToken && teamId;

  // Verify invite token and get team name on mount for signup mode
  useEffect(() => {
    if (isInviteSignup && inviteToken) {
      verifyInviteToken(inviteToken).then(async (result) => {
        if (result.success) {
          // Get team name for display
          const supabase = createClient();
          const { data: team } = await supabase
            .from('teams')
            .select('name')
            .eq('id', result.data.teamId)
            .single();
          
          if (team) {
            setTeamName(team.name);
          }
        } else {
          setError(result.error);
        }
      });
    }
  }, [isInviteSignup, inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      if (isSignup) {
        // Journey B: Signup with password (for new users, including via invite)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName,
            },
          },
        });
        if (error) throw error;

        // If this is an invite signup and user was created successfully
        if (isInviteSignup && data.user && teamId) {
          try {
            // Join the team automatically
            const joinResult = await joinTeam({ teamId });
            if (joinResult.success) {
              router.push("/student/dashboard?message=team-joined-via-invite");
            } else {
              // Signup succeeded but team join failed - still redirect to success but show error
              router.push(`/auth/sign-up-success?warning=${encodeURIComponent(joinResult.error)}`);
            }
          } catch (joinError) {
            // Signup succeeded but team join failed - redirect to success page
            const errorMessage = joinError instanceof Error ? joinError.message : "Failed to join team";
            router.push(`/auth/sign-up-success?warning=${encodeURIComponent(errorMessage)}`);
          }
        } else {
          // Regular signup (no invite)
          router.push("/auth/sign-up-success");
        }
      } else {
        // Journey A: Password login for existing seeded accounts
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const config = {
    login: {
      title: "Login",
      description: "Enter your email and password to sign in",
      buttonText: isLoading ? "Signing in..." : "Sign in",
      linkText: "Don't have an account?",
      linkHref: "/auth/sign-up",
      linkAction: "Sign up",
    },
    signup: {
      title: isInviteSignup ? `Join ${teamName || "Team"}` : "Sign up", 
      description: isInviteSignup 
        ? `Create your account to join ${teamName || "the team"}`
        : "Create a new account with your email and password",
      buttonText: isLoading 
        ? (isInviteSignup ? "Joining team..." : "Creating account...") 
        : (isInviteSignup ? "Join team" : "Create account"),
      linkText: "Already have an account?",
      linkHref: "/auth/login",
      linkAction: "Login",
    },
  };

  const currentConfig = config[mode];

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {isInviteSignup && (
        <div className="rounded-lg border bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Team Invitation</span>
            {teamName && <span>• {teamName}</span>}
          </div>
          <p className="mt-1">You&apos;ve been invited to join a team. Create your account below to get started!</p>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{currentConfig.title}</CardTitle>
          <CardDescription>
            {currentConfig.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {isSignup && (
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {currentConfig.buttonText}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              {currentConfig.linkText}{" "}
              <Link
                href={currentConfig.linkHref}
                className="underline underline-offset-4"
              >
                {currentConfig.linkAction}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuthForm(props: AuthFormProps & React.ComponentPropsWithoutRef<"div">) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthFormContent {...props} />
    </Suspense>
  );
} 