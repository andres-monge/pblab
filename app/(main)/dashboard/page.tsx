import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Get user role to redirect to appropriate dashboard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = userData?.role || "student";

  // Redirect to role-specific dashboard (these will be implemented in Step 20)
  if (userRole === "educator") {
    redirect("/educator/dashboard");
  } else if (userRole === "admin") {
    redirect("/admin/dashboard");
  } else {
    redirect("/student/dashboard");
  }
}