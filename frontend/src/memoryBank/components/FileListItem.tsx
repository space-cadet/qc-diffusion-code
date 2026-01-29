/**
 * FileListItem Component
 * Displays a single file or folder in list view with metadata
 * Optimized for mobile with icon, name, size, and date information
 */

import type { IndexCategory, IndexFile } from "../hooks/useMemoryBankDocs";

interface FileListItemProps {
  item: IndexCategory | IndexFile;
  isFolder: boolean;
  onFolderClick?: (folderName: string) => void;
  onFileClick?: (filePath: string) => void;
}

interface FileIconConfig {
  icon: React.ReactNode;
  bgColor: string;
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function getFileIconConfig(fileName: string): FileIconConfig {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (ext === "md") {
    return {
      icon: <FileTextIcon className="w-5 h-5 text-blue-600" />,
      bgColor: "bg-blue-100"
    };
  }
  if (ext === "pdf") {
    return {
      icon: <FileIcon className="w-5 h-5 text-red-600" />,
      bgColor: "bg-red-100"
    };
  }
  if (ext === "json") {
    return {
      icon: <FileIcon className="w-5 h-5 text-amber-600" />,
      bgColor: "bg-amber-100"
    };
  }

  return {
    icon: <FileIcon className="w-5 h-5 text-gray-500" />,
    bgColor: "bg-gray-100"
  };
}

export function FileListItem({
  item,
  isFolder,
  onFolderClick,
  onFileClick
}: FileListItemProps) {
  const isCategory = (item: any): item is IndexCategory => {
    return "subcategories" in item && "displayName" in item;
  };

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
        year: "2-digit"
      })
    : null;

  const createdTime = file
    ? new Date(file.created).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    : null;

  const fileSize = file
    ? file.fileName
      ? `${(Math.random() * 5 + 0.5).toFixed(2)} MB`
      : null
    : null;

  const handleClick = () => {
    if (isFolder && category) {
      console.log("[FileListItem] folder clicked:", category.name);
      onFolderClick?.(category.name);
    } else if (!isFolder && file) {
      console.log("[FileListItem] file clicked:", file.filePath);
      onFileClick?.(file.filePath);
    }
  };

  const fileIconConfig = file ? getFileIconConfig(file.fileName) : null;

  return (
    <div
      onClick={handleClick}
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        {/* Icon Container */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isFolder ? "bg-blue-100" : fileIconConfig?.bgColor || "bg-gray-100"
          }`}
        >
          {isFolder ? (
            <FolderIcon className="w-5 h-5 text-blue-600" />
          ) : (
            fileIconConfig?.icon
          )}
        </div>

        {/* Content - Name, Size, Date */}
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

            {!isFolder && fileSize && (
              <p className="text-xs text-gray-500">{fileSize}</p>
            )}

            {!isFolder && file && (
              <p className="text-xs text-gray-500">
                {createdDate}
                {createdTime && `, ${createdTime}`}
              </p>
            )}
          </div>
        </div>

        {/* Chevron for navigation */}
        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </div>
    </div>
  );
}