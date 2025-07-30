"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProblem } from "@/lib/actions/problems";
import { type CreateProblemParams, type RubricCriterionData } from "@/lib/types/problems";
import { getDefaultRubricTemplate } from "@/lib/shared/rubric-templates";
import { Trash2, Plus } from "lucide-react";

interface Course {
  id: string;
  name: string;
}

interface CreateProblemFormProps {
  courses: Course[];
}

interface FormData {
  title: string;
  description: string;
  courseId: string;
}

export function CreateProblemForm({ courses }: CreateProblemFormProps) {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    courseId: "",
  });
  
  // Pre-load with default rubric template
  const [criteria, setCriteria] = useState<RubricCriterionData[]>(
    getDefaultRubricTemplate().criteria
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCriterionChange = (index: number, field: keyof RubricCriterionData, value: string | number) => {
    setCriteria(prev => prev.map((criterion, i) => 
      i === index ? { ...criterion, [field]: value } : criterion
    ));
  };

  const addCriterion = () => {
    const newCriterion: RubricCriterionData = {
      criterion_text: "",
      max_score: 5,
      sort_order: criteria.length,
    };
    setCriteria(prev => [...prev, newCriterion]);
  };

  const removeCriterion = (index: number) => {
    if (criteria.length <= 1) {
      setError("At least one criterion is required");
      return;
    }
    setCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Basic validation
      if (!formData.title.trim()) {
        setError("Problem title is required");
        return;
      }
      
      if (!formData.courseId) {
        setError("Please select a course");
        return;
      }
      
      if (criteria.some(c => !c.criterion_text.trim())) {
        setError("All rubric criteria must have text");
        return;
      }

      // Prepare data for server action
      const problemData: CreateProblemParams = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        courseId: formData.courseId,
        rubric: {
          name: "PBL Assessment Rubric",
          criteria: criteria.map((criterion, index) => ({
            ...criterion,
            sort_order: index, // Ensure proper ordering
          })),
        },
      };

      const result = await createProblem(problemData);
      
      if (result.success) {
        // Success! Redirect to educator dashboard
        router.push("/educator/dashboard");
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Problem Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Problem Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Problem Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter a descriptive problem title"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="course">Course *</Label>
              <Select
                value={formData.courseId}
                onValueChange={(value) => handleInputChange("courseId", value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {courses.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No courses available. Please contact an admin to create courses.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Problem Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Provide a detailed description of the problem students will work on..."
              rows={4}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Markdown formatting is supported for rich text content.
            </p>
          </div>

          {/* Rubric Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Assessment Rubric</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCriterion}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Criterion
              </Button>
            </div>
            
            <div className="space-y-4">
              {criteria.map((criterion, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`criterion-${index}`}>
                            Criterion {index + 1} *
                          </Label>
                          <Textarea
                            id={`criterion-${index}`}
                            value={criterion.criterion_text}
                            onChange={(e) => handleCriterionChange(index, "criterion_text", e.target.value)}
                            placeholder="Describe what students will be assessed on..."
                            rows={3}
                            disabled={loading}
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="space-y-2">
                            <Label htmlFor={`max-score-${index}`}>Max Score</Label>
                            <Input
                              id={`max-score-${index}`}
                              type="number"
                              min={1}
                              max={10}
                              value={criterion.max_score}
                              onChange={(e) => handleCriterionChange(index, "max_score", parseInt(e.target.value) || 5)}
                              className="w-20"
                              disabled={loading}
                            />
                          </div>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCriterion(index)}
                            disabled={loading || criteria.length <= 1}
                            className="mt-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground">
              The form is pre-loaded with a standard PBL rubric template. You can modify, add, or remove criteria as needed.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded border border-destructive/20">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || courses.length === 0}
            >
              {loading ? "Creating..." : "Create Problem"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}