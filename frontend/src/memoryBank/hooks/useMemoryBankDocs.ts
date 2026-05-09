/**
 * useMemoryBankDocs Hook
 * Async imports for memory bank data fetching with loading state
 */

import { useState, useEffect, useMemo } from "react";
import { detectFileType } from "../utils/fileTypeUtils";

// Local types (not exported from ../types)
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
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  created?: string;
  updated?: string;
}

export interface SearchResult {
  fileName: string;
  filePath: string;
  title: string;
  context: string;
  matchType: 'title' | 'section' | 'content';
  section?: string;
}

export interface ParsedDocument {
  fileName: string;
  filePath: string;
  title: string;
  created: string;
  updated: string;
  sections: { id: string; level: number; title: string; content: string }[];
  content: string;
  mimeType: string;
  displayMode: string;
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

function extractDate(content: string): Date | null {
  const match = content.match(/(?:created|updated|date):\s*(.+)/i);
  return match ? new Date(match[1]) : null;
}

function getContext(content: string, query: string, sectionTitle?: string): string {
  const lowerQuery = query.toLowerCase();
  const lowerContent = content.toLowerCase();
  const idx = lowerContent.indexOf(lowerQuery);
  if (idx === -1) return '';
  const start = Math.max(0, idx - 50);
  const end = Math.min(content.length, idx + query.length + 50);
  return content.slice(start, end).trim();
}

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
        setData(prev => ({ ...prev, isLoading: true, error: null }));

        // Use Vite's import.meta.glob to discover files
        const modules = import.meta.glob('/memory-bank/**/*', { query: '?url', import: 'default', eager: true });
        const rawModules = import.meta.glob('/memory-bank/**/*', { query: '?raw', import: 'default', eager: true });

        const files: IndexFile[] = [];
        const categoryMap = new Map<string, IndexCategory>();
        const rootCategories: IndexCategory[] = [];
        const rootFiles: IndexFile[] = [];

        for (const [path, url] of Object.entries(modules)) {
          const relativePath = path.replace('/memory-bank/', '');
          const parts = relativePath.split('/');
          const fileName = parts.pop() || '';
          const category = parts.length > 0 ? parts[0] : 'root';

          const fileData: IndexFile = {
            name: fileName,
            path: relativePath,
            title: fileName.replace('.md', ''),
            type: detectFileType(fileName).displayMode,
            size: (rawModules[path] as string)?.length || 0,
            modified: new Date().toISOString(),
            category
          };

          files.push(fileData);

          if (category === 'root') {
            rootFiles.push(fileData);
          } else {
            if (!categoryMap.has(category)) {
              const newCategory: IndexCategory = {
                name: category,
                displayName: category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                files: [],
                subcategories: []
              };
              categoryMap.set(category, newCategory);
              rootCategories.push(newCategory);
            }
            categoryMap.get(category)?.files.push(fileData);
          }
        }

        if (!cancelled) {
          setData({
            categories: rootCategories,
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
  }, [query, categories]);
}

function parseSections(content: string) {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;
  let sectionContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#')) {
      if (currentSection) {
        sections.push({
          ...currentSection,
          content: sectionContent.trim()
        });
      }
      const level = line.match(/^#+/)?.[0].length || 1;
      currentSection = {
        id: `section-${i}`,
        level,
        title: line.replace(/^#+\s*/, ''),
        content: ''
      };
      sectionContent = '';
    } else if (currentSection) {
      sectionContent += line + '\n';
    }
  }

  if (currentSection) {
    sections.push({
      ...currentSection,
      content: sectionContent.trim()
    });
  }

  return sections;
}
