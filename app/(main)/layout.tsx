import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/pblab/header";
import { Sidebar } from "@/components/pblab/sidebar";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user role from database
  const { data: userData } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .single();

  const userRole = userData?.role || "student";
  const fullName = userData?.name || user.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header user={{ ...user, role: userRole, full_name: fullName }} />
      
      {/* Main content area with sidebar */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar userRole={userRole} />
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}