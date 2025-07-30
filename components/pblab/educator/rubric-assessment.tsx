"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ClipboardCheck, AlertCircle, Lock } from "lucide-react";
import { 
  getProjectAssessmentData, 
  saveAssessment,
  type ProjectAssessmentData 
} from "@/lib/actions/assessments";
import { updateProjectPhase } from "@/lib/actions/projects";

interface RubricAssessmentProps {
  projectId: string;
}

interface FormData {
  scores: Record<string, { score: number; justification: string }>;
  overallFeedback: string;
}

export function RubricAssessment({ projectId }: RubricAssessmentProps) {
  const router = useRouter();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assessmentData, setAssessmentData] = useState<ProjectAssessmentData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    scores: {},
    overallFeedback: ""
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch assessment data on mount
  useEffect(() => {
    fetchAssessmentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchAssessmentData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getProjectAssessmentData(projectId);
      
      if (!result.success) {
        setError(result.error);
        return;
      }
      
      setAssessmentData(result.data);
      
      // Initialize form data with empty scores for each criterion
      if (result.data.rubricCriteria.length > 0 && !result.data.existingAssessment) {
        const initialScores: Record<string, { score: number; justification: string }> = {};
        result.data.rubricCriteria.forEach(criterion => {
          initialScores[criterion.id] = {
            score: Math.ceil(criterion.max_score / 2), // Default to middle value
            justification: ""
          };
        });
        setFormData(prev => ({ ...prev, scores: initialScores }));
      }
    } catch (err) {
      console.error("Error fetching assessment data:", err);
      setError("Failed to load assessment data");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (criterionId: string, field: 'score' | 'justification', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [criterionId]: {
          ...prev.scores[criterionId],
          [field]: field === 'score' ? Number(value) : value
        }
      }
    }));
    
    // Clear validation error when user makes changes
    if (validationErrors[criterionId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[criterionId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!assessmentData) return false;
    
    // Validate each criterion
    assessmentData.rubricCriteria.forEach(criterion => {
      const scoreData = formData.scores[criterion.id];
      
      if (!scoreData) {
        errors[criterion.id] = "Score is required";
        return;
      }
      
      if (scoreData.score < 1 || scoreData.score > criterion.max_score) {
        errors[criterion.id] = `Score must be between 1 and ${criterion.max_score}`;
      } else if (!scoreData.justification.trim()) {
        errors[criterion.id] = "Justification is required";
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError("Please fix the validation errors before submitting");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Prepare scores array for the action
      const scores = Object.entries(formData.scores).map(([criterionId, data]) => ({
        criterion_id: criterionId,
        score: data.score,
        justification: data.justification.trim()
      }));
      
      // Save assessment
      const assessmentResult = await saveAssessment({
        projectId,
        scores,
        overall_feedback: formData.overallFeedback.trim() || undefined
      });
      
      if (!assessmentResult.success) {
        setError(assessmentResult.error);
        setShowConfirmDialog(false);
        return;
      }
      
      // Lock the project
      const lockResult = await updateProjectPhase({
        projectId,
        newPhase: 'closed'
      });
      
      if (!lockResult.success) {
        setError(`Assessment saved but failed to lock project: ${lockResult.error}`);
        setShowConfirmDialog(false);
        return;
      }
      
      // Success! Redirect to educator dashboard
      router.push('/educator/dashboard');
      
    } catch (err) {
      console.error("Error submitting assessment:", err);
      setError("An unexpected error occurred while submitting");
      setShowConfirmDialog(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (!assessmentData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || "Failed to load assessment data"}
        </AlertDescription>
      </Alert>
    );
  }

  // Cannot assess state
  if (!assessmentData.canAssess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Project Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assessmentData.existingAssessment ? (
            // Show existing assessment in read-only mode
            <div className="space-y-6">
              <Alert>
                <AlertDescription>
                  You have already assessed this project. Your assessment is shown below.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <h3 className="font-semibold">Rubric Scores</h3>
                {assessmentData.rubricCriteria.map((criterion, index) => {
                  const score = assessmentData.existingAssessment?.scores.find(
                    s => s.criterion_id === criterion.id
                  );
                  return (
                    <div key={criterion.id} className="space-y-2 p-4 bg-muted rounded-lg">
                      <div className="font-medium">
                        {index + 1}. {criterion.criterion_text}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          Score: {score?.score}/{criterion.max_score}
                        </span>
                      </div>
                      {score?.justification && (
                        <div className="text-sm mt-2">
                          <span className="font-medium">Justification:</span> {score.justification}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {assessmentData.existingAssessment.overall_feedback && (
                <div>
                  <h3 className="font-semibold mb-2">Overall Feedback</h3>
                  <p className="text-sm bg-muted p-4 rounded-lg">
                    {assessmentData.existingAssessment.overall_feedback}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {assessmentData.cannotAssessReason || "You cannot assess this project at this time."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Assessment form
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Project Assessment
          </CardTitle>
          <CardDescription>
            Evaluate the team&apos;s final report based on the rubric criteria below. 
            Once submitted, the project will be locked and no further changes can be made.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rubric Criteria */}
          <div className="space-y-4">
            <h3 className="font-semibold">Rubric Evaluation</h3>
            {assessmentData.rubricCriteria.map((criterion, index) => (
              <div key={criterion.id} className="space-y-3 p-4 border rounded-lg">
                <div className="font-medium">
                  {index + 1}. {criterion.criterion_text}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`score-${criterion.id}`}>
                      Score (1-{criterion.max_score})
                    </Label>
                    <Input
                      id={`score-${criterion.id}`}
                      type="number"
                      min={1}
                      max={criterion.max_score}
                      value={formData.scores[criterion.id]?.score || 1}
                      onChange={(e) => handleScoreChange(criterion.id, 'score', e.target.value)}
                      className={validationErrors[criterion.id] ? "border-red-500" : ""}
                      disabled={submitting}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`justification-${criterion.id}`}>
                      Justification <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id={`justification-${criterion.id}`}
                      placeholder="Explain your score based on the team's work..."
                      value={formData.scores[criterion.id]?.justification || ""}
                      onChange={(e) => handleScoreChange(criterion.id, 'justification', e.target.value)}
                      className={validationErrors[criterion.id] ? "border-red-500" : ""}
                      disabled={submitting}
                      rows={3}
                    />
                    {validationErrors[criterion.id] && (
                      <p className="text-sm text-red-500">{validationErrors[criterion.id]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Overall Feedback */}
          <div className="space-y-2">
            <Label htmlFor="overall-feedback">
              Overall Feedback (Optional)
            </Label>
            <Textarea
              id="overall-feedback"
              placeholder="Provide any additional feedback for the team..."
              value={formData.overallFeedback}
              onChange={(e) => setFormData(prev => ({ ...prev, overallFeedback: e.target.value }))}
              disabled={submitting}
              rows={4}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Assessment...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Save Feedback & Lock Project
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Project Assessment</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Are you sure you want to submit this assessment? This action will:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Save your rubric scores and feedback</li>
                  <li>Lock the project permanently (phase: closed)</li>
                  <li>Prevent any further changes by students</li>
                </ul>
                <p className="mt-3">
                  <strong>This action cannot be undone.</strong>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Confirm & Lock Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}