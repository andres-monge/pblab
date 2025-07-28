import { redirect } from "next/navigation";
import { verifyUserInviteToken } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/server";

interface InvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const { token } = await searchParams;

  // Redirect to login if no token provided
  if (!token) {
    redirect("/auth/login?error=missing-invite-token");
  }

  // Verify the invite token
  const tokenResult = await verifyUserInviteToken(token);
  
  if (!tokenResult.success) {
    // Invalid token - redirect to login with error
    const encodedError = encodeURIComponent(tokenResult.error);
    redirect(`/auth/login?error=invalid-invite&message=${encodedError}`);
  }

  const { email, role } = tokenResult.data;

  // Check if user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // User not authenticated - redirect to signup with invite context
    redirect(`/auth/sign-up?invite=${encodeURIComponent(token)}`);
  }

  // User is authenticated - check if this is the invited user
  if (user.email !== email) {
    // Different user is logged in - redirect with error
    redirect(`/auth/login?error=wrong-user&message=${encodeURIComponent("Please log in with the invited email address: " + email)}`);
  }

  // User is authenticated and it's the correct user
  // Check if they already have the correct role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role === role) {
    // User already has the correct role - redirect to appropriate dashboard
    const dashboardMap = {
      'admin': '/admin/dashboard',
      'educator': '/educator/dashboard',
      'student': '/student/dashboard'
    };
    
    const dashboardPath = dashboardMap[role as keyof typeof dashboardMap] || '/dashboard';
    redirect(`${dashboardPath}?message=already-has-role`);
  }

  // User needs role update - this would typically be handled by the signup process
  // For existing users, we might need additional logic here
  redirect(`/dashboard?message=invite-processed&role=${role}`);
}