"use client";

import { useState, useEffect } from "react";
import { getEducatorDashboardData, type EducatorDashboardData } from "@/lib/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function EducatorDashboard() {
  const [data, setData] = useState<EducatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedActiveProjects, setExpandedActiveProjects] = useState(false);
  const [expandedCompletedProjects, setExpandedCompletedProjects] = useState(false);
  const [expandedPendingAssessments, setExpandedPendingAssessments] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getEducatorDashboardData();
        if (result.success) {
          setData(result.data);
        } else {
          setError("Failed to load dashboard data. Please try refreshing the page.");
        }
      } catch {
        setError("Failed to load dashboard data. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Educator Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your courses, problems, and track student progress from here.
            </p>
          </div>
          <Link href="/educator/problems/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Problem
            </Button>
          </Link>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Educator Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your courses, problems, and track student progress from here.
            </p>
          </div>
          <Link href="/educator/problems/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Problem
            </Button>
          </Link>
        </div>
        
        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-destructive">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Educator Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your courses, problems, and track student progress from here.
          </p>
        </div>
        <Link href="/educator/problems/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Problem
          </Button>
        </Link>
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
              {(expandedActiveProjects ? data.activeProjects : data.activeProjects.slice(0, 4)).map((project) => (
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedActiveProjects(!expandedActiveProjects)}
                  className="text-xs text-muted-foreground h-auto p-1 hover:text-foreground"
                >
                  {expandedActiveProjects 
                    ? "Show less" 
                    : `+${data.activeProjects.length - 4} more projects`
                  }
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Completed Projects */}
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Completed Projects</h3>
          {data.completedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              No completed projects yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {(expandedCompletedProjects ? data.completedProjects : data.completedProjects.slice(0, 4)).map((project) => (
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
                  <Badge variant="secondary" className="text-xs">
                    {project.phase}
                  </Badge>
                </div>
              ))}
              {data.completedProjects.length > 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedCompletedProjects(!expandedCompletedProjects)}
                  className="text-xs text-muted-foreground h-auto p-1 hover:text-foreground"
                >
                  {expandedCompletedProjects 
                    ? "Show less" 
                    : `+${data.completedProjects.length - 4} more projects`
                  }
                </Button>
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
              {(expandedPendingAssessments ? data.pendingAssessments : data.pendingAssessments.slice(0, 3)).map((assessment) => (
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedPendingAssessments(!expandedPendingAssessments)}
                  className="text-xs text-muted-foreground h-auto p-1 hover:text-foreground"
                >
                  {expandedPendingAssessments 
                    ? "Show less" 
                    : `+${data.pendingAssessments.length - 3} more pending`
                  }
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}