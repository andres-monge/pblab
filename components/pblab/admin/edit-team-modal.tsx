"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getAllUsers, updateTeamMembers, type UserWithDetails, type TeamWithDetails } from "@/lib/actions/admin";

interface EditTeamModalProps {
  team: TeamWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditTeamModal({ 
  team, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditTeamModalProps) {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load users when modal opens
  useEffect(() => {
    if (open && team) {
      loadUsers();
      // Initialize selected users with current team members
      setSelectedUserIds(team.members.map(member => member.id));
    }
  }, [open, team]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getAllUsers();
      if (result.success) {
        // Filter to only show students for team membership
        const students = result.data.filter(user => user.role === 'student');
        setUsers(students);
      } else {
        setError(`Failed to load users: ${result.error}`);
      }
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSubmit = async () => {
    if (!team) return;
    
    setSubmitting(true);
    setError(null);

    try {
      const result = await updateTeamMembers({
        teamId: team.id,
        userIds: selectedUserIds,
      });

      if (result.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to update team members");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onOpenChange(false);
    setError(null);
    setSelectedUserIds([]);
  };

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Team Members</DialogTitle>
          <DialogDescription>
            Manage members for team &ldquo;{team.name}&rdquo; in {team.course?.name || 'Unknown Course'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current member count */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {selectedUserIds.length} member{selectedUserIds.length !== 1 ? 's' : ''} selected
            </Badge>
          </div>

          {/* User selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Available Students</Label>
            
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading students...</span>
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No students available</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
                {users.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => 
                          handleUserToggle(user.id, checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor={`user-${user.id}`} 
                        className="flex-1 text-sm cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span>{user.name || 'No name'}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Members'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}