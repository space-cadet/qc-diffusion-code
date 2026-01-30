/**
 * FileGridItem Component
 * T29a: Compact card — inline icon with title, content preview for files,
 *       child count for folders. No oversized icon container.
 */

import type { IndexCategory, IndexFile } from "../hooks/useMemoryBankDocs";

interface FileGridItemProps {
  item: IndexCategory | IndexFile;
  isFolder: boolean;
  onFolderClick?: (folderName: string) => void;
  onFileClick?: (filePath: string) => void;
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function isCategory(item: any): item is IndexCategory {
  return "subcategories" in item && "displayName" in item;
}

export function FileGridItem({ item, isFolder, onFolderClick, onFileClick }: FileGridItemProps) {
  const category = isCategory(item) ? item : null;
  const file = !isFolder ? (item as IndexFile) : null;

  const itemCount = category
    ? (category.subcategories?.length || 0) + (category.files?.length || 0)
    : null;

  const createdDate = file
    ? new Date(file.created).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "2-digit",
      })
    : null;

  const handleClick = () => {
    if (isFolder && category) {
      console.log("[MemoryBank:GridItem] folder:", category.name);
      onFolderClick?.(category.name);
    } else if (file) {
      console.log("[MemoryBank:GridItem] file:", file.filePath);
      onFileClick?.(file.filePath);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer flex flex-col gap-2"
    >
      {/* Header: icon + title */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isFolder ? "bg-blue-100" : "bg-blue-50"
          }`}
        >
          {isFolder ? (
            <FolderIcon className="w-4 h-4 text-blue-600" />
          ) : (
            <FileTextIcon className="w-4 h-4 text-blue-600" />
          )}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 truncate leading-tight">
          {category?.displayName || file?.title || "Untitled"}
        </h3>
      </div>

      {/* Body: preview info */}
      <div className="text-xs text-gray-500 leading-relaxed">
        {isFolder && itemCount !== null && (
          <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
        )}
        {!isFolder && file && <span>{createdDate}</span>}
      </div>
    </div>
  );
}
