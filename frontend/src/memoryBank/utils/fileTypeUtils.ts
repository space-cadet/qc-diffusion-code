/**
 * File Type Detection Utility
 * Provides MIME type detection, file icons, and display mode logic for memory bank files
 */

export type FileDisplayMode = 'markdown' | 'image' | 'text' | 'download';

export interface FileTypeIcon {
  icon: string;
  color: string;
}

export interface FileTypeDetection {
  mimeType: string;
  displayMode: FileDisplayMode;
  icon: FileTypeIcon;
  kind: string;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : '';
}

/**
 * Detect MIME type from file extension
 */
export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  
  const mimeMap: Record<string, string> = {
    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    
    // Text files
    'txt': 'text/plain',
    'md': 'text/markdown',
    'log': 'text/plain',
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    
    // Code
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'tsx': 'text/typescript',
    'jsx': 'text/javascript',
    'py': 'text/x-python',
    'java': 'text/x-java-source',
    'cpp': 'text/x-c++',
    'c': 'text/x-c',
    'h': 'text/x-c',
    
    // Archives
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'rar': 'application/vnd.rar',
  };
  
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Get file icon and color based on file type
 */
export function getFileIcon(filename: string): FileTypeIcon {
  const ext = getFileExtension(filename);
  
  // Images
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
    return { icon: '🖼️', color: 'text-green-600' };
  }
  
  // Text/Code
  if (['txt', 'md', 'log', 'json', 'xml', 'csv', 'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'h'].includes(ext)) {
    return { icon: '📄', color: 'text-blue-600' };
  }
  
  // Documents
  if (['pdf', 'doc', 'docx'].includes(ext)) {
    return { icon: '📑', color: 'text-red-600' };
  }
  
  // Archives
  if (['zip', 'tar', 'gz', 'rar'].includes(ext)) {
    return { icon: '📦', color: 'text-yellow-600' };
  }
  
  // Default
  return { icon: '📁', color: 'text-gray-600' };
}

/**
 * Get display mode for file type
 */
export function getDisplayMode(filename: string): FileDisplayMode {
  const ext = getFileExtension(filename);
  
  // Markdown files
  if (ext === 'md') {
    return 'markdown';
  }
  
  // Image files
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
    return 'image';
  }
  
  // Text files
  if (['txt', 'log', 'json', 'xml', 'csv', 'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'h'].includes(ext)) {
    return 'text';
  }
  
  // Default to download
  return 'download';
}

/**
 * Get file kind description
 */
export function getFileKind(filename: string): string {
  const ext = getFileExtension(filename);
  
  // Images
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
    const extUpper = ext.toUpperCase();
    return `${extUpper} Image`;
  }
  
  // Text files
  if (ext === 'md') return 'Markdown Document';
  if (ext === 'txt') return 'Plain Text';
  if (ext === 'log') return 'Log File';
  if (ext === 'json') return 'JSON Data';
  if (ext === 'xml') return 'XML Document';
  if (ext === 'csv') return 'CSV Data';
  
  // Code files
  if (ext === 'js' || ext === 'jsx') return 'JavaScript';
  if (ext === 'ts' || ext === 'tsx') return 'TypeScript';
  if (ext === 'py') return 'Python Source';
  if (ext === 'java') return 'Java Source';
  if (ext === 'cpp') return 'C++ Source';
  if (ext === 'c') return 'C Source';
  
  // Documents
  if (ext === 'pdf') return 'PDF Document';
  if (ext === 'doc' || ext === 'docx') return 'Word Document';
  
  // Archives
  if (ext === 'zip') return 'ZIP Archive';
  if (ext === 'tar') return 'TAR Archive';
  if (ext === 'gz') return 'GZIP Archive';
  if (ext === 'rar') return 'RAR Archive';
  
  // Default
  return ext.toUpperCase() + ' File';
}

/**
 * Complete file type detection
 */
export function detectFileType(filename: string): FileTypeDetection {
  return {
    mimeType: getMimeType(filename),
    displayMode: getDisplayMode(filename),
    icon: getFileIcon(filename),
    kind: getFileKind(filename)
  };
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
