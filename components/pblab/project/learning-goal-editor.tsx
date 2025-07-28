"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lightbulb, Save, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { updateProjectLearningGoals } from "@/lib/actions/projects";

interface LearningGoalEditorProps {
  projectId: string;
  initialGoals: string | null;
}

interface AiSuggestion {
  text: string;
  id: string;
}

export function LearningGoalEditor({ projectId, initialGoals }: LearningGoalEditorProps) {
  const [goals, setGoals] = useState(initialGoals || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const result = await updateProjectLearningGoals({
        projectId,
        goals: goals.trim()
      });

      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Learning goals saved successfully!' });
        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save learning goals' });
      }
    } catch (error) {
      console.error('Error saving learning goals:', error);
      setSaveMessage({ type: 'error', text: 'An unexpected error occurred while saving' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetSuggestions = async () => {
    setIsLoadingSuggestions(true);
    setSuggestionsError(null);
    
    try {
      const response = await fetch('/api/ai/suggest-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.suggestions) {
        // Convert suggestions to objects with IDs for React keys
        const suggestionsWithIds = data.suggestions.map((suggestion: string, index: number) => ({
          id: `suggestion-${index}`,
          text: suggestion
        }));
        setSuggestions(suggestionsWithIds);
        setSuggestionsError(null);
      } else {
        setSuggestionsError(data.error || "Failed to generate suggestions");
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      setSuggestionsError("Failed to get AI suggestions. Please try again.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleCopySuggestion = (suggestionText: string) => {
    // Add suggestion to current goals with proper formatting
    const currentGoals = goals.trim();
    const newGoals = currentGoals 
      ? `${currentGoals}\n\n• ${suggestionText}`
      : `• ${suggestionText}`;
    
    setGoals(newGoals);
    // Provide visual feedback by briefly showing a success state
    setSaveMessage({ type: 'success', text: 'Suggestion added to your goals!' });
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const hasChanges = goals.trim() !== (initialGoals || '').trim();

  return (
    <div className="space-y-6">
      {/* Learning Goals Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Learning Goals</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGetSuggestions}
              disabled={isLoadingSuggestions}
              className="flex items-center gap-2"
            >
              {isLoadingSuggestions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4" />
              )}
              {isLoadingSuggestions ? 'Getting Suggestions...' : 'AI Suggestions'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              size="sm"
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Goals'}
            </Button>
          </div>
        </div>

        <Textarea
          placeholder="Define your learning goals for this project. What do you hope to learn and achieve? Be specific about the skills, knowledge, and competencies you want to develop.

Examples:
• Develop proficiency in data analysis techniques
• Understand the relationship between theory and practice
• Apply critical thinking to real-world problems
• Collaborate effectively in a team environment"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          className="min-h-[200px] resize-y"
        />

        <p className="text-sm text-muted-foreground">
          {goals.trim().length > 0 
            ? `${goals.trim().length} characters` 
            : 'Start typing your learning goals above'
          }
        </p>

        {/* Save Message */}
        {saveMessage && (
          <Alert className={`${saveMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            {saveMessage.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={`${saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {saveMessage.text}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* AI Suggestions Error */}
      {suggestionsError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {suggestionsError}
          </AlertDescription>
        </Alert>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI-Suggested Learning Goals
            </CardTitle>
            <CardDescription>
              Click on any suggestion to add it to your goals, or use them as inspiration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-md hover:bg-muted/70 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{suggestion.text}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopySuggestion(suggestion.text)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Copy className="h-3 w-3" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuggestions([])}
                className="text-xs text-muted-foreground"
              >
                Clear suggestions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}