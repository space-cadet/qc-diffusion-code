/**
 * MemoryBank Page
 * Main entry point for the memory bank documentation viewer
 * T29a: Reorganized layout — view toggles inline with breadcrumbs,
 *       slide-over panel for grid/list file preview,
 *       sidebar auto-collapse on mobile file select.
 */

import { useState, useCallback, useEffect } from "react";
import { usePersistedState } from "../hooks/usePersistedState";
import { SearchBar } from "../components/SearchBar";
import { Sidebar } from "../components/Sidebar";
import { Viewer } from "../components/Viewer";
import { FileGridView } from "../components/FileGridView";
import { FileListView } from "../components/FileListView";
import type { DocSelection } from "../types";

/* ── Icon components ──────────────────────────────────── */

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M1 6h1M1 12h1M1 18h1" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/* ── View-mode toggle (shared across views) ───────────── */

export function ViewModeToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: "tree" | "grid" | "list";
  setViewMode: (v: "tree" | "grid" | "list") => void;
}) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
      {([
        { mode: "tree" as const, Icon: MenuIcon, title: "Tree view" },
        { mode: "list" as const, Icon: ListIcon, title: "List view" },
        { mode: "grid" as const, Icon: GridIcon, title: "Grid view" },
      ]).map(({ mode, Icon, title }) => (
        <button
          key={mode}
          onClick={() => { console.log("[MemoryBank] view mode →", mode); setViewMode(mode); }}
          className={`p-1.5 rounded-md transition-colors ${
            viewMode === mode
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
          title={title}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────── */

export function MemoryBankPage() {
  const [selectedDoc, setSelectedDoc] = usePersistedState<DocSelection | null>("memory-bank.selectedDoc", null);
  const [isCollapsed, setIsCollapsed] = usePersistedState("memory-bank.sidebarCollapsed", false);
  const [sidebarWidth, setSidebarWidth] = usePersistedState("memory-bank.sidebarWidth", 256);
  const [viewMode, setViewMode] = usePersistedState<"tree" | "grid" | "list">("memory-bank.viewMode", "tree");

  // Slide-over panel state for grid/list file preview
  const [slideOverDoc, setSlideOverDoc] = useState<DocSelection | null>(null);

  // Detect mobile (<768 px)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* Derive DocSelection from a filePath string */
  const toDocSelection = useCallback((filePath: string): DocSelection => {
    const parts = filePath.split("/");
    if (parts.length === 1) return { category: "root", file: parts[0] };
    return { category: parts[0], file: parts.slice(1).join("/") };
  }, []);

  /* Tree-view file selection (sidebar) */
  const handleSelectDoc = useCallback(
    (filePath: string) => {
      console.log("[MemoryBank] select doc:", filePath);
      setSelectedDoc(toDocSelection(filePath));
      // Auto-collapse sidebar on mobile
      if (isMobile) {
        console.log("[MemoryBank] auto-collapsing sidebar (mobile)");
        setIsCollapsed(true);
      }
    },
    [toDocSelection, isMobile, setSelectedDoc, setIsCollapsed],
  );

  /* Grid/List file selection → open slide-over */
  const handleGridListFileSelect = useCallback(
    (filePath: string) => {
      console.log("[MemoryBank] slide-over open:", filePath);
      setSlideOverDoc(toDocSelection(filePath));
    },
    [toDocSelection],
  );

  const handleSearchResult = useCallback(
    (filePath: string) => {
      if (viewMode === "tree") {
        handleSelectDoc(filePath);
      } else {
        handleGridListFileSelect(filePath);
      }
    },
    [viewMode, handleSelectDoc, handleGridListFileSelect],
  );

  /* Sidebar resize */
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      const w = startWidth + (ev.clientX - startX);
      if (w >= 200 && w <= 500) setSidebarWidth(w);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* Main Content — no separate header row for view toggles */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Sidebar (tree view only) ─────────────────── */}
        {viewMode === "tree" && (
          <div
            className={`${isCollapsed ? "md:w-0 w-full" : ""} border-r border-gray-200 bg-white overflow-hidden flex flex-col transition-all duration-300 md:relative absolute z-10 h-full`}
            style={{ width: isCollapsed ? 0 : sidebarWidth }}
          >
            {!isCollapsed && (
              <>
                {/* Sidebar header: title + view toggle + search */}
                <div className="p-3 border-b border-gray-200 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
                      Memory Bank
                    </span>
                    <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
                  </div>
                  <SearchBar onSelectResult={handleSearchResult} />
                </div>
                <Sidebar
                  selectedDoc={selectedDoc ? `${selectedDoc.category}/${selectedDoc.file}` : null}
                  onSelectDoc={handleSelectDoc}
                />
              </>
            )}
          </div>
        )}

        {/* Mobile overlay (tree) */}
        {viewMode === "tree" && !isCollapsed && (
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-0"
            onClick={() => setIsCollapsed(true)}
          />
        )}

        {/* Resize handle (tree, desktop) */}
        {viewMode === "tree" && !isCollapsed && (
          <div
            className="hidden md:block w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize transition-colors"
            onMouseDown={handleMouseDown}
            title="Drag to resize"
          />
        )}

        {/* Collapse / expand toggle (tree, desktop) */}
        {viewMode === "tree" && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex w-6 bg-gray-50 hover:bg-gray-100 border-x border-gray-200 items-center justify-center transition-colors flex-shrink-0"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}

        {/* ── Main content area ────────────────────────── */}
        <div className="flex-1 bg-white overflow-hidden relative z-0 flex">
          <div className="flex-1 overflow-hidden">
            {viewMode === "tree" ? (
              selectedDoc ? (
                <Viewer category={selectedDoc.category} file={selectedDoc.file} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📚</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Memory Bank</h2>
                    <p className="text-gray-600 max-w-md">Select a document from the sidebar or search to get started.</p>
                  </div>
                </div>
              )
            ) : viewMode === "list" ? (
              <FileListView
                onSelectDoc={handleGridListFileSelect}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />
            ) : (
              <FileGridView
                onSelectDoc={handleGridListFileSelect}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />
            )}
          </div>

          {/* ── Slide-over panel (grid/list file preview) */}
          {viewMode !== "tree" && slideOverDoc && (
            <>
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black bg-opacity-20 z-10"
                onClick={() => { console.log("[MemoryBank] slide-over close"); setSlideOverDoc(null); }}
              />
              {/* Panel */}
              <div className="absolute right-0 top-0 bottom-0 w-full md:w-2/3 lg:w-1/2 bg-white border-l border-gray-200 shadow-2xl z-20 flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700 truncate">
                    {slideOverDoc.category === "root" ? slideOverDoc.file : `${slideOverDoc.category}/${slideOverDoc.file}`}
                  </span>
                  <button
                    onClick={() => setSlideOverDoc(null)}
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    title="Close"
                  >
                    <CloseIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Viewer category={slideOverDoc.category} file={slideOverDoc.file} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
