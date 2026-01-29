/**
 * useMemoryBankDocs Hook
 * Static imports for memory bank data fetching and caching
 */

import { useMemo } from "react";
import { ParsedDoc, DocCategory, MemoryBankIndex, SearchEntry } from "../types";

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

  for (const file of files) {
    const parts = file.filePath.split('/');
    
    if (parts.length === 1) {
      // Root level file - add to root category
      if (!categoryMap.has('root')) {
        categoryMap.set('root', {
          name: 'root',
          displayName: 'Root Files',
          files: [],
          subcategories: []
        });
      }
      categoryMap.get('root')!.files.push(file);
    } else {
      // File in subdirectory - build hierarchy
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

  // Add root category if it has files
  if (categoryMap.has('root') && categoryMap.get('root')!.files.length > 0) {
    rootCategories.unshift(categoryMap.get('root')!);
  }

  return rootCategories;
}

/**
 * Fetch all memory bank categories and files using static imports
 */
export function useMemoryBankDocs() {
  return useMemo(() => {
    const modules = import.meta.glob('/memory-bank/**/*.md', { as: 'raw', eager: true });
    const flatFiles: IndexFile[] = [];

    for (const [path, content] of Object.entries(modules)) {
      const relativePath = path.replace('/memory-bank/', '');
      const parts = relativePath.split('/');
      
      let categoryName: string;
      let fileName: string;
      
      if (parts.length === 1) {
        // Root level file like "activeContext.md"
        categoryName = 'root';
        fileName = parts[0];
      } else {
        // File in subdirectory (could be nested like "implementation-details/subfolder/file.md")
        categoryName = parts[0];
        fileName = parts.slice(1).join('/'); // Keep the full subfolder path
      }

      const title = extractTitle(content as string) || fileName.replace('.md', '');
      const created = extractDate(content as string) || new Date();
      const updated = extractDate(content as string) || new Date();

      flatFiles.push({
        fileName,
        filePath: relativePath,
        title,
        created: created.toISOString(),
        updated: updated.toISOString()
      });
    }

    // Build hierarchical structure
    const categories = buildCategoryStructure(flatFiles);

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

/**
 * Fetch full parsed document using static imports
 */
export function useMemoryBankDocument(category: string, file: string) {
  const modules = import.meta.glob('/memory-bank/**/*.md', { as: 'raw', eager: true });
  
  return useMemo(() => {
    let filePath: string;
    if (category === "root") {
      // Root level file
      filePath = `/memory-bank/${file}`;
    } else {
      // File in subdirectory (could be nested)
      const fileName = file.endsWith('.md') ? file : `${file}.md`;
      filePath = `/memory-bank/${category}/${fileName}`;
    }
    
    const content = modules[filePath] as string;
    
    if (!content) {
      return undefined;
    }

    return {
      fileName: file,
      filePath: `${category}/${file}`,
      title: extractTitle(content) || file.replace('.md', ''),
      created: extractDate(content)?.toISOString() || new Date().toISOString(),
      updated: extractDate(content)?.toISOString() || new Date().toISOString(),
      sections: parseSections(content),
      content
    } as ParsedDocument;
  }, [category, file]);
}

/**
 * Search memory bank documents using static imports
 */
export function useMemoryBankSearch(query: string) {
  const { categories } = useMemoryBankDocs();
  
  return useMemo(() => {
    if (query.length < 2) return { query, resultCount: 0, results: [] };
    
    const modules = import.meta.glob('/memory-bank/**/*.md', { as: 'raw', eager: true });
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [path, content] of Object.entries(modules)) {
      const relativePath = path.replace('/memory-bank/', '');
      const fileName = relativePath.split('/').pop() || '';
      const title = extractTitle(content as string) || fileName.replace('.md', '');
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
    }
    
    return {
      query,
      resultCount: results.length,
      results
    };
  }, [categories, query]);
}