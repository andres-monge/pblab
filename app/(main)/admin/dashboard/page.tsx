export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, teams, and courses from your administrative control panel.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">System Overview</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Monitor overall system health and usage statistics.
          </p>
        </div>
        
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">User Management</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Create, edit, and manage user accounts and roles.
          </p>
        </div>
        
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Activity Monitor</h3>
          <p className="text-sm text-muted-foreground mt-2">
            View recent system activity and user actions.
          </p>
        </div>
      </div>
    </div>
  );
}