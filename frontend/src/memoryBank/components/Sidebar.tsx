/**
 * Sidebar Component
 * Navigation tree for memory bank categories and documents
 */

import { useState } from "react";
import { useMemoryBankDocs } from "../hooks/useMemoryBankDocs";
import type { IndexCategory, IndexFile } from "../hooks/useMemoryBankDocs";

interface SidebarProps {
  selectedDoc: string | null;
  onSelectDoc: (filePath: string) => void;
}

interface CategoryItemProps {
  category: IndexCategory;
  selectedDoc: string | null;
  onSelectDoc: (filePath: string) => void;
  level?: number;
  parentStickyTop?: number;
}

function ChevronRight({ className, rotated }: { className?: string; rotated?: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${rotated ? "rotate-90" : ""} ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CategoryItem({ category, selectedDoc, onSelectDoc, level = 0, parentStickyTop = 0 }: CategoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Auto-expand first level categories
    return level === 0;
  });

  const toggleCategory = () => {
    setIsExpanded(!isExpanded);
  };

  const hasSubcategories = category.subcategories && category.subcategories.length > 0;
  const hasFiles = category.files && category.files.length > 0;
  const totalItems = (category.subcategories?.length || 0) + (category.files?.length || 0);
  const isSelected = selectedDoc?.startsWith(category.name + "/");
  
  // Calculate sticky position based on nesting level
  const stickyTop = parentStickyTop + (level * 48); // 48px per level (header height)
  const zIndex = 20 - level; // Higher z-index for parent categories

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {/* Sticky Header with cascading positioning */}
      <div 
        className="bg-white border-b border-gray-100"
        style={{ 
          position: 'sticky', 
          top: `${stickyTop}px`,
          zIndex: zIndex 
        }}
      >
        <button
          onClick={toggleCategory}
          className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors ${
            isSelected ? "bg-blue-50" : ""
          }`}
          style={{ paddingLeft: `${level * 16 + 16}px` }}
        >
          {(hasSubcategories || hasFiles) && (
            <ChevronRight rotated={isExpanded} />
          )}
          <span className="font-semibold text-sm text-gray-900">
            {category.displayName}
          </span>
          <span className="ml-auto text-xs text-gray-500">
            {totalItems}
          </span>
        </button>
      </div>

      {isExpanded && (
        <div className="bg-gray-50">
          {/* Render subcategories */}
          {category.subcategories?.map((subcategory) => (
            <CategoryItem
              key={subcategory.name}
              category={subcategory}
              selectedDoc={selectedDoc}
              onSelectDoc={onSelectDoc}
              level={level + 1}
              parentStickyTop={stickyTop}
            />
          ))}

          {/* Render files */}
          {category.files.map((file: IndexFile) => {
            const filePath = file.filePath;
            const isCurrentSelected = selectedDoc === filePath;

            return (
              <button
                key={file.filePath}
                onClick={() => onSelectDoc(filePath)}
                className={`w-full text-left px-8 py-2 text-sm transition-colors hover:bg-gray-100 ${
                  isCurrentSelected
                    ? "bg-blue-100 text-blue-900 font-semibold"
                    : "text-gray-700"
                }`}
                style={{ paddingLeft: `${(level + 1) * 16 + 32}px` }}
                title={file.title}
              >
                <div className="truncate">{file.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date(file.created).toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ selectedDoc, onSelectDoc }: SidebarProps) {
  const memoryBankData = useMemoryBankDocs();

  if (!memoryBankData || memoryBankData.categories.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        No documents found
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {memoryBankData.categories.map((category: IndexCategory) => (
        <CategoryItem
          key={category.name}
          category={category}
          selectedDoc={selectedDoc}
          onSelectDoc={onSelectDoc}
        />
      ))}
    </div>
  );
}