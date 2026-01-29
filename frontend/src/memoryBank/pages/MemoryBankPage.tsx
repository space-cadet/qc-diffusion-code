/**
 * MemoryBank Page
 * Main entry point for the memory bank documentation website
 */

import { useState } from "react";
import { usePersistedState } from "../hooks/usePersistedState";
import { SearchBar } from "../components/SearchBar";
import { Sidebar } from "../components/Sidebar";
import { Viewer } from "../components/Viewer";
import { FileGridView } from "../components/FileGridView";
import { FileListView } from "../components/FileListView";
import type { DocSelection } from "../types";

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M1 6h1M1 12h1M1 18h1" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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

export function MemoryBankPage() {
  const [selectedDoc, setSelectedDoc] = usePersistedState('memory-bank.selectedDoc', null as DocSelection | null);
  const [isCollapsed, setIsCollapsed] = usePersistedState('memory-bank.sidebarCollapsed', false);
  const [sidebarWidth, setSidebarWidth] = usePersistedState('memory-bank.sidebarWidth', 256);
  const [viewMode, setViewMode] = usePersistedState<'tree' | 'grid' | 'list'>('memory-bank.viewMode', 'tree');

  const handleSelectDoc = (filePath: string) => {
    const parts = filePath.split("/");
    
    if (parts.length === 1) {
      // Root level file (e.g., "activeContext.md")
      setSelectedDoc({ category: "root", file: parts[0] });
    } else {
      // File in subdirectory (could be nested like "implementation-details/subfolder/file.md")
      const category = parts[0];
      const file = parts.slice(1).join('/'); // Keep the full subfolder path
      setSelectedDoc({ category, file });
    }
  };

  const handleSearchResult = (filePath: string) => {
    handleSelectDoc(filePath);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX);
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* Minimal Header - View Toggle Only */}
      <div className="border-b border-gray-200 px-4 py-2 bg-white">
        <div className="flex items-center justify-between">
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="md:hidden bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 flex items-center justify-center transition-colors"
            title={isCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            <MenuIcon className="w-5 h-5 text-gray-600" />
          </button>

          {/* Spacer for desktop */}
          <div className="hidden md:block" />

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'tree'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Tree view"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="List view"
            >
              <ListIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Grid view"
            >
              <GridIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Only show in tree view */}
        {viewMode === 'tree' && (
          <div
            className={`${isCollapsed ? 'md:w-0 w-full' : ''} border-r border-gray-200 bg-white overflow-hidden flex flex-col transition-all duration-300 md:relative absolute z-10 h-full`}
            style={{ width: isCollapsed ? 0 : sidebarWidth }}
          >
            {!isCollapsed && (
              <>
                <div className="p-4 border-b border-gray-200">
                  <SearchBar onSelectResult={handleSearchResult} />
                </div>
                <Sidebar
                  selectedDoc={
                    selectedDoc
                      ? `${selectedDoc.category}/${selectedDoc.file}`
                      : null
                  }
                  onSelectDoc={handleSelectDoc}
                />
              </>
            )}
          </div>
        )}

        {/* Mobile Overlay - Only in tree view */}
        {viewMode === 'tree' && isCollapsed === false && (
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-0"
            onClick={() => setIsCollapsed(true)}
          />
        )}

        {/* Resize Handle - Tablet and Desktop Only - Only in tree view */}
        {viewMode === 'tree' && !isCollapsed && (
          <div
            className="hidden md:block w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize transition-colors"
            onMouseDown={handleMouseDown}
            title="Drag to resize"
          />
        )}

        {/* Desktop/Tablet Collapse Toggle - Only in tree view */}
        {viewMode === 'tree' && !isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:block w-8 bg-gray-50 hover:bg-gray-100 border-l border-gray-200 flex items-center justify-center transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {/* Desktop/Tablet Expand Toggle - Only in tree view */}
        {viewMode === 'tree' && isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:block w-8 bg-gray-50 hover:bg-gray-100 border-l border-gray-200 flex items-center justify-center transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {/* Main Content Area */}
        <div className="flex-1 bg-white overflow-hidden relative z-0">
          {viewMode === 'tree' ? (
            // Tree View - Show Viewer
            <>
              {selectedDoc ? (
                <Viewer
                  category={selectedDoc.category}
                  file={selectedDoc.file}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📚</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Welcome to Memory Bank
                    </h2>
                    <p className="text-gray-600 max-w-md">
                      Select a document from the sidebar or search to get started.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : viewMode === 'list' ? (
            // List View - Show FileListView
            <FileListView onSelectDoc={handleSelectDoc} />
          ) : (
            // Grid View - Show FileGridView
            <FileGridView onSelectDoc={handleSelectDoc} />
          )}
        </div>
      </div>
    </div>
  );
}