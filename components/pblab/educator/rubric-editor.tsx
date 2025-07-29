"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, Save, AlertCircle, CheckCircle, FileText } from "lucide-react";
import { finalizeAssessment } from "@/lib/actions/projects";
import type { Database } from "@/lib/db.types";

type RubricCriterion = {
  id: string;
  criterion_text: string;
  max_score: number;
  sort_order: number;
};

type AssessmentScore = {
  id: string;
  criterion_id: string;
  score: number;
  justification: string | null;
  ai_generated: boolean;
};

type ExistingAssessment = {
  id: string;
  status: Database["public"]["Enums"]["assessment_status"];
  overall_feedback: string | null;
  assessment_scores: AssessmentScore[];
};

interface RubricEditorProps {
  projectId: string;
  rubric: {
    id: string;
    name: string;
    rubric_criteria: RubricCriterion[];
  };
  reportUrl: string | null;
  reportContent: string | null;
  existingAssessment?: ExistingAssessment;
}

interface ScoreData {
  criterionId: string;
  score: number;
  justification: string;
}

export function RubricEditor({ 
  projectId, 
  rubric, 
  reportUrl, 
  reportContent,
  existingAssessment 
}: RubricEditorProps) {
  const [scores, setScores] = useState<Record<string, ScoreData>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [educatorFeedback, setEducatorFeedback] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize scores from existing assessment if available
  useEffect(() => {
    if (existingAssessment && existingAssessment.assessment_scores.length > 0) {
      const initialScores: Record<string, ScoreData> = {};
      
      existingAssessment.assessment_scores.forEach(score => {
        initialScores[score.criterion_id] = {
          criterionId: score.criterion_id,
          score: score.score,
          justification: score.justification || ""
        };
      });
      
      setScores(initialScores);
      setOverallFeedback(existingAssessment.overall_feedback || "");
    } else {
      // Initialize with empty scores for each criterion
      const initialScores: Record<string, ScoreData> = {};
      rubric.rubric_criteria.forEach(criterion => {
        initialScores[criterion.id] = {
          criterionId: criterion.id,
          score: 0,
          justification: ""
        };
      });
      setScores(initialScores);
    }
  }, [existingAssessment, rubric.rubric_criteria]);

  const handleScoreChange = (criterionId: string, field: 'score' | 'justification', value: string | number) => {
    setScores(prev => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        [field]: field === 'score' ? Number(value) : value
      }
    }));
  };

  const handleGenerateAssessment = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/ai/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          projectId,
          educatorFeedback: educatorFeedback.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.assessment) {
        // Update scores with AI-generated assessment
        const newScores: Record<string, ScoreData> = {};
        
        data.assessment.scores.forEach((score: { criterion_id: string; score: number; justification: string }) => {
          newScores[score.criterion_id] = {
            criterionId: score.criterion_id,
            score: score.score,
            justification: score.justification
          };
        });
        
        setScores(newScores);
        setOverallFeedback(data.assessment.overall_feedback);
        setSuccessMessage("AI assessment generated successfully! Review and edit as needed.");
        
        // Clear educator feedback after successful generation
        setEducatorFeedback("");
      } else {
        throw new Error(data.error || "Failed to generate assessment");
      }
    } catch (error) {
      console.error('Error generating AI assessment:', error);
      setError(error instanceof Error ? error.message : "Failed to generate AI assessment");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalize = async () => {
    // Validate all scores have justifications
    const scoresToSubmit = Object.values(scores);
    const missingJustifications = scoresToSubmit.filter(s => !s.justification.trim());
    
    if (missingJustifications.length > 0) {
      setError("Please provide justifications for all scores");
      return;
    }

    if (!overallFeedback.trim()) {
      setError("Please provide overall feedback for the project");
      return;
    }

    setIsFinalizing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await finalizeAssessment({
        projectId,
        scores: scoresToSubmit.map(s => ({
          criterionId: s.criterionId,
          score: s.score,
          justification: s.justification
        })),
        overallFeedback: overallFeedback.trim()
      });

      if (result.success) {
        setSuccessMessage("Assessment finalized successfully! The project is now closed.");
        // Optionally, redirect after a delay
        setTimeout(() => {
          window.location.href = '/educator/dashboard';
        }, 2000);
      } else {
        setError(result.error || "Failed to finalize assessment");
      }
    } catch (error) {
      console.error('Error finalizing assessment:', error);
      setError("An unexpected error occurred while finalizing the assessment");
    } finally {
      setIsFinalizing(false);
    }
  };

  // Sort criteria by sort_order
  const sortedCriteria = [...rubric.rubric_criteria].sort((a, b) => a.sort_order - b.sort_order);

  // Calculate total score
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score.score, 0);
  const maxTotalScore = rubric.rubric_criteria.reduce((sum, criterion) => sum + criterion.max_score, 0);

  return (
    <div className="space-y-6">
      {/* Assessment Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Assisted Rubric Assessment
          </CardTitle>
          <CardDescription>
            Review the student report and assess it against the rubric criteria below.
            You can use AI to generate an initial assessment, then edit and finalize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportUrl ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Final Report URL:</span>
              </div>
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {reportUrl}
              </a>
              {!reportContent && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Report content not cached. Please ensure the report was properly submitted 
                    through the Google Drive integration for AI assessment to work.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No final report has been submitted yet. The student team must submit 
                their report before assessment can begin.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* AI Generation Controls */}
      {reportContent && (
        <Card>
          <CardHeader>
            <CardTitle>Generate AI Assessment</CardTitle>
            <CardDescription>
              Use AI to generate an initial assessment based on the rubric criteria.
              You can provide additional guidance to help the AI focus on specific aspects.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="educator-feedback" className="text-sm font-medium mb-2 block">
                Additional Guidance for AI (Optional)
              </label>
              <Textarea
                id="educator-feedback"
                placeholder="e.g., 'Focus on the depth of research and practical application of concepts. Pay special attention to teamwork and collaboration aspects.'"
                value={educatorFeedback}
                onChange={(e) => setEducatorFeedback(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateAssessment}
                disabled={isGenerating || !reportContent}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Assessment...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {existingAssessment ? 'Regenerate with AI' : 'Grade with AI'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rubric Criteria Scoring */}
      <Card>
        <CardHeader>
          <CardTitle>Rubric Criteria</CardTitle>
          <CardDescription>
            Score each criterion and provide detailed justification for your assessment.
            <span className="block mt-2 font-medium">
              Total Score: {totalScore} / {maxTotalScore}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sortedCriteria.map((criterion, index) => {
            const scoreData = scores[criterion.id] || { score: 0, justification: "" };
            
            return (
              <div key={criterion.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {index + 1}. {criterion.criterion_text}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Input
                      type="number"
                      min="0"
                      max={criterion.max_score}
                      value={scoreData.score}
                      onChange={(e) => handleScoreChange(criterion.id, 'score', e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">/ {criterion.max_score}</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Justification
                  </label>
                  <Textarea
                    placeholder="Explain why you gave this score, referencing specific aspects of the student's work..."
                    value={scoreData.justification}
                    onChange={(e) => handleScoreChange(criterion.id, 'justification', e.target.value)}
                    className="min-h-[100px] resize-y"
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Overall Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Feedback</CardTitle>
          <CardDescription>
            Provide comprehensive feedback about the project, highlighting strengths 
            and areas for improvement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Summarize the team's performance, key achievements, and suggestions for future improvement..."
            value={overallFeedback}
            onChange={(e) => setOverallFeedback(e.target.value)}
            className="min-h-[150px] resize-y"
          />
        </CardContent>
      </Card>

      {/* Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {existingAssessment?.status === 'pending_review' 
                ? "This assessment is currently in draft mode. Finalize to close the project."
                : "Once finalized, the assessment cannot be changed and the project will be closed."
              }
            </p>
            <Button
              onClick={handleFinalize}
              disabled={isFinalizing || Object.keys(scores).length === 0}
              size="lg"
              className="flex items-center gap-2"
            >
              {isFinalizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save & Finalize
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}