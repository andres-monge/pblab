"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, User } from "lucide-react";
import { getProjectAssessmentResults, type ProjectAssessmentResults } from "@/lib/actions/assessments";

interface AssessmentResultsProps {
  projectId: string;
}

export function AssessmentResults({ projectId }: AssessmentResultsProps) {
  const [assessmentResults, setAssessmentResults] = useState<ProjectAssessmentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAssessmentResults() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await getProjectAssessmentResults(projectId);
        
        if (result.success) {
          setAssessmentResults(result.data);
        } else {
          setError(result.error || 'Failed to load assessment results');
        }
      } catch (err) {
        console.error('Error fetching assessment results:', err);
        setError('An unexpected error occurred while loading assessment results');
      } finally {
        setLoading(false);
      }
    }

    fetchAssessmentResults();
  }, [projectId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment Results</CardTitle>
          <CardDescription>Loading assessment results...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!assessmentResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>No assessment results available for this project.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { rubricResults, assessment } = assessmentResults;

  // Calculate total score and percentage
  const totalScore = rubricResults.reduce((sum, result) => sum + result.score, 0);
  const maxTotalScore = rubricResults.reduce((sum, result) => sum + result.criterion.max_score, 0);
  const percentage = maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Assessment Results
        </CardTitle>
        <CardDescription>
          This project has been assessed and completed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assessment Summary */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <p className="font-medium">Overall Score</p>
            <p className="text-2xl font-bold text-green-600">
              {totalScore} / {maxTotalScore}
            </p>
            <p className="text-sm text-muted-foreground">
              {percentage}% overall
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              Assessed by {assessment.assessor_name}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(assessment.created_at).toLocaleDateString()}
            </p>
            <Badge variant="outline" className="text-xs">
              {assessment.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Rubric Scores */}
        <div className="space-y-4">
          <h3 className="font-semibold">Detailed Rubric Scores</h3>
          {rubricResults.map((result, index) => (
            <div key={result.criterion.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  {index + 1}. {result.criterion.criterion_text}
                </h4>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={result.score >= result.criterion.max_score * 0.8 ? "default" : 
                            result.score >= result.criterion.max_score * 0.6 ? "secondary" : "outline"}
                  >
                    {result.score} / {result.criterion.max_score}
                  </Badge>
                </div>
              </div>
              
              {result.justification && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm text-muted-foreground mb-1 font-medium">Feedback:</p>
                  <p className="text-sm">{result.justification}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Overall Feedback */}
        {assessment.overall_feedback && (
          <div className="space-y-2">
            <h3 className="font-semibold">Overall Feedback</h3>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{assessment.overall_feedback}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}