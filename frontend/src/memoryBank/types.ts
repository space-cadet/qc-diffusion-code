/**
 * Memory Bank Types
 * Defines data structures for memory bank documentation system
 */

export interface ParsedDoc {
  fileName: string;
  filePath: string;
  title: string;
  created: Date;
  updated: Date;
  frontmatter: Record<string, any>;
  sections: Section[];
  content: string;
  searchIndex: string;
  size?: number;
  mimeType?: string;
  modified?: Date;
}

export interface Section {
  id: string;
  level: number;
  title: string;
  content: string;
}

export interface DocCategory {
  name: string;
  displayName: string;
  files: ParsedDoc[];
  subcategories?: DocCategory[];
}

export interface MemoryBankIndex {
  files: Map<string, ParsedDoc>;
  categories: Map<string, DocCategory>;
  lastUpdated: Date;
}

export interface SearchEntry {
  fileName: string;
  filePath: string;
  title: string;
  section?: string;
  context: string;
  matchType: "title" | "section" | "content";
}

export interface DocSelection {
  category: string;
  file: string;
}

export type ViewMode = 'tree' | 'grid' | 'list';

export type MemoryBankContextType = {
  docs: MemoryBankIndex | null;
  selectedDoc: DocSelection | null;
  setSelectedDoc: (doc: DocSelection | null) => void;
  isLoading: boolean;
  error: Error | null;
};