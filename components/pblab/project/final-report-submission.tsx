"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { updateProjectReportUrl } from "@/lib/actions/projects";

interface FinalReportSubmissionProps {
  projectId: string;
  currentReportUrl?: string | null;
}

export function FinalReportSubmission({ projectId, currentReportUrl }: FinalReportSubmissionProps) {
  const [reportUrl, setReportUrl] = useState(currentReportUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportUrl.trim()) {
      setSubmitMessage({ type: 'error', text: 'Please enter a valid report URL' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);
    
    try {
      const result = await updateProjectReportUrl({
        projectId,
        reportUrl: reportUrl.trim()
      });

      if (result.success) {
        setSubmitMessage({ 
          type: 'success', 
          text: result.message || 'Final report URL submitted successfully!' 
        });
        // Clear message after 5 seconds
        setTimeout(() => setSubmitMessage(null), 5000);
      } else {
        setSubmitMessage({ 
          type: 'error', 
          text: result.error || 'Failed to submit final report URL' 
        });
      }
    } catch (error) {
      console.error('Error submitting final report URL:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred while submitting' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = reportUrl.trim() !== (currentReportUrl || '').trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Final Report Submission
        </CardTitle>
        <CardDescription>
          Submit the URL to your team&apos;s final report document.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tip Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            💡 <strong>Tip:</strong> Set your document to &quot;Anyone with the link can view&quot; so your educators won&apos;t need to request access.
          </AlertDescription>
        </Alert>

        {/* Current Report URL Display */}
        {currentReportUrl && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Current Report URL:
            </label>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <span className="text-sm flex-1 truncate">{currentReportUrl}</span>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-auto p-1"
              >
                <a
                  href={currentReportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="reportUrl" className="text-sm font-medium">
              Report URL {!currentReportUrl && <span className="text-red-500">*</span>}
            </label>
            <Input
              id="reportUrl"
              type="url"
              placeholder="https://docs.google.com/document/d/..."
              value={reportUrl}
              onChange={(e) => setReportUrl(e.target.value)}
              required={!currentReportUrl}
            />
            <p className="text-xs text-muted-foreground">
              Enter the link to your Google Doc or other document platform
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || (!hasChanges && !!currentReportUrl)}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {currentReportUrl 
              ? (isSubmitting ? 'Updating...' : 'Update Report URL')
              : (isSubmitting ? 'Submitting...' : 'Submit Final Report')
            }
          </Button>
        </form>

        {/* Submit Message */}
        {submitMessage && (
          <Alert className={`${submitMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            {submitMessage.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={`${submitMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {submitMessage.text}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}