"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Textarea not used in this component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Upload, Link as LinkIcon, File, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { createArtifact } from "@/lib/actions/artifacts";
import { createClient } from "@/lib/supabase/client";

interface ArtifactUploaderProps {
  projectId: string;
  onArtifactCreated?: () => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: string | null;
}

export function ArtifactUploader({ projectId, onArtifactCreated }: ArtifactUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: null
  });

  // File upload state
  const [fileTitle, setFileTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link state
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // Remove unused resetState function

  const resetForms = () => {
    setFileTitle("");
    setSelectedFile(null);
    setLinkTitle("");
    setLinkUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setUploadState(prev => ({
          ...prev,
          error: "File size must be less than 10MB"
        }));
        return;
      }
      
      setSelectedFile(file);
      // Auto-fill title with filename if empty
      if (!fileTitle) {
        setFileTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
      }
      setUploadState(prev => ({ ...prev, error: null }));
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !fileTitle.trim()) {
      setUploadState(prev => ({
        ...prev,
        error: "Please select a file and provide a title"
      }));
      return;
    }

    setUploadState(prev => ({ ...prev, isUploading: true, error: null, progress: 0 }));

    try {
      const supabase = createClient();
      
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${projectId}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('artifacts')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setUploadState(prev => ({ ...prev, progress: 50 }));

      // Get the storage URL
      const { data: urlData } = supabase.storage
        .from('artifacts')
        .getPublicUrl(filePath);

      // Determine artifact type based on MIME type
      let artifactType: 'doc' | 'image' | 'video' | 'link' = 'doc';
      if (selectedFile.type.startsWith('image/')) {
        artifactType = 'image';
      } else if (selectedFile.type.startsWith('video/')) {
        artifactType = 'video';
      }

      setUploadState(prev => ({ ...prev, progress: 75 }));

      // Create artifact record in database
      const result = await createArtifact({
        projectId,
        title: fileTitle.trim(),
        url: urlData.publicUrl,
        type: artifactType,
        mimeType: selectedFile.type,
        fileName: selectedFile.name
      });

      if (!result.success) {
        // If database creation fails, try to clean up the uploaded file
        await supabase.storage.from('artifacts').remove([filePath]);
        throw new Error(result.error || "Failed to create artifact record");
      }

      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        success: `File "${fileTitle}" uploaded successfully!`
      }));

      resetForms();
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: null }));
      }, 3000);

      // Notify parent component
      onArtifactCreated?.();

    } catch (error) {
      console.error('File upload error:', error);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : "Upload failed. Please try again."
      }));
    }
  };

  const handleLinkSubmit = async () => {
    if (!linkTitle.trim() || !linkUrl.trim()) {
      setUploadState(prev => ({
        ...prev,
        error: "Please provide both title and URL for the link"
      }));
      return;
    }

    // Basic URL validation
    try {
      new URL(linkUrl);
    } catch {
      setUploadState(prev => ({
        ...prev,
        error: "Please provide a valid URL"
      }));
      return;
    }

    setUploadState(prev => ({ ...prev, isUploading: true, error: null }));

    try {
      const result = await createArtifact({
        projectId,
        title: linkTitle.trim(),
        url: linkUrl.trim(),
        type: 'link'
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create link artifact");
      }

      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        success: `Link "${linkTitle}" added successfully!`
      }));

      resetForms();
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: null }));
      }, 3000);

      // Notify parent component
      onArtifactCreated?.();

    } catch (error) {
      console.error('Link creation error:', error);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: error instanceof Error ? error.message : "Failed to add link. Please try again."
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Add Artifact
        </CardTitle>
        <CardDescription>
          Upload files or add external links to support your research and collaboration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <File className="h-4 w-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Add Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-title">Title</Label>
              <Input
                id="file-title"
                placeholder="Enter a descriptive title for your file"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
                disabled={uploadState.isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-input">File</Label>
              <Input
                ref={fileInputRef}
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                disabled={uploadState.isUploading}
                accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.zip,.rar"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>

            <Button
              onClick={handleFileUpload}
              disabled={uploadState.isUploading || !selectedFile || !fileTitle.trim()}
              className="w-full"
            >
              {uploadState.isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading... {uploadState.progress}%
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-title">Title</Label>
              <Input
                id="link-title"
                placeholder="Enter a descriptive title for your link"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                disabled={uploadState.isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com/resource"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                disabled={uploadState.isUploading}
              />
            </div>

            <Button
              onClick={handleLinkSubmit}
              disabled={uploadState.isUploading || !linkTitle.trim() || !linkUrl.trim()}
              className="w-full"
            >
              {uploadState.isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding Link...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Add Link
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Status Messages */}
        {uploadState.error && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {uploadState.error}
            </AlertDescription>
          </Alert>
        )}

        {uploadState.success && (
          <Alert className="mt-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {uploadState.success}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        {uploadState.isUploading && uploadState.progress > 0 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}