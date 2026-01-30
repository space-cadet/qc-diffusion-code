/**
 * FileListItem Component
 * T29a: Cleaned up — removed fake file size, added diagnostic logging.
 */

import type { IndexCategory, IndexFile } from "../hooks/useMemoryBankDocs";

interface FileListItemProps {
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

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function isCategory(item: any): item is IndexCategory {
  return "subcategories" in item && "displayName" in item;
}

export function FileListItem({ item, isFolder, onFolderClick, onFileClick }: FileListItemProps) {
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
      console.log("[MemoryBank:ListItem] folder:", category.name);
      onFolderClick?.(category.name);
    } else if (file) {
      console.log("[MemoryBank:ListItem] file:", file.filePath);
      onFileClick?.(file.filePath);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isFolder ? "bg-blue-100" : "bg-blue-50"
          }`}
        >
          {isFolder ? (
            <FolderIcon className="w-5 h-5 text-blue-600" />
          ) : (
            <FileTextIcon className="w-5 h-5 text-blue-600" />
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {category?.displayName || file?.title || "Untitled"}
          </h3>
          <div className="flex items-center gap-4 mt-0.5">
            {isFolder && itemCount !== null && (
              <p className="text-xs text-gray-500">
                {itemCount} item{itemCount !== 1 ? "s" : ""}
              </p>
            )}
            {!isFolder && file && (
              <p className="text-xs text-gray-500">{createdDate}</p>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </div>
    </div>
  );
}
