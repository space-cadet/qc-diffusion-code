/**
 * FileListItem Component
 * T29a: Table layout with columns (Name, Date Modified, Size, Kind)
 */

import type { IndexCategory, IndexFile } from "../hooks/useMemoryBankDocs";
import { formatFileSize, getFileKind } from "../utils/fileTypeUtils";

interface FileListItemProps {
  item: IndexCategory | IndexFile;
  isFolder: boolean;
  showDetails?: boolean;
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

export function FileListItem({ item, isFolder, showDetails = true, onFolderClick, onFileClick }: FileListItemProps) {
  const category = isCategory(item) ? item : null;
  const file = !isFolder ? (item as IndexFile) : null;

  const itemCount = category
    ? (category.subcategories?.length || 0) + (category.files?.length || 0)
    : null;

  const modifiedDate = file?.modified
    ? new Date(file.modified).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const fileSize = file?.size ? formatFileSize(file.size) : null;
  const fileKind = file?.mimeType ? getFileKind(file.fileName || file.title) : null;

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
      <div className={`grid gap-2 px-4 py-3 items-center ${showDetails ? 'grid-cols-12' : 'grid-cols-1'}`}>
        {/* Name column */}
        <div className={`flex items-center gap-3 min-w-0 ${showDetails ? 'col-span-4' : ''}`}>
          {/* Icon */}
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
          {/* Name */}
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {category?.displayName || file?.title || "Untitled"}
          </h3>
        </div>

        {/* Details columns - only shown when showDetails is true */}
        {showDetails && (
          <>
            {/* Date Modified column */}
            <div className="col-span-3 text-xs text-gray-500">
              {isFolder && itemCount !== null && (
                <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
              )}
              {!isFolder && file && modifiedDate && (
                <span>{modifiedDate}</span>
              )}
            </div>

            {/* Size column */}
            <div className="col-span-2 text-xs text-gray-500">
              {!isFolder && file && fileSize && (
                <span>{fileSize}</span>
              )}
            </div>

            {/* Kind column */}
            <div className="col-span-3 text-xs text-gray-500">
              {!isFolder && file && fileKind && (
                <span>{fileKind}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
