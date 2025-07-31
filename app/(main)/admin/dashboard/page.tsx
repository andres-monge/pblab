"use client";

import { useState, useEffect } from "react";
import { getAdminDashboardData, type AdminDashboardData } from "@/lib/actions/dashboard";
import { 
  getAllUsers, 
  getAllTeams, 
  getAllCourses,
  getAllProjects,
  deleteUser,
  deleteTeam,
  deleteCourse,
  deleteProject,
  updateCourse,
  type UserWithDetails,
  type TeamWithDetails,
  type CourseWithDetails,
  type ProjectWithDetails
} from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DataTable, 
  InviteUserModal, 
  EditUserModal, 
  CreateTeamModal, 
  EditTeamModal,
  CreateCourseModal, 
  DeleteConfirmationModal,
  type TableColumn,
  type TableAction
} from "@/components/pblab/admin";

export default function AdminDashboard() {
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  // CRUD data state
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [teams, setTeams] = useState<TeamWithDetails[]>([]);
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [editUser, setEditUser] = useState<UserWithDetails | null>(null);
  const [editTeam, setEditTeam] = useState<TeamWithDetails | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'user' | 'team' | 'course' | 'project';
    item: UserWithDetails | TeamWithDetails | CourseWithDetails | ProjectWithDetails;
  } | null>(null);

  // Course editing state
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [editCourseName, setEditCourseName] = useState("");

  // Load initial data
  useEffect(() => {
    loadDashboardData();
    loadAllData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const result = await getAdminDashboardData();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadAllData = async () => {
    setError(null);
    
    try {
      const [usersResult, teamsResult, coursesResult, projectsResult] = await Promise.all([
        getAllUsers(),
        getAllTeams(),
        getAllCourses(),
        getAllProjects(),
      ]);

      if (usersResult.success) {
        setUsers(usersResult.data);
      } else {
        setError(`Failed to load users: ${usersResult.error}`);
        return;
      }

      if (teamsResult.success) {
        setTeams(teamsResult.data);
      } else {
        setError(`Failed to load teams: ${teamsResult.error}`);
        return;
      }

      if (coursesResult.success) {
        setCourses(coursesResult.data);
      } else {
        setError(`Failed to load courses: ${coursesResult.error}`);
        return;
      }

      if (projectsResult.success) {
        setProjects(projectsResult.data);
      } else {
        setError(`Failed to load projects: ${projectsResult.error}`);
        return;
      }
    } catch {
      setError("Failed to load data");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmation || deleteConfirmation.type !== 'user') return;
    
    const result = await deleteUser({ userId: deleteConfirmation.item.id });
    if (result.success) {
      loadAllData();
      loadDashboardData();
    } else {
      setError(result.error);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteConfirmation || deleteConfirmation.type !== 'team') return;
    
    const result = await deleteTeam({ teamId: deleteConfirmation.item.id });
    if (result.success) {
      loadAllData();
      loadDashboardData();
    } else {
      setError(result.error);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteConfirmation || deleteConfirmation.type !== 'course') return;
    
    const result = await deleteCourse({ courseId: deleteConfirmation.item.id });
    if (result.success) {
      loadAllData();
      loadDashboardData();
    } else {
      setError(result.error);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteConfirmation || deleteConfirmation.type !== 'project') return;
    
    const result = await deleteProject({ projectId: deleteConfirmation.item.id });
    if (result.success) {
      loadAllData();
      loadDashboardData();
    } else {
      setError(result.error);
    }
  };

  const handleEditCourse = async (courseId: string) => {
    if (!editCourseName.trim()) return;
    
    const result = await updateCourse({ courseId, name: editCourseName });
    if (result.success) {
      setEditingCourse(null);
      setEditCourseName("");
      loadAllData();
    } else {
      setError(result.error);
    }
  };

  // Table column definitions
  const userColumns: TableColumn<UserWithDetails>[] = [
    { key: "name", header: "Name", cell: (user) => user.name || "No name" },
    { key: "email", header: "Email" },
    { 
      key: "role", 
      header: "Role",
      cell: (user) => (
        <Badge variant={user.role === 'admin' ? 'default' : user.role === 'educator' ? 'secondary' : 'outline'}>
          {user.role}
        </Badge>
      )
    },
    { 
      key: "created_at", 
      header: "Created",
      cell: (user) => new Date(user.created_at).toLocaleDateString()
    },
  ];

  const userActions: TableAction<UserWithDetails>[] = [
    {
      label: "Edit",
      onClick: (user) => setEditUser(user),
      variant: "outline",
    },
    {
      label: "Delete",
      onClick: (user) => setDeleteConfirmation({ type: 'user', item: user }),
      variant: "destructive",
    },
  ];

  const teamColumns: TableColumn<TeamWithDetails>[] = [
    { key: "name", header: "Team Name" },
    { key: "course.name", header: "Course" },
    { 
      key: "member_count", 
      header: "Members",
      cell: (team) => (
        <Badge variant="outline">
          {team.member_count} members
        </Badge>
      )
    },
    { 
      key: "created_at", 
      header: "Created",
      cell: (team) => new Date(team.created_at).toLocaleDateString()
    },
  ];

  const teamActions: TableAction<TeamWithDetails>[] = [
    {
      label: "Edit",
      onClick: (team) => setEditTeam(team),
      variant: "outline",
    },
    {
      label: "Delete",
      onClick: (team) => setDeleteConfirmation({ type: 'team', item: team }),
      variant: "destructive",
    },
  ];

  const courseColumns: TableColumn<CourseWithDetails>[] = [
    { 
      key: "name", 
      header: "Course Name",
      cell: (course) => (
        editingCourse === course.id ? (
          <div className="flex gap-2">
            <Input
              value={editCourseName}
              onChange={(e) => setEditCourseName(e.target.value)}
              className="h-8"
            />
            <Button
              size="sm"
              onClick={() => handleEditCourse(course.id)}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingCourse(null);
                setEditCourseName("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          course.name
        )
      )
    },
    { 
      key: "team_count", 
      header: "Teams",
      cell: (course) => (
        <Badge variant="outline">
          {course.team_count} teams
        </Badge>
      )
    },
    { 
      key: "problem_count", 
      header: "Problems",
      cell: (course) => (
        <Badge variant="outline">
          {course.problem_count} problems
        </Badge>
      )
    },
    { 
      key: "created_at", 
      header: "Created",
      cell: (course) => new Date(course.created_at).toLocaleDateString()
    },
  ];

  const courseActions: TableAction<CourseWithDetails>[] = [
    {
      label: "Edit",
      onClick: (course) => {
        setEditingCourse(course.id);
        setEditCourseName(course.name);
      },
      variant: "outline",
    },
    {
      label: "Delete",
      onClick: (course) => setDeleteConfirmation({ type: 'course', item: course }),
      variant: "destructive",
    },
  ];

  const projectColumns: TableColumn<ProjectWithDetails>[] = [
    { 
      key: "team.name", 
      header: "Team",
      cell: (project) => project.team.name
    },
    { 
      key: "problem.title", 
      header: "Problem",
      cell: (project) => project.problem.title
    },
    { 
      key: "team.course.name", 
      header: "Course",
      cell: (project) => project.team.course.name
    },
    { 
      key: "phase", 
      header: "Phase",
      cell: (project) => (
        <Badge 
          variant={
            project.phase === 'closed' ? 'secondary' : 
            project.phase === 'post' ? 'default' : 
            'outline'
          }
        >
          {project.phase}
        </Badge>
      )
    },
    { 
      key: "created_at", 
      header: "Created",
      cell: (project) => new Date(project.created_at).toLocaleDateString()
    },
  ];

  const projectActions: TableAction<ProjectWithDetails>[] = [
    {
      label: "Delete",
      onClick: (project) => setDeleteConfirmation({ type: 'project', item: project }),
      variant: "destructive",
    },
  ];

  if (dashboardLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, teams, and courses from your administrative control panel.
          </p>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, teams, and courses from your administrative control panel.
        </p>
      </div>

      {/* System Overview */}
      {dashboardData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-lg">{dashboardData.systemOverview.total_users}</h3>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-lg">{dashboardData.systemOverview.total_courses}</h3>
            <p className="text-sm text-muted-foreground">Total Courses</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-lg">{dashboardData.systemOverview.total_teams}</h3>
            <p className="text-sm text-muted-foreground">Total Teams</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-lg">{dashboardData.systemOverview.active_projects}</h3>
            <p className="text-sm text-muted-foreground">Active Projects</p>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
          {error}
        </div>
      )}

      {/* Management Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">User Management</h2>
            <InviteUserModal onSuccess={loadAllData} />
          </div>
          <DataTable
            data={users}
            columns={userColumns}
            actions={userActions}
            emptyMessage="No users found"
          />
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Team Management</h2>
            <CreateTeamModal onSuccess={loadAllData} />
          </div>
          <DataTable
            data={teams}
            columns={teamColumns}
            actions={teamActions}
            emptyMessage="No teams found"
          />
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Course Management</h2>
            <CreateCourseModal onSuccess={loadAllData} />
          </div>
          <DataTable
            data={courses}
            columns={courseColumns}
            actions={courseActions}
            emptyMessage="No courses found"
          />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Project Management</h2>
          </div>
          <DataTable
            data={projects}
            columns={projectColumns}
            actions={projectActions}
            emptyMessage="No projects found"
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <EditUserModal
        user={editUser}
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        onSuccess={loadAllData}
      />

      <EditTeamModal
        team={editTeam}
        open={!!editTeam}
        onOpenChange={(open) => !open && setEditTeam(null)}
        onSuccess={loadAllData}
      />

      <DeleteConfirmationModal
        open={!!deleteConfirmation}
        onOpenChange={(open) => !open && setDeleteConfirmation(null)}
        title={`Delete ${deleteConfirmation?.type || 'Item'}`}
        description={`Are you sure you want to delete this ${deleteConfirmation?.type}?`}
        itemName={
          deleteConfirmation?.type === 'user'
            ? (deleteConfirmation.item as UserWithDetails).email
            : deleteConfirmation?.type === 'project'
            ? `${(deleteConfirmation.item as ProjectWithDetails).team.name} - ${(deleteConfirmation.item as ProjectWithDetails).problem.title}`
            : (
                (deleteConfirmation?.item as TeamWithDetails | CourseWithDetails)
                  ?.name ?? 'Unknown'
              )
        }
        onConfirm={
          deleteConfirmation?.type === 'user' 
            ? handleDeleteUser
            : deleteConfirmation?.type === 'team'
            ? handleDeleteTeam
            : deleteConfirmation?.type === 'course'
            ? handleDeleteCourse
            : handleDeleteProject
        }
      />
    </div>
  );
}