import { Header } from "@/components/pblab/header";
import { getAuthenticatedUser } from "@/lib/auth/user-utils";

export default async function ProjectLayout({
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
      
      {/* Main content - no sidebar for maximum workspace screen space */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}