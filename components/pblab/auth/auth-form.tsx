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
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AuthFormProps {
  mode: 'login' | 'signup';
  className?: string;
}

export function AuthForm({
  mode,
  className,
  ...props
}: AuthFormProps & React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const isSignup = mode === 'signup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const authOptions = {
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          ...(isSignup && {
            shouldCreateUser: true,
            data: {
              name: fullName,
            },
          }),
        },
      };

      const { error } = await supabase.auth.signInWithOtp(authOptions);
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const config = {
    login: {
      title: "Login",
      description: "Enter your email below to receive a magic link",
      buttonText: isLoading ? "Sending login link..." : "Send login link",
      linkText: "Don't have an account?",
      linkHref: "/auth/sign-up",
      linkAction: "Sign up",
    },
    signup: {
      title: "Sign up", 
      description: "Create a new account - we'll send you a magic link",
      buttonText: isLoading ? "Creating account..." : "Create account",
      linkText: "Already have an account?",
      linkHref: "/auth/login",
      linkAction: "Login",
    },
  };

  const currentConfig = config[mode];

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
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