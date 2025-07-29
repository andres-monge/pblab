import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { LearningGoalEditor } from "@/components/pblab/project/learning-goal-editor";
import { AiTutorChat } from "@/components/pblab/ai/ai-tutor-chat";
import { ProjectArtifacts } from "@/components/pblab/project/project-artifacts";
import { RubricEditor } from "@/components/pblab/educator/rubric-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, BookOpen, FileText, CheckCircle } from "lucide-react";
import Link from "next/link";

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

const phaseDescriptions = {
  pre: "Define your problem statement and learning goals",
  research: "Conduct research and collaborate with your team",
  post: "Submit your final report and await assessment",
  closed: "Project completed and assessed"
};

const phaseBadgeVariants = {
  pre: "secondary",
  research: "default",
  post: "outline",
  closed: "secondary"
} as const;

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/auth/login");
  }

  // Get user details with role
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    console.error("Failed to fetch user data:", userError);
    redirect("/dashboard");
  }

  // Fetch project details with related data
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(`
      id,
      phase,
      learning_goals,
      final_report_url,
      final_report_content,
      created_at,
      updated_at,
      problem:problems!inner (
        id,
        title,
        description,
        course_id,
        rubrics (
          id,
          name,
          rubric_criteria (
            id,
            criterion_text,
            max_score,
            sort_order
          )
        )
      ),
      team:teams!inner (
        id,
        name,
        course_id
      ),
      assessments (
        id,
        status,
        overall_feedback,
        assessor_id,
        created_at,
        updated_at,
        assessment_scores (
          id,
          criterion_id,
          score,
          justification,
          ai_generated
        )
      )
    `)
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    console.error("Project fetch error:", projectError);
    notFound();
  }

  // Check if user has access to this project
  const isEducator = userData.role === "educator" || userData.role === "admin";
  
  if (!isEducator) {
    // For students, verify they're part of the team
    const { data: teamMembership } = await supabase
      .from("teams_users")
      .select("id")
      .eq("team_id", project.team.id)
      .eq("user_id", userData.id)
      .single();

    if (!teamMembership) {
      redirect("/dashboard");
    }
  }

  const showRubricEditor = isEducator && project.phase === "post";
  const latestAssessment = project.assessments?.[0];

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Project Header */}
          <div className="space-y-4">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>

            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold">{project.problem.title}</h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{project.team.name}</span>
                  </div>
                  <Badge variant={phaseBadgeVariants[project.phase]}>
                    {project.phase.charAt(0).toUpperCase() + project.phase.slice(1)} Phase
                  </Badge>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Problem Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {project.problem.description || "No description provided."}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Phase-specific Content */}
          <div className="space-y-6">
            {/* Pre-discussion Phase: Learning Goals */}
            {project.phase === "pre" && (
              <Card>
                <CardHeader>
                  <CardTitle>Pre-Discussion Phase</CardTitle>
                  <CardDescription>{phaseDescriptions.pre}</CardDescription>
                </CardHeader>
                <CardContent>
                  <LearningGoalEditor 
                    projectId={project.id}
                    initialGoals={project.learning_goals}
                  />
                </CardContent>
              </Card>
            )}

            {/* Research Phase: Artifacts */}
            {project.phase === "research" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Research Phase</CardTitle>
                    <CardDescription>{phaseDescriptions.research}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {project.learning_goals && (
                      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Team Learning Goals
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {project.learning_goals}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <ProjectArtifacts 
                  projectId={project.id} 
                  currentUserId={userData.id}
                  currentUserRole={userData.role}
                />
              </div>
            )}

            {/* Post-discussion Phase */}
            {project.phase === "post" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Post-Discussion Phase</CardTitle>
                    <CardDescription>{phaseDescriptions.post}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {project.final_report_url ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">Final Report Submitted</span>
                        </div>
                        <a
                          href={project.final_report_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {project.final_report_url}
                        </a>
                        {!isEducator && (
                          <p className="text-sm text-muted-foreground">
                            Your report has been submitted and is awaiting educator assessment.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No final report has been submitted yet.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Show existing artifacts in read-only mode */}
                <ProjectArtifacts 
                  projectId={project.id} 
                  currentUserId={userData.id}
                  currentUserRole={userData.role}
                />

                {/* Educator Rubric Assessment */}
                {showRubricEditor && project.problem.rubrics && Array.isArray(project.problem.rubrics) && project.problem.rubrics.length > 0 && (
                  <Card className="border-amber-200">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-600">
                          <div className="h-2 w-2 bg-amber-500 rounded-full" />
                          <span className="text-sm font-medium">AI Assessment System</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          This feature uses AI to assist with rubric-based assessment. 
                          If you experience any issues, please refresh the page or contact support.
                        </p>
                        <RubricEditor
                          projectId={project.id}
                          rubric={project.problem.rubrics[0]}
                          reportUrl={project.final_report_url}
                          reportContent={project.final_report_content}
                          existingAssessment={latestAssessment}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Closed Phase */}
            {project.phase === "closed" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Completed</CardTitle>
                    <CardDescription>{phaseDescriptions.closed}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {project.final_report_url && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">Final Report</span>
                        </div>
                        <a
                          href={project.final_report_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {project.final_report_url}
                        </a>
                      </div>
                    )}
                    
                    {latestAssessment && latestAssessment.status === "final" && (
                      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2">Assessment Complete</h4>
                        {latestAssessment.overall_feedback && (
                          <p className="text-sm text-muted-foreground">
                            {latestAssessment.overall_feedback}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Show final assessment for students */}
                {!isEducator && latestAssessment && latestAssessment.status === "final" && 
                 project.problem.rubrics && Array.isArray(project.problem.rubrics) && project.problem.rubrics.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Assessment Results</CardTitle>
                      <CardDescription>
                        Review your scores and feedback for each rubric criterion
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {project.problem.rubrics[0].rubric_criteria
                          .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
                          .map((criterion: { id: string; criterion_text: string; max_score: number }) => {
                            const score = latestAssessment.assessment_scores.find(
                              s => s.criterion_id === criterion.id
                            );
                            
                            return (
                              <div key={criterion.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-medium">{criterion.criterion_text}</h5>
                                  <Badge variant="secondary">
                                    {score?.score || 0} / {criterion.max_score}
                                  </Badge>
                                </div>
                                {score?.justification && (
                                  <p className="text-sm text-muted-foreground">
                                    {score.justification}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Show existing artifacts in read-only mode */}
                <ProjectArtifacts 
                  projectId={project.id} 
                  currentUserId={userData.id}
                  currentUserRole={userData.role}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Tutor Chat Sidebar - Available in all phases */}
      <AiTutorChat 
        projectId={project.id}
      />
    </div>
  );
}