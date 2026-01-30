/**
 * FileGridView Component
 * T29a: View toggle inline with breadcrumbs, max-width constraint,
 *       denser grid (sm:3 lg:4 xl:5), search bar included.
 */

import { useFolderNavigation } from "../hooks/useFolderNavigation";
import { FileGridItem } from "./FileGridItem";
import { ViewModeToggle } from "../pages/MemoryBankPage";
import { SearchBar } from "./SearchBar";

interface FileGridViewProps {
  onSelectDoc: (filePath: string) => void;
  viewMode: "tree" | "grid" | "list";
  setViewMode: (v: "tree" | "grid" | "list") => void;
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function FileGridView({ onSelectDoc, viewMode, setViewMode }: FileGridViewProps) {
  const {
    currentPath,
    breadcrumbs,
    folderContent,
    navigateToFolder,
    navigateToBreadcrumb,
  } = useFolderNavigation("root");

  console.log("[MemoryBank:GridView] path:", currentPath);

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
          </div>
        </div>
      </div>

      {/* Grid Content Area */}
      <div className="flex-1 overflow-y-auto">
        {folderContent.folders.length === 0 && folderContent.files.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Empty Folder</h3>
              <p className="text-gray-600">No files or folders here</p>
            </div>
          </div>
        )}

        {(folderContent.folders.length > 0 || folderContent.files.length > 0) && (
          <div className="p-4 max-w-5xl mx-auto">
            {folderContent.folders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs uppercase tracking-widest font-semibold text-gray-600 mb-3">
                  Folders ({folderContent.folders.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {folderContent.folders.map((folder) => (
                    <FileGridItem
                      key={folder.name}
                      item={folder}
                      isFolder
                      onFolderClick={navigateToFolder}
                      onFileClick={onSelectDoc}
                    />
                  ))}
                </div>
              </div>
            )}

            {folderContent.files.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-widest font-semibold text-gray-600 mb-3">
                  Files ({folderContent.files.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {folderContent.files.map((file) => (
                    <FileGridItem
                      key={file.filePath}
                      item={file}
                      isFolder={false}
                      onFolderClick={navigateToFolder}
                      onFileClick={onSelectDoc}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
