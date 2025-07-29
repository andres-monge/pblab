import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { logAiUsage } from "@/lib/actions/ai";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/db.types";

// Force Node.js runtime to support Google GenAI package
export const runtime = 'nodejs';

type AssessmentScore = {
  criterion_id: string;
  score: number;
  justification: string;
};

type AssessmentResponse = {
  scores: AssessmentScore[];
  overall_feedback: string;
};

/**
 * POST /api/ai/assess
 * 
 * Generates AI-powered rubric assessment for a project's final report.
 * Uses the project's rubric criteria to evaluate the report content.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { projectId, educatorFeedback } = body;

    // Validate required parameters
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: "projectId is required and must be a valid string" },
        { status: 400 }
      );
    }

    // Verify API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 500 }
      );
    }

    // Get model from environment variable with fallback
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    // Create authenticated Supabase client
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify user is an educator or admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || (userData.role !== 'educator' && userData.role !== 'admin')) {
      return NextResponse.json(
        { error: "Only educators can assess projects" },
        { status: 403 }
      );
    }

    // Fetch project with rubric and report content
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        phase,
        final_report_url,
        final_report_content,
        problem:problems!inner (
          id,
          title,
          description,
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
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Verify project is in post phase
    if (project.phase !== 'post') {
      return NextResponse.json(
        { error: "Project must be in post-discussion phase for assessment" },
        { status: 400 }
      );
    }

    // Verify report content exists
    if (!project.final_report_content) {
      return NextResponse.json(
        { error: "No report content available for assessment. Please ensure the report has been properly submitted." },
        { status: 400 }
      );
    }

    // Get rubric criteria
    const rubrics = project.problem.rubrics;
    if (!rubrics || !Array.isArray(rubrics) || rubrics.length === 0) {
      return NextResponse.json(
        { error: "No rubric found for this problem" },
        { status: 400 }
      );
    }

    const rubric = rubrics[0];
    if (!rubric.rubric_criteria || rubric.rubric_criteria.length === 0) {
      return NextResponse.json(
        { error: "No rubric criteria found for this problem" },
        { status: 400 }
      );
    }

    // Sort criteria by sort_order
    const criteria = rubric.rubric_criteria.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);

    // Construct assessment prompt
    const prompt = `You are an expert educator evaluating a student team's Problem-Based Learning (PBL) project report. 

Problem Title: "${project.problem.title}"

Problem Description:
${project.problem.description || 'No description provided.'}

Student Report Content:
${project.final_report_content}

You must evaluate this report against the following rubric criteria. For each criterion, provide:
1. A score (whole number from 0 to the max score)
2. A detailed justification explaining why you gave that score

Rubric Criteria:
${criteria.map((c: { id: string; criterion_text: string; max_score: number }, index: number) => `
${index + 1}. ${c.criterion_text} (Max Score: ${c.max_score})
   - ID: ${c.id}
`).join('')}

${educatorFeedback ? `
Educator's Additional Guidance:
${educatorFeedback}
Please consider this feedback when generating or refining your assessment.
` : ''}

Provide your assessment in the following JSON format:
{
  "scores": [
    {
      "criterion_id": "criterion_id_here",
      "score": <number>,
      "justification": "Detailed explanation of the score..."
    }
  ],
  "overall_feedback": "Overall feedback about the project, highlighting strengths and areas for improvement..."
}

Important:
- Be fair but rigorous in your assessment
- Provide specific examples from the report to support your scores
- Consider the PBL nature of the project (collaboration, research, problem-solving)
- Scores should reflect the quality of work relative to the criterion description
- Your justifications should be educational and constructive`;

    // Initialize Gemini AI client
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Make API call to Gemini
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.3,           // Lower temperature for more consistent grading
        maxOutputTokens: 40000,      // Generous limit for detailed feedback
        candidateCount: 1,
        responseMimeType: 'application/json',
      }
    });

    // Extract the generated text
    const generatedText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      const finishReason = response.candidates?.[0]?.finishReason;
      console.error('❌ No text found. Finish reason:', finishReason);
      throw new Error(`Gemini replied with finishReason=${finishReason || 'unknown'}`);
    }

    // Parse the assessment response
    let assessment: AssessmentResponse;
    try {
      assessment = JSON.parse(generatedText);
      
      // Validate the response structure
      if (!assessment.scores || !Array.isArray(assessment.scores) || !assessment.overall_feedback) {
        throw new Error('Invalid assessment format');
      }

      // Validate each score
      for (const score of assessment.scores) {
        const criterion = criteria.find((c: { id: string; max_score: number }) => c.id === score.criterion_id);
        if (!criterion) {
          throw new Error(`Invalid criterion_id: ${score.criterion_id}`);
        }
        
        // Ensure score is within valid range
        score.score = Math.max(0, Math.min(score.score, criterion.max_score));
        
        // Ensure score is a whole number
        score.score = Math.round(score.score);
      }

      // Ensure all criteria have scores
      const scoredCriteriaIds = new Set(assessment.scores.map(s => s.criterion_id));
      for (const criterion of criteria) {
        if (!scoredCriteriaIds.has(criterion.id)) {
          assessment.scores.push({
            criterion_id: criterion.id,
            score: 0,
            justification: "No assessment provided for this criterion."
          });
        }
      }

    } catch (parseError) {
      console.error('Failed to parse AI assessment:', parseError);
      return NextResponse.json(
        { error: "Failed to generate valid assessment. Please try again." },
        { status: 500 }
      );
    }

    // Save assessment to database
    const { data: savedAssessment, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        project_id: projectId,
        assessor_id: user.id,
        status: 'pending_review' as Database["public"]["Enums"]["assessment_status"],
        overall_feedback: assessment.overall_feedback
      })
      .select('id')
      .single();

    if (assessmentError || !savedAssessment) {
      console.error('Failed to save assessment:', assessmentError);
      return NextResponse.json(
        { error: "Failed to save assessment to database" },
        { status: 500 }
      );
    }

    // Save assessment scores
    const scoresToInsert = assessment.scores.map(score => ({
      assessment_id: savedAssessment.id,
      criterion_id: score.criterion_id,
      score: score.score,
      justification: score.justification,
      ai_generated: true
    }));

    const { error: scoresError } = await supabase
      .from('assessment_scores')
      .insert(scoresToInsert);

    if (scoresError) {
      console.error('Failed to save assessment scores:', scoresError);
      // Clean up the assessment record
      await supabase.from('assessments').delete().eq('id', savedAssessment.id);
      
      return NextResponse.json(
        { error: "Failed to save assessment scores" },
        { status: 500 }
      );
    }

    // Log AI usage for analytics
    try {
      await logAiUsage({
        userId: user.id,
        projectId: projectId,
        feature: 'assess',
        prompt: { 
          problem_title: project.problem.title,
          criteria_count: criteria.length,
          report_length: project.final_report_content.length,
          has_educator_feedback: !!educatorFeedback,
          model_used: model 
        },
        response: { 
          assessment_id: savedAssessment.id,
          scores_count: assessment.scores.length,
          overall_feedback_length: assessment.overall_feedback.length 
        }
      });
    } catch (logError) {
      // Log the error but don't fail the request
      console.error('Failed to log AI usage:', logError);
    }

    // Return successful response with assessment data
    return NextResponse.json({
      success: true,
      assessmentId: savedAssessment.id,
      assessment: {
        scores: assessment.scores,
        overall_feedback: assessment.overall_feedback
      }
    });

  } catch (error: unknown) {
    console.error('AI assess error:', error);

    // Handle specific error types
    const errorObj = error as { status?: number; message?: string };
    if (errorObj?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    if (errorObj?.message?.includes('API key')) {
      return NextResponse.json(
        { error: "AI service configuration error" },
        { status: 500 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: "Failed to generate assessment. Please try again." },
      { status: 500 }
    );
  }
}