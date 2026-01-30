/**
 * SearchBar Component
 * T29a: Added folder path display in search results, compact mode prop.
 */

import { useState } from "react";
import { useMemoryBankSearch } from "../hooks/useMemoryBankDocs";
import type { SearchResult } from "../hooks/useMemoryBankDocs";

interface SearchBarProps {
  onSelectResult: (filePath: string) => void;
  /** Compact mode — smaller input, no bottom margin */
  compact?: boolean;
}

export function SearchBar({ onSelectResult, compact }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const searchData = useMemoryBankSearch(query);

  const handleSelectResult = (result: SearchResult) => {
    const parts = result.filePath.split("/");
    const category = parts[0];
    const fileName = parts.slice(1).join("/").replace(/\.md$/, "") || parts[0].replace(/\.md$/, "");

    console.log("[MemoryBank:Search] selected:", result.filePath);
    onSelectResult(parts.length > 1 ? `${category}/${fileName}` : fileName);
    setShowResults(false);
    setQuery("");
  };

  /** Derive folder path from filePath for display */
  const getFolderPath = (filePath: string): string | null => {
    const parts = filePath.split("/");
    if (parts.length <= 1) return "Root Files";
    return parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, " ")).join(" > ");
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        placeholder="Search memory bank..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowResults(e.target.value.length > 0);
        }}
        onFocus={() => setShowResults(query.length > 0)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        className={`w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          compact ? "px-2 py-1 text-xs" : "px-3 py-2 mb-0"
        }`}
      />

      {showResults && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {searchData && searchData.resultCount === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">No results found</div>
          )}

          {searchData && searchData.results.length > 0 && (
            <div className="divide-y divide-gray-200">
              {searchData.results.map((result: SearchResult, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleSelectResult(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {result.title}
                      </div>
                      {/* Folder path */}
                      <div className="text-xs text-gray-400 mt-0.5 truncate">
                        {getFolderPath(result.filePath)}
                      </div>
                      {result.section && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          → {result.section}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {result.context}
                      </div>
                    </div>
                    <div className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded whitespace-nowrap flex-shrink-0">
                      {result.matchType}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
