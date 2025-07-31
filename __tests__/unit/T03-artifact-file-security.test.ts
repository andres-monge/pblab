/**
 * T-03: Artifact Upload File Type Security
 * 
 * Tests that createArtifact enforces file-type whitelist:
 * 1. Rejects dangerous file types like .exe
 * 2. Accepts allowed file types from security whitelist
 * 3. Validates both MIME type and file extension
 * 4. Handles edge cases properly
 */

import { describe, it, expect } from '@jest/globals';
import { validateFileType } from '@/lib/security/file-validation';

describe('T-03: Artifact Upload File Type Security', () => {
  describe('File Type Validation Function', () => {
    it('should reject dangerous executable files', () => {
      // Test various dangerous file types
      const dangerousFiles = [
        { fileName: 'malware.exe', mimeType: 'application/x-msdownload' },
        { fileName: 'script.bat', mimeType: 'application/x-bat' },
        { fileName: 'virus.scr', mimeType: 'application/x-msdownload' },
        { fileName: 'trojan.com', mimeType: 'application/x-msdos-program' },
        { fileName: 'malicious.msi', mimeType: 'application/x-msi' },
        { fileName: 'bad.vbs', mimeType: 'text/vbscript' },
        { fileName: 'harmful.js', mimeType: 'application/javascript' }, // JS files not in whitelist
      ];

      dangerousFiles.forEach(({ fileName, mimeType }) => {
        const isValid = validateFileType(mimeType, fileName);
        expect(isValid).toBe(false);
      });
    });

    it('should accept allowed file types from whitelist', () => {
      // Test allowed file types
      const allowedFiles = [
        { fileName: 'document.pdf', mimeType: 'application/pdf' },
        { fileName: 'image.jpg', mimeType: 'image/jpeg' },
        { fileName: 'photo.png', mimeType: 'image/png' },
        { fileName: 'data.csv', mimeType: 'text/csv' },
        { fileName: 'report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { fileName: 'presentation.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
        { fileName: 'video.mp4', mimeType: 'video/mp4' },
        { fileName: 'audio.mp3', mimeType: 'audio/mpeg' },
      ];

      allowedFiles.forEach(({ fileName, mimeType }) => {
        const isValid = validateFileType(mimeType, fileName);
        expect(isValid).toBe(true);
      });
    });

    it('should validate by file extension when MIME type is missing', () => {
      // Test extension-only validation
      expect(validateFileType(undefined, 'document.pdf')).toBe(true);
      expect(validateFileType(undefined, 'image.jpg')).toBe(true);
      expect(validateFileType(undefined, 'malware.exe')).toBe(false);
      expect(validateFileType(undefined, 'script.bat')).toBe(false);
    });

    it('should validate by MIME type when filename is missing', () => {
      // Test MIME-only validation
      expect(validateFileType('application/pdf')).toBe(true);
      expect(validateFileType('image/jpeg')).toBe(true);
      expect(validateFileType('application/x-msdownload')).toBe(false);
      expect(validateFileType('application/x-executable')).toBe(false);
    });

    it('should allow external links (no file validation)', () => {
      // External links should bypass file validation
      expect(validateFileType()).toBe(true);
      expect(validateFileType(undefined, undefined)).toBe(true);
    });
  });
});