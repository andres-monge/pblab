import { redirect } from "next/navigation";
import { verifyInviteToken, joinTeam } from "@/lib/actions/teams";
import { createClient } from "@/lib/supabase/server";

interface JoinPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { token } = await searchParams;

  // Redirect to login if no token provided
  if (!token) {
    redirect("/auth/login?error=missing-invite-token");
  }

  // Verify the invite token
  const tokenResult = await verifyInviteToken(token);
  
  if (!tokenResult.success) {
    // Invalid token - redirect to login with error
    const encodedError = encodeURIComponent(tokenResult.error);
    redirect(`/auth/login?error=invalid-invite&message=${encodedError}`);
  }

  const { teamId } = tokenResult.data;

  // Check if user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // User not authenticated - redirect to signup with invite context
    redirect(`/auth/sign-up?invite=${encodeURIComponent(token)}&team=${teamId}`);
  }

  // User is authenticated - try to join the team directly
  try {
    const joinResult = await joinTeam({ teamId });
    
    if (joinResult.success) {
      // Successfully joined team - redirect to student dashboard
      redirect("/student/dashboard?message=team-joined");
    } else {
      // Failed to join team - redirect to dashboard with error
      const encodedError = encodeURIComponent(joinResult.error);
      redirect(`/dashboard?error=join-failed&message=${encodedError}`);
    }
  } catch (error) {
    // Unexpected error
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    const encodedError = encodeURIComponent(errorMessage);
    redirect(`/dashboard?error=unexpected&message=${encodedError}`);
  }
}