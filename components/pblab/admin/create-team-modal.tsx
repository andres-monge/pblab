"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTeam, getAllCourses, type CreateTeamParams, type CourseWithDetails } from "@/lib/actions/admin";

interface CreateTeamModalProps {
  onSuccess?: () => void;
}

export function CreateTeamModal({ onSuccess }: CreateTeamModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  
  const [formData, setFormData] = useState<CreateTeamParams>({
    name: "",
    courseId: "",
  });

  // Load courses when modal opens
  useEffect(() => {
    if (open && courses.length === 0) {
      loadCourses();
    }
  }, [open, courses.length]);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const result = await getAllCourses();
      if (result.success) {
        setCourses(result.data);
      } else {
        setError("Failed to load courses");
      }
    } catch {
      setError("Failed to load courses");
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createTeam(formData);
      
      if (result.success) {
        setOpen(false);
        setFormData({ name: "", courseId: "" });
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
        setFormData({ name: "", courseId: "" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Create Team</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter team name"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course">Course</Label>
            {loadingCourses ? (
              <div className="p-2 text-sm text-muted-foreground">
                Loading courses...
              </div>
            ) : courses.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                No courses available. Create a course first.
              </div>
            ) : (
              <Select
                value={formData.courseId}
                onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <Button 
              type="submit" 
              disabled={loading || loadingCourses || courses.length === 0}
            >
              {loading ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}