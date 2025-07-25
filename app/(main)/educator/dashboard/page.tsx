export default function EducatorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Educator Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your courses, problems, and track student progress from here.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">My Courses</h3>
          <p className="text-sm text-muted-foreground mt-2">
            You have no courses created yet.
          </p>
        </div>
        
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Active Problems</h3>
          <p className="text-sm text-muted-foreground mt-2">
            No active problems at the moment.
          </p>
        </div>
        
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Pending Assessments</h3>
          <p className="text-sm text-muted-foreground mt-2">
            No assessments pending review.
          </p>
        </div>
      </div>
    </div>
  );
}