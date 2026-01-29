/**
 * FileGridItem Component
 * Displays a single file or folder in grid view with metadata
 * Styled like Google Files with colored icon backgrounds
 */

import type { IndexCategory, IndexFile } from "../hooks/useMemoryBankDocs";

interface FileGridItemProps {
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

function getFileIconConfig(fileName: string): FileIconConfig {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (ext === "md") {
    return {
      icon: <FileTextIcon className="w-6 h-6 text-blue-600" />,
      bgColor: "bg-blue-100"
    };
  }
  if (ext === "pdf") {
    return {
      icon: <FileIcon className="w-6 h-6 text-red-600" />,
      bgColor: "bg-red-100"
    };
  }
  if (ext === "json") {
    return {
      icon: <FileIcon className="w-6 h-6 text-amber-600" />,
      bgColor: "bg-amber-100"
    };
  }

  return {
    icon: <FileIcon className="w-6 h-6 text-gray-500" />,
    bgColor: "bg-gray-100"
  };
}

export function FileGridItem({
  item,
  isFolder,
  onFolderClick,
  onFileClick
}: FileGridItemProps) {
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

  const handleClick = () => {
    if (isFolder && category) {
      console.log("[FileGridItem] folder clicked:", category.name);
      onFolderClick?.(category.name);
    } else if (!isFolder && file) {
      console.log("[FileGridItem] file clicked:", file.filePath);
      onFileClick?.(file.filePath);
    }
  };

  const fileIconConfig = file ? getFileIconConfig(file.fileName) : null;

  return (
    <div
      onClick={handleClick}
      className="p-4 rounded-xl bg-white hover:bg-gray-50 transition-all cursor-pointer"
    >
      {/* Icon Container - Google Files style with colored background */}
      <div className="flex items-center justify-center mb-4 h-24 bg-blue-50 rounded-xl">
        {isFolder ? (
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <FolderIcon className="w-7 h-7 text-blue-600" />
          </div>
        ) : file && fileIconConfig ? (
          <div className={`w-12 h-12 rounded-xl ${fileIconConfig.bgColor} flex items-center justify-center`}>
            {fileIconConfig.icon}
          </div>
        ) : null}
      </div>

      {/* Title */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900 truncate leading-snug">
          {category?.displayName || file?.title || "Untitled"}
        </h3>
      </div>

      {/* Metadata - Stacked like Google Files */}
      <div className="space-y-0.5 text-xs text-gray-500">
        {isFolder && itemCount !== null && (
          <p>{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
        )}

        {!isFolder && file && <p>{createdDate}</p>}

        {isFolder && category && (
          <p>
            {new Date(category.files?.[0]?.created || new Date()).toLocaleDateString(
              "en-IN",
              {
                timeZone: "Asia/Kolkata",
                day: "numeric",
                month: "short",
                year: "2-digit"
              }
            )}
          </p>
        )}
      </div>
    </div>
  );
}