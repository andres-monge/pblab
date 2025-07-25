export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your learning dashboard. Here you can track your progress and access your projects.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Active Projects</h3>
          <p className="text-sm text-muted-foreground mt-2">
            You have no active projects at the moment.
          </p>
        </div>
        
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Team Notifications</h3>
          <p className="text-sm text-muted-foreground mt-2">
            No new notifications.
          </p>
        </div>
        
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Recent Activity</h3>
          <p className="text-sm text-muted-foreground mt-2">
            No recent activity to show.
          </p>
        </div>
      </div>
    </div>
  );
}