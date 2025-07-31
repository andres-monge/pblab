"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtifactUploader } from "./artifact-uploader";
import { ArtifactCard } from "./artifact-card";
import { CommentThread } from "./comment-thread";
import { getProjectArtifacts, type ArtifactWithComments } from "@/lib/actions/artifacts/queries";

interface ProjectArtifactsProps {
  projectId: string;
  currentUserId: string;
  currentUserRole: 'student' | 'educator' | 'admin';
  isLocked?: boolean;
}

export function ProjectArtifacts({ 
  projectId, 
  currentUserId, 
  currentUserRole,
  isLocked = false 
}: ProjectArtifactsProps) {
  const [artifacts, setArtifacts] = useState<ArtifactWithComments[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const loadArtifacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getProjectArtifacts(projectId);
      
      if (result.success) {
        setArtifacts(result.data);
      } else {
        setError(result.error || "Failed to load artifacts");
      }
    } catch (error) {
      console.error('Error loading artifacts:', error);
      setError("An unexpected error occurred while loading artifacts");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

  const handleArtifactCreated = () => {
    loadArtifacts();
  };

  const handleArtifactDeleted = () => {
    loadArtifacts();
  };

  const handleCommentAdded = () => {
    loadArtifacts();
  };

  const toggleComments = (artifactId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [artifactId]: !prev[artifactId]
    }));
  };

  const getArtifactTypeStats = () => {
    const stats = {
      total: artifacts.length,
      docs: artifacts.filter(a => a.type === 'doc').length,
      images: artifacts.filter(a => a.type === 'image').length,
      videos: artifacts.filter(a => a.type === 'video').length,
      links: artifacts.filter(a => a.type === 'link').length,
    };
    return stats;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ArtifactUploader 
          projectId={projectId} 
          onArtifactCreated={handleArtifactCreated}
          isLocked={isLocked}
        />
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading artifacts...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ArtifactUploader 
          projectId={projectId} 
          onArtifactCreated={handleArtifactCreated}
          isLocked={isLocked}
        />
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = getArtifactTypeStats();

  return (
    <div className="space-y-6">
      {/* Artifact Uploader */}
      <ArtifactUploader 
        projectId={projectId} 
        onArtifactCreated={handleArtifactCreated}
        isLocked={isLocked}
      />

      {/* Artifacts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Research Artifacts ({stats.total})
          </CardTitle>
          {stats.total > 0 && (
            <div className="text-sm text-muted-foreground">
              {stats.docs > 0 && `${stats.docs} document${stats.docs !== 1 ? 's' : ''}`}
              {stats.images > 0 && (stats.docs > 0 ? `, ${stats.images} image${stats.images !== 1 ? 's' : ''}` : `${stats.images} image${stats.images !== 1 ? 's' : ''}`)}
              {stats.videos > 0 && ((stats.docs > 0 || stats.images > 0) ? `, ${stats.videos} video${stats.videos !== 1 ? 's' : ''}` : `${stats.videos} video${stats.videos !== 1 ? 's' : ''}`)}
              {stats.links > 0 && ((stats.docs > 0 || stats.images > 0 || stats.videos > 0) ? `, ${stats.links} link${stats.links !== 1 ? 's' : ''}` : `${stats.links} link${stats.links !== 1 ? 's' : ''}`)}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {artifacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No artifacts yet</h3>
              <p>Upload files or add links to start building your research collection.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="space-y-4">
                  {/* Artifact Card */}
                  <ArtifactCard
                    artifact={artifact}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onArtifactDeleted={handleArtifactDeleted}
                  />

                  {/* Comments Section */}
                  <div className="ml-4 border-l-2 border-gray-100 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Comments ({artifact.comments.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleComments(artifact.id)}
                        className="text-xs"
                      >
                        {expandedComments[artifact.id] ? 'Hide' : 'Show'} Comments
                      </Button>
                    </div>

                    {expandedComments[artifact.id] && (
                      <CommentThread
                        artifactId={artifact.id}
                        projectId={projectId}
                        comments={artifact.comments}
                        currentUserId={currentUserId}
                        onCommentAdded={() => handleCommentAdded()}
                        isLocked={isLocked}
                      />
                    )}
                  </div>

                  <Separator />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}