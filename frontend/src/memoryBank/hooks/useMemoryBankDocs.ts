/**
 * useMemoryBankDocs Hook
 * Async imports for memory bank data fetching with loading state
 */

import { useState, useEffect, useMemo } from "react";
import { detectFileType } from "../utils/fileTypeUtils";
import type { IndexCategory, IndexFile } from "../types";

export interface MemoryBankData {
  categories: IndexCategory[];
  lastUpdated: string;
  isLoading: boolean;
  error: string | null;
}

export interface IndexCategory {
  name: string;
  displayName: string;
  files: IndexFile[];
  subcategories?: IndexCategory[];
}

export interface IndexFile {
  name: string;
  path: string;
  title: string;
  type: string;
  size: number;
  modified: string;
  category: string;
}

export interface SearchResult {
  fileName: string;
  filePath: string;
  title: string;
  context: string;
  matchType: 'title' | 'section' | 'content';
}

export interface MemoryBankData {
  categories: IndexCategory[];
  lastUpdated: string;
  isLoading: boolean;
  error: string | null;
}

// Helper functions
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

function parseSections(content: string) {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;
  let sectionContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#{2,6})\s+(.+)$/);
    
    if (headerMatch) {
      if (currentSection) {
        currentSection.content = sectionContent.trim();
        sections.push(currentSection);
      }
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
  
  if (currentSection) {
    currentSection.content = sectionContent.trim();
    sections.push(currentSection);
  }
  
  return sections;
}

function buildCategoryStructure(files: IndexFile[]): IndexCategory[] {
  const categoryMap = new Map<string, IndexCategory>();
  const rootCategories: IndexCategory[] = [];
  const rootFiles: IndexFile[] = [];

  for (const file of files) {
    const parts = file.filePath.split('/');
    
    if (parts.length === 1) {
      rootFiles.push(file);
    } else {
      const categoryName = parts[0];
      let currentCategory;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        
        if (!categoryMap.has(part)) {
          const newCategory = {
            name: part,
            displayName: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
            files: [],
            subcategories: []
          };
          categoryMap.set(part, newCategory);
          
          if (i === 0) {
            rootCategories.push(newCategory);
          } else if (currentCategory) {
            currentCategory.subcategories = currentCategory.subcategories || [];
            currentCategory.subcategories.push(newCategory);
          }
        }
        
        currentCategory = categoryMap.get(part);
      }
      
      if (currentCategory) {
        currentCategory.files.push(file);
      }
    }
  }

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
 * Async hook to fetch all memory bank categories and files
 */
export function useMemoryBankDocs(): MemoryBankData {
  const [data, setData] = useState<MemoryBankData>({
    categories: [],
    lastUpdated: '',
    isLoading: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;
    
    async function loadDocs() {
      try {
        // Use dynamic import instead of eager glob
        const modules = import.meta.glob('/memory-bank/**/*', { 
          query: '?url', 
          import: 'default'
        });
        
        const rawModules = import.meta.glob('/memory-bank/**/*', { 
          query: '?raw', 
          import: 'default'
        });
        
        const rootFiles: IndexFile[] = [];
        const subdirectoryFiles: IndexFile[] = [];
        const folderSet = new Set<string>();

        // Load all modules asynchronously
        const entries = await Promise.all(
          Object.entries(modules).map(async ([path, loader]) => {
            try {
              const url = await loader();
              return { path, url: url as string };
            } catch (e) {
              console.warn(`[MemoryBank] Failed to load ${path}:`, e);
              return null;
            }
          })
        );

        for (const entry of entries) {
          if (!entry) continue;
          
          const { path, url } = entry;
          const relativePath = path.replace('/memory-bank/', '');
          const parts = relativePath.split('/');
          const fileName = parts[parts.length - 1];
          
          if (!fileName || fileName.startsWith('.')) continue;
          if (fileName === 'metadata.json') continue;
          
          if (parts.length > 1) {
            folderSet.add(parts[0]);
          }
          
          const fileData: IndexFile = {
            fileName,
            filePath: relativePath,
            title: fileName,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            mimeType: detectFileType(fileName).mimeType
          };
          
          if (parts.length === 1) {
            rootFiles.push(fileData);
          } else {
            subdirectoryFiles.push(fileData);
          }
        }

        const categories = buildCategoryStructure(subdirectoryFiles);
        
        if (rootFiles.length > 0) {
          categories.unshift({
            name: 'root',
            displayName: 'Files',
            files: rootFiles,
            subcategories: []
          });
        }

        if (!cancelled) {
          setData({
            categories,
            lastUpdated: new Date().toISOString(),
            isLoading: false,
            error: null
          });
        }
      } catch (e) {
        if (!cancelled) {
          setData(prev => ({
            ...prev,
            isLoading: false,
            error: e instanceof Error ? e.message : 'Failed to load memory bank'
          }));
        }
      }
    }
    
    loadDocs();
    
    return () => { cancelled = true; };
  }, []);

  return data;
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