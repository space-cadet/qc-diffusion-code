/**
 * FileListView Component
 * T29a: Table layout with sortable columns (Name, Date Modified, Size, Kind)
 */

import { useFolderNavigation } from "../hooks/useFolderNavigation";
import { FileListItem } from "./FileListItem";
import { ViewModeToggle } from "../pages/MemoryBankPage";
import { SearchBar } from "./SearchBar";
import { useState } from "react";

interface FileListViewProps {
  onSelectDoc: (filePath: string) => void;
  viewMode: "tree" | "grid" | "list";
  setViewMode: (v: "tree" | "grid" | "list") => void;
}

type SortField = "name" | "modified" | "size" | "kind";
type SortOrder = "asc" | "desc";

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function SortIcon({ direction }: { direction: "asc" | "desc" }) {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {direction === "asc" ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
}

export function FileListView({ onSelectDoc, viewMode, setViewMode }: FileListViewProps) {
  const {
    currentPath,
    breadcrumbs,
    folderContent,
    navigateToFolder,
    navigateToBreadcrumb,
  } = useFolderNavigation("root");

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showDetails, setShowDetails] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortItems = (items: any[], isFolder: boolean) => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === "name") {
        comparison = (a.displayName || a.title || a.name).localeCompare(b.displayName || b.title || b.name);
      } else if (sortField === "modified" && !isFolder) {
        const aDate = a.modified ? new Date(a.modified).getTime() : 0;
        const bDate = b.modified ? new Date(b.modified).getTime() : 0;
        comparison = aDate - bDate;
      } else if (sortField === "size" && !isFolder) {
        const aSize = a.size || 0;
        const bSize = b.size || 0;
        comparison = aSize - bSize;
      } else if (sortField === "kind" && !isFolder) {
        comparison = (a.mimeType || "").localeCompare(b.mimeType || "");
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  const sortedFolders = sortItems(folderContent.folders, true);
  const sortedFiles = sortItems(folderContent.files, false);

  console.log("[MemoryBank:ListView] path:", currentPath);

  return (
    <div className="h-full overflow-y-auto bg-white flex flex-col">
      {/* Breadcrumb bar with view toggle */}
      <div className="border-b border-gray-200 px-4 py-2 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.path} className="flex items-center gap-1">
                <button
                  onClick={() => navigateToBreadcrumb(crumb.path)}
                  className={`text-xs uppercase tracking-wide transition-colors font-medium ${
                    currentPath === crumb.path ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {crumb.displayName}
                </button>
                {idx < breadcrumbs.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:block w-48">
              <SearchBar onSelectResult={onSelectDoc} compact />
            </div>
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                showDetails
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={showDetails ? "Show names only" : "Show details"}
            >
              {showDetails ? "Details" : "Names"}
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto">
        {(sortedFolders.length > 0 || sortedFiles.length > 0) ? (
          <div className="max-w-5xl mx-auto">
            {showDetails && (
              /* Table Header */
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="col-span-4 flex items-center gap-1 cursor-pointer hover:text-gray-800" onClick={() => handleSort("name")}>
                  Name
                  {sortField === "name" && <SortIcon direction={sortOrder} />}
                </div>
                <div className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-gray-800" onClick={() => handleSort("modified")}>
                  Date Modified
                  {sortField === "modified" && <SortIcon direction={sortOrder} />}
                </div>
                <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-800" onClick={() => handleSort("size")}>
                  Size
                  {sortField === "size" && <SortIcon direction={sortOrder} />}
                </div>
                <div className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-gray-800" onClick={() => handleSort("kind")}>
                  Kind
                  {sortField === "kind" && <SortIcon direction={sortOrder} />}
                </div>
              </div>
            )}

            {/* Folders */}
            {sortedFolders.map((folder) => (
              <FileListItem
                key={folder.name}
                item={folder}
                isFolder
                showDetails={showDetails}
                onFolderClick={navigateToFolder}
                onFileClick={onSelectDoc}
              />
            ))}

            {/* Files */}
            {sortedFiles.map((file) => (
              <FileListItem
                key={file.filePath}
                item={file}
                isFolder={false}
                showDetails={showDetails}
                onFolderClick={navigateToFolder}
                onFileClick={onSelectDoc}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Empty Folder</h3>
              <p className="text-gray-600">No files or folders here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
