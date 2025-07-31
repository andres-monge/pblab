"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  File, 
  Image, 
  Video, 
  ExternalLink, 
  Trash2, 
  Calendar,
  User,
  Loader2,
  AlertCircle
} from "lucide-react";
import { deleteArtifact } from "@/lib/actions/artifacts";
import { GoogleDocPreview } from "./google-doc-preview";

interface ArtifactCardProps {
  artifact: {
    id: string;
    title: string;
    url: string | null;
    type: 'doc' | 'image' | 'video' | 'link';
    created_at: string;
    uploader: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  currentUserId: string;
  currentUserRole: 'student' | 'educator' | 'admin';
  onArtifactDeleted?: () => void;
}

export function ArtifactCard({ 
  artifact, 
  currentUserId, 
  currentUserRole, 
  onArtifactDeleted 
}: ArtifactCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const getArtifactIcon = () => {
    switch (artifact.type) {
      case 'image':
        // eslint-disable-next-line jsx-a11y/alt-text
        return <Image className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'link':
        return <ExternalLink className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const getArtifactTypeLabel = () => {
    switch (artifact.type) {
      case 'image':
        return 'Image';
      case 'video':
        return 'Video';
      case 'link':
        return 'Link';
      default:
        return 'Document';
    }
  };

  const getArtifactTypeColor = () => {
    switch (artifact.type) {
      case 'image':
        return 'bg-green-100 text-green-800';
      case 'video':
        return 'bg-purple-100 text-purple-800';
      case 'link':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canDelete = () => {
    // User can delete if they're the uploader, or if they're an educator/admin
    return artifact.uploader.id === currentUserId || 
           currentUserRole === 'educator' || 
           currentUserRole === 'admin';
  };

  const handleArtifactClick = () => {
    if (artifact.url) {
      // Open artifact in new tab
      window.open(artifact.url, '_blank');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteArtifact({ artifactId: artifact.id });
      
      if (!result.success) {
        throw new Error(result.error || "Failed to delete artifact");
      }

      // Notify parent component
      onArtifactDeleted?.();

    } catch (error) {
      console.error('Delete artifact error:', error);
      setDeleteError(error instanceof Error ? error.message : "Failed to delete artifact");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              {getArtifactIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {artifact.title}
                </h3>
                <Badge variant="secondary" className={getArtifactTypeColor()}>
                  {getArtifactTypeLabel()}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{artifact.uploader.name || artifact.uploader.email}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatTimestamp(artifact.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {canDelete() && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Artifact</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{artifact.title}&quot;? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Clickable area to open artifact */}
        {artifact.url && (
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleArtifactClick}
              className="w-full justify-start"
            >
              {artifact.type === 'link' ? (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Link
                </>
              ) : (
                <>
                  <File className="h-4 w-4 mr-2" />
                  View File
                </>
              )}
            </Button>
            
            {/* Google Doc Preview */}
            <GoogleDocPreview url={artifact.url} />
          </div>
        )}

        {/* Error display */}
        {deleteError && (
          <Alert className="mt-3 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {deleteError}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}