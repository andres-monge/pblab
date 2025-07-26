import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/user-utils";

export default async function DashboardPage() {
  // Get authenticated user with error handling
  const user = await getAuthenticatedUser();

  // Redirect to role-specific dashboard
  if (user.role === "educator") {
    redirect("/educator/dashboard");
  } else if (user.role === "admin") {
    redirect("/admin/dashboard");
  } else {
    redirect("/student/dashboard");
  }
}