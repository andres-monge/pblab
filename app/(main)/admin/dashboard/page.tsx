export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, teams, and system settings from your admin control panel.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">User Management</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Create, edit, and manage user accounts and roles.
          </p>
        </div>
        
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Team Management</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Organize students into teams and manage team assignments.
          </p>
        </div>
        
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">System Overview</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Monitor platform usage and system health metrics.
          </p>
        </div>
      </div>
    </div>
  );
}