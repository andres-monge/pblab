import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/actions/shared/authorization";
import { LearningGoalEditor } from "@/components/pblab/project/learning-goal-editor";
import { ProjectArtifacts } from "@/components/pblab/project/project-artifacts";
import { AiTutorChat } from "@/components/pblab/ai/ai-tutor-chat";
import { FinalReportSubmission } from "@/components/pblab/project/final-report-submission";
import { RubricAssessment } from "@/components/pblab/educator/rubric-assessment";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/lib/db.types";

type ProjectPhase = Database["public"]["Enums"]["project_phase"];

interface ProjectData {
  id: string;
  phase: ProjectPhase;
  learning_goals: string | null;
  final_report_url: string | null;
  team_id: string;
  problem: {
    id: string;
    title: string;
    description: string | null;
  };
  team: {
    id: string;
    name: string;
    course: {
      id: string;
      name: string;
    };
  };
}

async function getProjectData(projectId: string, userId: string, userRole: string): Promise<ProjectData | null> {
  const supabase = await createClient();

  // Fetch project with authorization check via RLS
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id,
      phase,
      learning_goals,
      final_report_url,
      team_id,
      problem:problems!inner (
        id,
        title,
        description
      ),
      team:teams!inner (
        id,
        name,
        course:courses!inner (
          id,
          name
        )
      )
    `)
    .eq('id', projectId)
    .single();

  if (error || !project) {
    return null;
  }

  // Additional authorization check for educators
  if (userRole === 'educator') {
    // Educators can access projects in their courses
    // RLS should handle this, but we can add explicit check if needed
    const { data: educatorCourse } = await supabase
      .from('problems')
      .select('course_id')
      .eq('id', project.problem.id)
      .single();

    if (!educatorCourse) {
      return null;
    }
  } else if (userRole === 'student') {
    // Students can only access projects for teams they're members of
    const { data: teamMember } = await supabase
      .from('teams_users')
      .select('team_id')
      .eq('team_id', project.team_id)
      .eq('user_id', userId)
      .single();

    if (!teamMember) {
      return null;
    }
  }
  // Admins can access any project

  return project as ProjectData;
}

function getPhaseDescription(phase: ProjectPhase): string {
  switch (phase) {
    case 'pre':
      return 'Define your learning goals and prepare for the research phase.';
    case 'research':
      return 'Conduct research, gather artifacts, and collaborate with your team.';
    case 'post':
      return 'Synthesize your findings and prepare your final report.';
    case 'closed':
      return 'Project completed and assessed.';
    default:
      return 'Project in progress.';
  }
}

function getPhaseVariant(phase: ProjectPhase): "default" | "secondary" | "destructive" | "outline" {
  switch (phase) {
    case 'pre':
      return 'secondary';
    case 'research':
      return 'default';
    case 'post':
      return 'outline';
    case 'closed':
      return 'destructive';
    default:
      return 'outline';
  }
}

export default async function ProjectWorkspace({ 
  params 
}: { 
  params: Promise<{ projectId: string }> 
}) {
  // Get authenticated user
  const user = await getAuthenticatedUser();
  
  // Await params in Next.js 15
  const { projectId } = await params;
  
  // Fetch project data with authorization
  const project = await getProjectData(projectId, user.id, user.role);
  
  if (!project) {
    notFound();
  }

  // Calculate if project is locked (read-only)
  const isLocked = project.phase === 'closed';

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Project Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.problem.title}</h1>
            <p className="text-muted-foreground">
              Team: {project.team.name} • Course: {project.team.course.name}
            </p>
          </div>
          <Badge variant={getPhaseVariant(project.phase)} className="capitalize">
            {project.phase} Phase
          </Badge>
        </div>

        {/* Problem Description */}
        {project.problem.description && (
          <Card>
            <CardHeader>
              <CardTitle>Problem Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {project.problem.description}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Phase-specific Content */}
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">{project.phase} Phase</CardTitle>
            <CardDescription>
              {getPhaseDescription(project.phase)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {project.phase === 'pre' ? (
              // Learning Goal Editor (only in pre phase)
              <LearningGoalEditor 
                projectId={project.id}
                initialGoals={project.learning_goals}
                currentUserRole={user.role}
                projectPhase={project.phase}
                isLocked={isLocked}
              />
            ) : (
              // Other phase content
              <div className="space-y-6">
                {project.phase === 'research' && (
                  <div className="space-y-6">
                    {/* Research phase - show artifacts interface */}
                    <ProjectArtifacts
                      projectId={project.id}
                      currentUserId={user.id}
                      currentUserRole={user.role}
                      isLocked={isLocked}
                    />
                    
                    {/* Final Report Submission - Only for Students */}
                    {user.role === 'student' && (
                      <FinalReportSubmission
                        projectId={project.id}
                        currentReportUrl={project.final_report_url}
                        isLocked={isLocked}
                      />
                    )}
                  </div>
                )}
                
                {project.phase === 'post' && (
                  <div className="space-y-6">
                    {/* Show submitted final report for all users */}
                    {project.final_report_url && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Final Report</CardTitle>
                          <CardDescription>
                            {user.role === 'student' 
                              ? 'Your team has submitted the final report. It is now ready for educator review.'
                              : 'The team has submitted their final report for assessment.'
                            }
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                            <span className="flex-1 text-sm break-all">{project.final_report_url}</span>
                            <a
                              href={project.final_report_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              View Report →
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Rubric Assessment for Educators */}
                    {(user.role === 'educator' || user.role === 'admin') && (
                      <RubricAssessment projectId={project.id} />
                    )}
                    
                    {/* Show artifacts in read-only mode for post phase */}
                    <ProjectArtifacts
                      projectId={project.id}
                      currentUserId={user.id}
                      currentUserRole={user.role}
                      isLocked={isLocked}
                    />
                  </div>
                )}
                
                {project.phase === 'closed' && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      This project has been completed and assessed.
                    </p>
                    
                    {/* Show artifacts in read-only mode for closed phase */}
                    <ProjectArtifacts
                      projectId={project.id}
                      currentUserId={user.id}
                      currentUserRole={user.role}
                      isLocked={isLocked}
                    />
                  </div>
                )}
                
                {/* Show learning goals if they exist (read-only in non-pre phases) */}
                {project.learning_goals && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Learning Goals</h4>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm whitespace-pre-wrap">{project.learning_goals}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Tutor Chat Sidebar */}
      <div className="flex-shrink-0">
        <AiTutorChat 
          projectId={project.id}
          className="sticky top-6"
        />
      </div>
    </div>
  );
}