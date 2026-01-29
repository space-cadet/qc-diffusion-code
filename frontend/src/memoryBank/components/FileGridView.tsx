/**
 * FileGridView Component
 * Displays memory bank files and folders in a responsive grid layout
 * with breadcrumb navigation and folder traversal
 */

import { useFolderNavigation } from "../hooks/useFolderNavigation";
import { FileGridItem } from "./FileGridItem";

interface FileGridViewProps {
  onSelectDoc: (filePath: string) => void;
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

export function FileGridView({ onSelectDoc }: FileGridViewProps) {
  const {
    currentPath,
    breadcrumbs,
    folderContent,
    navigateToFolder,
    navigateToBreadcrumb
  } = useFolderNavigation("root");

  console.log("[FileGridView] rendering - path:", currentPath);

  return (
    <div className="h-full overflow-y-auto bg-white flex flex-col">
      {/* Breadcrumb Navigation - Non-sticky */}
      <div className="border-b border-gray-200 px-6 py-3 bg-white">
        <div className="flex items-center gap-1 flex-wrap">
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.path} className="flex items-center gap-1">
              <button
                onClick={() => navigateToBreadcrumb(crumb.path)}
                className={`text-xs uppercase tracking-wide transition-colors font-medium ${
                  currentPath === crumb.path
                    ? "text-blue-600"
                    : "text-gray-400 hover:text-gray-600"
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
      </div>

      {/* Grid Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty State */}
        {folderContent.folders.length === 0 &&
          folderContent.files.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Empty Folder
                </h3>
                <p className="text-gray-600">No files or folders here</p>
              </div>
            </div>
          )}

        {/* Grid Content */}
        {(folderContent.folders.length > 0 ||
          folderContent.files.length > 0) && (
          <div className="p-6">
            {/* Folders Section */}
            {folderContent.folders.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs uppercase tracking-widest font-semibold text-gray-600 mb-4">
                  Folders ({folderContent.folders.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {folderContent.folders.map(folder => (
                    <FileGridItem
                      key={folder.name}
                      item={folder}
                      isFolder={true}
                      onFolderClick={navigateToFolder}
                      onFileClick={onSelectDoc}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Files Section */}
            {folderContent.files.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-widest font-semibold text-gray-600 mb-4">
                  Files ({folderContent.files.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {folderContent.files.map(file => (
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