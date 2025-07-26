import { getEducatorDashboardData } from "@/lib/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function EducatorDashboard() {
  const result = await getEducatorDashboardData();
  
  // Handle error case
  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Educator Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your courses, problems, and track student progress from here.
          </p>
        </div>
        
        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load dashboard data. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  const data = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Educator Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your courses, problems, and track student progress from here.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* My Courses */}
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">My Courses</h3>
          {data.myCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              You have no courses created yet.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {data.myCourses.map((course) => (
                <div key={course.id} className="space-y-1">
                  <p className="text-sm font-medium">{course.name}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{course.team_count} teams</span>
                    <span>{course.problem_count} problems</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Active Projects */}
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Active Projects</h3>
          {data.activeProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              No active projects at the moment.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {data.activeProjects.slice(0, 4).map((project) => (
                <div key={project.id} className="flex items-center justify-between">
                  <div>
                    <Link 
                      href={`/p/${project.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {project.problem.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Team: {project.team.name}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {project.phase}
                  </Badge>
                </div>
              ))}
              {data.activeProjects.length > 4 && (
                <p className="text-xs text-muted-foreground">
                  +{data.activeProjects.length - 4} more projects
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Pending Assessments */}
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Pending Assessments</h3>
          {data.pendingAssessments.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              No assessments pending review.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {data.pendingAssessments.slice(0, 3).map((assessment) => (
                <div key={assessment.id} className="space-y-1">
                  <Link 
                    href={`/p/${assessment.id}`}
                    className="text-sm font-medium hover:underline block"
                  >
                    {assessment.problem.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Team: {assessment.team.name}
                  </p>
                  {assessment.final_report_url && (
                    <Badge variant="secondary" className="text-xs">
                      Report submitted
                    </Badge>
                  )}
                </div>
              ))}
              {data.pendingAssessments.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{data.pendingAssessments.length - 3} more pending
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}