/**
 * useMemoryBankDocs Hook
 * Static imports for memory bank data fetching and caching
 */

import { useMemo } from "react";
import { ParsedDoc, DocCategory, MemoryBankIndex, SearchEntry } from "../types";
import { detectFileType, getFileExtension, formatFileSize } from "../utils/fileTypeUtils";

export interface IndexCategory {
  name: string;
  displayName: string;
  files: IndexFile[];
  subcategories?: IndexCategory[];
}

export interface IndexFile {
  fileName: string;
  filePath: string;
  title: string;
  created: string;
  updated: string;
  size?: number;
  mimeType?: string;
  modified?: string;
}

export interface ParsedDocument {
  fileName: string;
  filePath: string;
  title: string;
  created: string;
  updated: string;
  sections: DocSection[];
  content: string;
}

export interface DocSection {
  id: string;
  level: number;
  title: string;
  content: string;
}

export interface SearchResult {
  fileName: string;
  filePath: string;
  title: string;
  section?: string;
  context: string;
  matchType: "title" | "section" | "content";
}

// Helper functions
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

function extractDate(content: string): Date | null {
  // Look for date patterns in frontmatter or content
  const dateMatch = content.match(/(?:^|\n)[*#]\s*[*]Updated[*]:?\s*(.+?)(?:\n|$)/im) ||
                    content.match(/(?:^|\n)date:\s*(.+?)(?:\n|$)/im);
  if (dateMatch) {
    const date = new Date(dateMatch[1].trim());
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function parseSections(content: string): DocSection[] {
  const sections: DocSection[] = [];
  const lines = content.split('\n');
  let currentSection: DocSection | null = null;
  let sectionContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#{2,6})\s+(.+)$/);
    
    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = sectionContent.trim();
        sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        id: `section-${sections.length}`,
        level: headerMatch[1].length,
        title: headerMatch[2].trim(),
        content: ''
      };
      sectionContent = '';
    } else if (currentSection) {
      sectionContent += line + '\n';
    }
  }
  
  // Save last section
  if (currentSection) {
    currentSection.content = sectionContent.trim();
    sections.push(currentSection);
  }
  
  return sections;
}

function getContext(content: string, query: string, sectionTitle?: string): string {
  const lines = content.split('\n');
  const queryLower = query.toLowerCase();
  
  if (sectionTitle) {
    // Find section and get content around it
    const sectionStart = lines.findIndex(line => 
      line.toLowerCase().includes(sectionTitle.toLowerCase())
    );
    
    if (sectionStart !== -1) {
      const start = Math.max(0, sectionStart - 1);
      const end = Math.min(lines.length, sectionStart + 4);
      return lines.slice(start, end).join('\n').trim();
    }
  }
  
  // Find first occurrence of query and get context
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(queryLower)) {
      const start = Math.max(0, i - 1);
      const end = Math.min(lines.length, i + 3);
      return lines.slice(start, end).join('\n').trim();
    }
  }
  
  return content.substring(0, 200) + '...';
}

/**
 * Helper function to build hierarchical category structure
 */
function buildCategoryStructure(files: IndexFile[]): IndexCategory[] {
  const categoryMap = new Map<string, IndexCategory>();
  const rootCategories: IndexCategory[] = [];
  const rootFiles: IndexFile[] = [];

  for (const file of files) {
    const parts = file.filePath.split('/');
    
    if (parts.length === 1) {
      // Root level file - add to root files list
      rootFiles.push(file);
    } else {
      // File in subdirectory - build hierarchy
      const categoryName = parts[0];
      let currentCategory: IndexCategory | undefined;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        
        if (!categoryMap.has(part)) {
          const newCategory: IndexCategory = {
            name: part,
            displayName: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
            files: [],
            subcategories: []
          };
          categoryMap.set(part, newCategory);
          
          // Add to parent's subcategories or root
          if (i === 0) {
            rootCategories.push(newCategory);
          } else if (currentCategory) {
            currentCategory.subcategories = currentCategory.subcategories || [];
            currentCategory.subcategories.push(newCategory);
          }
        }
        
        currentCategory = categoryMap.get(part);
      }
      
      // Add file to the deepest category
      if (currentCategory) {
        currentCategory.files.push(file);
      }
    }
  }

  // Add root files to a root category if any exist
  if (rootFiles.length > 0) {
    rootCategories.unshift({
      name: 'root',
      displayName: 'Files',
      files: rootFiles,
      subcategories: []
    });
  }

  return rootCategories;
}

/**
 * Fetch all memory bank categories and files using static imports
 */
export function useMemoryBankDocs() {
  return useMemo(() => {
    const modules = import.meta.glob('/memory-bank/**/*', { query: '?url', import: 'default', eager: true });
    const rootFiles: IndexFile[] = [];
    const subdirectoryFiles: IndexFile[] = [];
    const folderSet = new Set<string>();

    // Load metadata file
    let fileMetadata: Record<string, { size: number; modified: string }> = {};
    try {
      const metadataModule = import.meta.glob('/memory-bank/metadata.json', { query: '?raw', import: 'default', eager: true });
      const metadataPath = '/memory-bank/metadata.json';
      const metadataContent = metadataModule[metadataPath] as string;
      if (metadataContent) {
        fileMetadata = JSON.parse(metadataContent);
      }
    } catch (e) {
      console.warn('[MemoryBank] Could not load metadata.json:', e);
    }

    for (const [path, url] of Object.entries(modules)) {
      const relativePath = path.replace('/memory-bank/', '');
      const parts = relativePath.split('/');
      const fileName = parts[parts.length - 1];
      
      // Skip directories and hidden files
      if (!fileName || fileName.startsWith('.')) continue;
      
      // Skip metadata.json itself
      if (fileName === 'metadata.json') continue;
      
      // Track folders
      if (parts.length > 1) {
        folderSet.add(parts[0]);
      }
      
      let categoryName: string;
      let filePath: string;
      
      // Get file metadata
      const metadata = fileMetadata[relativePath];
      const fileSize = metadata?.size || 0;
      const fileModified = metadata?.modified || new Date().toISOString();
      
      if (parts.length === 1) {
        // Root level file
        categoryName = 'root';
        filePath = relativePath;
        rootFiles.push({
          fileName,
          filePath: relativePath,
          title: fileName,
          created: fileModified,
          updated: fileModified,
          size: fileSize,
          mimeType: detectFileType(fileName).mimeType,
          modified: fileModified
        });
      } else {
        // File in subdirectory
        categoryName = parts[0];
        filePath = parts.slice(1).join('/');
        subdirectoryFiles.push({
          fileName,
          filePath: relativePath,
          title: fileName,
          created: fileModified,
          updated: fileModified,
          size: fileSize,
          mimeType: detectFileType(fileName).mimeType,
          modified: fileModified
        });
      }
    }

    // Build hierarchical structure from subdirectory files
    const categories = buildCategoryStructure(subdirectoryFiles);

    // Add root files as a separate category at the beginning
    if (rootFiles.length > 0) {
      categories.unshift({
        name: 'root',
        displayName: 'Files',
        files: rootFiles,
        subcategories: []
      });
    }

    // Add empty folders (folders with no files)
    for (const folderName of folderSet) {
      const exists = categories.some(cat => cat.name === folderName);
      if (!exists) {
        categories.push({
          name: folderName,
          displayName: folderName.charAt(0).toUpperCase() + folderName.slice(1).replace(/-/g, ' '),
          files: [],
          subcategories: []
        });
      }
    }

    return {
      categories,
      lastUpdated: new Date().toISOString()
    };
  }, []);
}

/**
 * Fetch documents in specific category using static imports
 */
export function useMemoryBankCategory(category: string) {
  const { categories } = useMemoryBankDocs();
  
  return useMemo(() => {
    const foundCategory = categories.find(cat => cat.name === category);
    return {
      category: category,
      files: foundCategory?.files || []
    };
  }, [categories, category]);
}

export function useMemoryBankDocument(category: string, file: string) {
  const modules = import.meta.glob('/memory-bank/**/*', { query: '?url', import: 'default', eager: true });
  const rawModules = import.meta.glob('/memory-bank/**/*', { query: '?raw', import: 'default', eager: true });

  return useMemo(() => {
    let filePath: string;
    if (category === "root") {
      filePath = `/memory-bank/${file}`;
    } else {
      const fileName = file.endsWith('.md') ? file : `${file}`;
      filePath = `/memory-bank/${category}/${fileName}`;
    }
    
    const url = modules[filePath] as string;
    const rawContent = rawModules[filePath] as string;
    
    if (!url) {
      return undefined;
    }

    const fileType = detectFileType(file);
    
    if (fileType.displayMode === 'markdown') {
      const content = rawContent as any;
      return {
        fileName: file,
        filePath: `${category}/${file}`,
        title: extractTitle(content) || file.replace('.md', ''),
        created: extractDate(content)?.toISOString() || new Date().toISOString(),
        updated: extractDate(content)?.toISOString() || new Date().toISOString(),
        sections: parseSections(content),
        content,
        mimeType: fileType.mimeType,
        displayMode: fileType.displayMode
      } as any;
    }

    if (fileType.displayMode === 'text') {
      const content = rawContent as string;
      return {
        fileName: file,
        filePath: `${category}/${file}`,
        title: file,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        content: content || "Unable to read file content",
        mimeType: fileType.mimeType,
        displayMode: fileType.displayMode
      } as any;
    }

    // For images and download mode, use the URL
    return {
      fileName: file,
      filePath: `${category}/${file}`,
      title: file,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      content: url,
      mimeType: fileType.mimeType,
      displayMode: fileType.displayMode
    } as any;
  }, [category, file]);
}

/**
 * Search memory bank documents using static imports
 */
export function useMemoryBankSearch(query: string) {
  const { categories } = useMemoryBankDocs();

  return useMemo(() => {
    if (query.length < 2) return { query, resultCount: 0, results: [] };

    const modules = import.meta.glob('/memory-bank/**/*', { query: '?url', import: 'default', eager: true });
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [path, url] of Object.entries(modules)) {
      const relativePath = path.replace('/memory-bank/', '');
      const fileName = relativePath.split('/').pop() || '';
      const fileType = detectFileType(fileName);
      
      // Only search markdown files for content
      if (fileType.displayMode === 'markdown') {
        const content = url as any;
        const title = extractTitle(content) || fileName.replace('.md', '');
        const contentStr = content as string;
        
        // Title match
        if (title.toLowerCase().includes(lowerQuery)) {
          results.push({
            fileName,
            filePath: relativePath,
            title,
            context: getContext(contentStr, query),
            matchType: "title"
          });
          continue;
        }
        
        // Section match
        const sections = parseSections(contentStr);
        for (const section of sections) {
          if (section.title.toLowerCase().includes(lowerQuery)) {
            results.push({
              fileName,
              filePath: relativePath,
              title,
              section: section.title,
              context: getContext(contentStr, query, section.title),
              matchType: "section"
            });
            break;
          }
        }
        
        // Content match
        if (contentStr.toLowerCase().includes(lowerQuery)) {
          results.push({
            fileName,
            filePath: relativePath,
            title,
            context: getContext(contentStr, query),
            matchType: "content"
          });
        }
      } else {
        // Non-markdown files - match by filename
        if (fileName.toLowerCase().includes(lowerQuery)) {
          results.push({
            fileName,
            filePath: relativePath,
            title: fileName,
            context: `File: ${fileName}`,
            matchType: "title"
          });
        }
      }
    }
    
    return {
      query,
      resultCount: results.length,
      results
    };
  }, [categories, query]);
}