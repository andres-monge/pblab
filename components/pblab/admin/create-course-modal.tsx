"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCourse, getAllEducators, type CreateCourseParams, type EducatorOption } from "@/lib/actions/admin";

interface CreateCourseModalProps {
  onSuccess?: () => void;
}

export function CreateCourseModal({ onSuccess }: CreateCourseModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [educators, setEducators] = useState<EducatorOption[]>([]);
  const [educatorsLoading, setEducatorsLoading] = useState(false);
  
  const [formData, setFormData] = useState<CreateCourseParams>({
    name: "",
    educatorId: "",
  });

  // Load educators when modal opens
  useEffect(() => {
    if (open) {
      loadEducators();
    }
  }, [open]);

  const loadEducators = async () => {
    setEducatorsLoading(true);
    setError(null);

    try {
      const result = await getAllEducators();
      if (result.success) {
        setEducators(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load educators");
    } finally {
      setEducatorsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate that an educator is selected
    if (!formData.educatorId) {
      setError("Please select an educator to assign to this course");
      setLoading(false);
      return;
    }

    try {
      const result = await createCourse(formData);
      
      if (result.success) {
        setOpen(false);
        setFormData({ name: "", educatorId: "" });
        onSuccess?.();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      setOpen(newOpen);
      if (!newOpen) {
        setError(null);
        setFormData({ name: "", educatorId: "" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Create Course</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Course Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter course name"
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Choose a descriptive name for your course (e.g., &quot;Introduction to Computer Science&quot;, &quot;Advanced Biology&quot;).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="educator">Assign Educator</Label>
            <Select
              value={formData.educatorId}
              onValueChange={(value) => setFormData({ ...formData, educatorId: value })}
              disabled={loading || educatorsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={educatorsLoading ? "Loading educators..." : "Select an educator"} />
              </SelectTrigger>
              <SelectContent>
                {educators.length === 0 ? (
                  <SelectItem value="no-educators" disabled>
                    No educators available
                  </SelectItem>
                ) : (
                  educators.map((educator) => (
                    <SelectItem key={educator.id} value={educator.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{educator.name}</span>
                        <span className="text-xs text-muted-foreground">{educator.email}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the educator who will manage this course and create problems for students.
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.educatorId || educators.length === 0}>
              {loading ? "Creating..." : "Create Course"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}