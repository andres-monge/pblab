"use client";

import { useState, useEffect } from "react";
import { getStudentDashboardData, type StudentDashboardData } from "@/lib/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function StudentDashboard() {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedActiveProjects, setExpandedActiveProjects] = useState(false);
  const [expandedNotifications, setExpandedNotifications] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getStudentDashboardData();
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your learning dashboard. Here you can track your progress and access your projects.
          </p>
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your learning dashboard. Here you can track your progress and access your projects.
          </p>
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your learning dashboard. Here you can track your progress and access your projects.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Active Projects */}
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Active Projects</h3>
          {data.activeProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              You have no active projects at the moment.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {(expandedActiveProjects ? data.activeProjects : data.activeProjects.slice(0, 3)).map((project) => (
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
              {data.activeProjects.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedActiveProjects(!expandedActiveProjects)}
                  className="text-xs text-muted-foreground h-auto p-1 hover:text-foreground"
                >
                  {expandedActiveProjects 
                    ? "Show less" 
                    : `+${data.activeProjects.length - 3} more projects`
                  }
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Team Notifications */}
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">Team Notifications</h3>
          {data.notifications.unread_count === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              No new notifications.
            </p>
          ) : (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="default">
                  {data.notifications.unread_count} unread
                </Badge>
              </div>
              <div className="space-y-2">
                {(expandedNotifications ? data.notifications.recent : data.notifications.recent.slice(0, 2)).map((notification) => (
                  <div key={notification.id} className="text-sm">
                    <p className="font-medium">
                      {notification.actor.name || notification.actor.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {notification.type.replace('_', ' ')}
                    </p>
                  </div>
                ))}
                {data.notifications.recent.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedNotifications(!expandedNotifications)}
                    className="text-xs text-muted-foreground h-auto p-1 hover:text-foreground"
                  >
                    {expandedNotifications 
                      ? "Show less" 
                      : `+${data.notifications.recent.length - 2} more notifications`
                    }
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Team Memberships */}
        <div className="rounded-lg border p-6">
          <h3 className="font-semibold">My Teams</h3>
          {data.teamMemberships.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">
              You are not part of any teams yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {data.teamMemberships.map((membership) => (
                <div key={membership.team.id}>
                  <p className="text-sm font-medium">
                    {membership.team.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Course: {membership.team.course.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}