'use client';

import { useState } from "react";
import { getGoogleDocPreviewUrl } from "@/lib/shared/validation";

interface GoogleDocPreviewProps {
  url: string;
}

export function GoogleDocPreview({ url }: GoogleDocPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const previewUrl = getGoogleDocPreviewUrl(url);
  
  if (!previewUrl) {
    return null; // Don't show preview for non-Google URLs
  }

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium mb-3">Document Preview</h4>
      <div className="relative w-full h-[500px] border rounded-lg overflow-hidden bg-muted">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading document preview...</p>
            </div>
          </div>
        )}
        {hasError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Unable to load document preview</p>
              <p className="text-xs text-muted-foreground">Please use the &quot;View Report →&quot; link above</p>
            </div>
          </div>
        )}
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          onLoad={handleLoad}
          onError={handleError}
          title="Document Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}