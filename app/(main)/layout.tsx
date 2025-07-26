import { Header } from "@/components/pblab/header";
import { Sidebar } from "@/components/pblab/sidebar";
import { getAuthenticatedUser } from "@/lib/auth/user-utils";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get authenticated user with error handling
  const user = await getAuthenticatedUser();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header user={{ ...user, full_name: user.name }} />
      
      {/* Main content area with sidebar */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar userRole={user.role} />
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}