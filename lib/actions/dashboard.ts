"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db.types";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import {
  QueryResult,
  createSuccessResponse,
  createErrorResponse
} from "@/lib/shared/action-types";

type ProjectPhase = Database["public"]["Enums"]["project_phase"];

/**
 * Student dashboard data structure
 */
export interface StudentDashboardData {
  activeProjects: Array<{
    id: string;
    phase: ProjectPhase;
    problem: {
      id: string;
      title: string;
    };
    team: {
      id: string;
      name: string;
    };
    updated_at: string;
  }>;
  notifications: {
    unread_count: number;
    recent: Array<{
      id: string;
      type: string;
      actor: {
        name: string | null;
        email: string;
      };
      created_at: string;
    }>;
  };
  teamMemberships: Array<{
    team: {
      id: string;
      name: string;
      course: {
        name: string;
      };
    };
  }>;
}

/**
 * Educator dashboard data structure
 */
export interface EducatorDashboardData {
  myCourses: Array<{
    id: string;
    name: string;
    team_count: number;
    problem_count: number;
  }>;
  activeProjects: Array<{
    id: string;
    phase: ProjectPhase;
    problem: {
      title: string;
    };
    team: {
      name: string;
    };
    updated_at: string;
  }>;
  pendingAssessments: Array<{
    id: string;
    problem: {
      title: string;
    };
    team: {
      name: string;
    };
    final_report_url: string | null;
  }>;
}

/**
 * Admin dashboard data structure
 */
export interface AdminDashboardData {
  systemOverview: {
    total_users: number;
    total_courses: number;
    total_teams: number;
    total_projects: number;
    active_projects: number;
  };
  recentActivity: Array<{
    type: 'user_created' | 'project_created' | 'project_completed';
    description: string;
    timestamp: string;
  }>;
  userBreakdown: {
    students: number;
    educators: number;
    admins: number;
  };
}

/**
 * Get dashboard data for a student user
 * 
 * Fetches student's projects, notifications, and team memberships
 * 
 * @returns Promise resolving to QueryResult with student dashboard data
 */
export async function getStudentDashboardData(): Promise<QueryResult<StudentDashboardData>> {
  try {
    // Verify user authentication and role
    const user = await getAuthenticatedUser();
    if (user.role !== 'student') {
      throw new Error('Student access required');
    }
    
    const supabase = await createClient();

    // Fetch student's active projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        phase,
        updated_at,
        problem:problems(
          id,
          title
        ),
        team:teams(
          id,
          name
        )
      `)
      .in('team_id', 
        supabase
          .from('teams_users')
          .select('team_id')
          .eq('user_id', user.id)
      )
      .neq('phase', 'closed')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (projectsError) {
      console.error('Failed to fetch student projects:', projectsError);
      throw new Error(`Failed to fetch projects: ${projectsError.message}`);
    }

    // Fetch unread notifications count and recent notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        is_read,
        created_at,
        actor:users!notifications_actor_id_fkey(
          name,
          email
        )
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (notificationsError) {
      console.error('Failed to fetch notifications:', notificationsError);
      throw new Error(`Failed to fetch notifications: ${notificationsError.message}`);
    }

    // Fetch team memberships
    const { data: teamMemberships, error: teamsError } = await supabase
      .from('teams_users')
      .select(`
        team:teams(
          id,
          name,
          course:courses(
            name
          )
        )
      `)
      .eq('user_id', user.id);

    if (teamsError) {
      console.error('Failed to fetch team memberships:', teamsError);
      throw new Error(`Failed to fetch team memberships: ${teamsError.message}`);
    }

    // Calculate unread count
    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    const dashboardData: StudentDashboardData = {
      activeProjects: projects?.map(p => ({
        id: p.id,
        phase: p.phase,
        problem: {
          id: p.problem.id,
          title: p.problem.title,
        },
        team: {
          id: p.team.id,
          name: p.team.name,
        },
        updated_at: p.updated_at,
      })) || [],
      notifications: {
        unread_count: unreadCount,
        recent: notifications?.map(n => ({
          id: n.id,
          type: n.type,
          actor: {
            name: n.actor.name,
            email: n.actor.email,
          },
          created_at: n.created_at,
        })) || [],
      },
      teamMemberships: teamMemberships?.map(tm => ({
        team: {
          id: tm.team.id,
          name: tm.team.name,
          course: {
            name: tm.team.course.name,
          },
        },
      })) || [],
    };

    return createSuccessResponse(dashboardData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error fetching student dashboard data: ${errorMessage}`);
  }
}

/**
 * Get dashboard data for an educator user
 * 
 * Fetches educator's courses, active projects, and pending assessments
 * 
 * @returns Promise resolving to QueryResult with educator dashboard data
 */
export async function getEducatorDashboardData(): Promise<QueryResult<EducatorDashboardData>> {
  try {
    // Verify user authentication and role
    const user = await getAuthenticatedUser();
    if (user.role !== 'educator') {
      throw new Error('Educator access required');
    }
    
    const supabase = await createClient();

    // Fetch educator's courses with counts
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        teams(count),
        problems(count)
      `)
      .eq('admin_id', user.id);

    if (coursesError) {
      console.error('Failed to fetch educator courses:', coursesError);
      throw new Error(`Failed to fetch courses: ${coursesError.message}`);
    }

    // Get all team IDs from educator's courses
    const courseIds = courses?.map(c => c.id) || [];
    
    // Fetch active projects for educator's courses
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        phase,
        updated_at,
        problem:problems!inner(
          title,
          course_id
        ),
        team:teams(
          name
        )
      `)
      .in('problem.course_id', courseIds)
      .neq('phase', 'closed')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (projectsError) {
      console.error('Failed to fetch educator projects:', projectsError);
      throw new Error(`Failed to fetch projects: ${projectsError.message}`);
    }

    // Fetch projects pending assessment (in post phase with reports)
    const { data: pendingAssessments, error: assessmentsError } = await supabase
      .from('projects')
      .select(`
        id,
        final_report_url,
        problem:problems!inner(
          title,
          course_id
        ),
        team:teams(
          name
        )
      `)
      .in('problem.course_id', courseIds)
      .eq('phase', 'post')
      .not('final_report_url', 'is', null)
      .limit(10);

    if (assessmentsError) {
      console.error('Failed to fetch pending assessments:', assessmentsError);
      throw new Error(`Failed to fetch pending assessments: ${assessmentsError.message}`);
    }

    const dashboardData: EducatorDashboardData = {
      myCourses: courses?.map(c => ({
        id: c.id,
        name: c.name,
        team_count: c.teams?.[0]?.count || 0,
        problem_count: c.problems?.[0]?.count || 0,
      })) || [],
      activeProjects: projects?.map(p => ({
        id: p.id,
        phase: p.phase,
        problem: {
          title: p.problem.title,
        },
        team: {
          name: p.team.name,
        },
        updated_at: p.updated_at,
      })) || [],
      pendingAssessments: pendingAssessments?.map(p => ({
        id: p.id,
        problem: {
          title: p.problem.title,
        },
        team: {
          name: p.team.name,
        },
        final_report_url: p.final_report_url,
      })) || [],
    };

    return createSuccessResponse(dashboardData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error fetching educator dashboard data: ${errorMessage}`);
  }
}

/**
 * Get dashboard data for an admin user
 * 
 * Fetches system overview statistics and recent activity
 * 
 * @returns Promise resolving to QueryResult with admin dashboard data
 */
export async function getAdminDashboardData(): Promise<QueryResult<AdminDashboardData>> {
  try {
    // Verify user authentication and role
    const user = await getAuthenticatedUser();
    if (user.role !== 'admin') {
      throw new Error('Admin access required');
    }
    
    const supabase = await createClient();

    // Fetch system overview counts
    const [
      { count: totalUsers },
      { count: totalCourses },
      { count: totalTeams },
      { count: totalProjects },
      { count: activeProjects },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('teams').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }).neq('phase', 'closed'),
    ]);

    // Fetch user role breakdown
    const { data: userRoles, error: rolesError } = await supabase
      .from('users')
      .select('role')
      .order('role');

    if (rolesError) {
      console.error('Failed to fetch user roles:', rolesError);
      throw new Error(`Failed to fetch user roles: ${rolesError.message}`);
    }

    // Count users by role
    const roleBreakdown = userRoles?.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Fetch recent activity (simplified for MVP)
    const { data: recentProjects, error: recentError } = await supabase
      .from('projects')
      .select(`
        id,
        phase,
        created_at,
        updated_at,
        problem:problems(title),
        team:teams(name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('Failed to fetch recent activity:', recentError);
      throw new Error(`Failed to fetch recent activity: ${recentError.message}`);
    }

    // Transform recent projects into activity items
    const recentActivity = recentProjects?.map(p => ({
      type: 'project_created' as const,
      description: `Project "${p.problem.title}" started by team "${p.team.name}"`,
      timestamp: p.created_at,
    })) || [];

    const dashboardData: AdminDashboardData = {
      systemOverview: {
        total_users: totalUsers || 0,
        total_courses: totalCourses || 0,
        total_teams: totalTeams || 0,
        total_projects: totalProjects || 0,
        active_projects: activeProjects || 0,
      },
      recentActivity,
      userBreakdown: {
        students: roleBreakdown.student || 0,
        educators: roleBreakdown.educator || 0,
        admins: roleBreakdown.admin || 0,
      },
    };

    return createSuccessResponse(dashboardData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(`Error fetching admin dashboard data: ${errorMessage}`);
  }
}