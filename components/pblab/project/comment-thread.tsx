"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  MessageCircle, 
  Send, 
  AtSign, 
  User, 
  Calendar, 
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { createComment, getProjectMentionableUsers } from "@/lib/actions/artifacts";

interface CommentThreadProps {
  artifactId: string;
  projectId: string;
  comments: Array<{
    id: string;
    body: string;
    created_at: string;
    author: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  currentUserId: string;
  onCommentAdded?: () => void;
}

interface MentionableUser {
  id: string;
  name: string | null;
  email: string;
}

export function CommentThread({ 
  artifactId, 
  projectId,
  comments, 
  currentUserId, 
  onCommentAdded 
}: CommentThreadProps) {
  const [commentBody, setCommentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  
  // Mention functionality
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [isMentionPopoverOpen, setIsMentionPopoverOpen] = useState(false);

  // Load mentionable users
  useEffect(() => {
    const loadMentionableUsers = async () => {
      try {
        const result = await getProjectMentionableUsers(projectId);
        if (result.success) {
          setMentionableUsers(result.data);
        }
      } catch (error) {
        console.error('Failed to load mentionable users:', error);
      }
    };

    loadMentionableUsers();
  }, [projectId]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes > 0 ? `${minutes}m ago` : 'Just now';
    }
  };

  const handleMentionSelect = (userId: string) => {
    if (!selectedMentions.includes(userId)) {
      setSelectedMentions(prev => [...prev, userId]);
    }
    setIsMentionPopoverOpen(false);
  };

  const handleMentionRemove = (userId: string) => {
    setSelectedMentions(prev => prev.filter(id => id !== userId));
  };

  const getMentionedUserName = (userId: string) => {
    const user = mentionableUsers.find(u => u.id === userId);
    return user?.name || user?.email || 'Unknown User';
  };

  const handleSubmit = async () => {
    if (!commentBody.trim()) {
      setSubmitError("Please enter a comment");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const result = await createComment({
        artifactId,
        body: commentBody.trim(),
        mentionedUserIds: selectedMentions
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create comment");
      }

      setSubmitSuccess("Comment added successfully!");
      setCommentBody("");
      setSelectedMentions([]);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(null);
      }, 3000);

      // Notify parent component
      onCommentAdded?.();

    } catch (error) {
      console.error('Comment submission error:', error);
      setSubmitError(error instanceof Error ? error.message : "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableUsers = mentionableUsers.filter(user => 
    user.id !== currentUserId && !selectedMentions.includes(user.id)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to add one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment, index) => (
              <div key={comment.id}>
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.author.name || comment.author.email}
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{formatTimestamp(comment.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {comment.body}
                    </div>
                  </div>
                </div>
                {index < comments.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        )}

        {/* Add Comment Form */}
        <div className="border-t pt-4 space-y-3">
          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Mention Selection */}
          <div className="flex items-center space-x-2">
            <Popover open={isMentionPopoverOpen} onOpenChange={setIsMentionPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting || availableUsers.length === 0}
                  className="flex items-center gap-2"
                >
                  <AtSign className="h-4 w-4" />
                  Mention
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" side="top">
                <Command>
                  <CommandInput placeholder="Search team members..." />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      {availableUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.name || user.email}
                          onSelect={() => handleMentionSelect(user.id)}
                        >
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{user.name || user.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected Mentions */}
            {selectedMentions.length > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-muted-foreground">Mentioning:</span>
                {selectedMentions.map((userId) => (
                  <Badge 
                    key={userId} 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-red-100"
                    onClick={() => handleMentionRemove(userId)}
                  >
                    {getMentionedUserName(userId)} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !commentBody.trim()}
              size="sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Add Comment
                </>
              )}
            </Button>
          </div>

          {/* Status Messages */}
          {submitError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {submitError}
              </AlertDescription>
            </Alert>
          )}

          {submitSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {submitSuccess}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}