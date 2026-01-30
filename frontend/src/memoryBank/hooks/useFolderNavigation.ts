/**
 * useFolderNavigation Hook
 * Manages folder/breadcrumb navigation state for grid view
 * Supports hierarchical folder traversal with breadcrumb trail
 */

import { useState, useMemo } from "react";
import { useMemoryBankDocs } from "./useMemoryBankDocs";
import type { IndexCategory, IndexFile } from "./useMemoryBankDocs";

export interface BreadcrumbItem {
  name: string;
  displayName: string;
  path: string;
}

export interface FolderContent {
  folders: IndexCategory[];
  files: IndexFile[];
}

export function useFolderNavigation(initialPath: string = "root") {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const { categories } = useMemoryBankDocs();

  console.log("[useFolderNavigation] initialized with path:", initialPath);

  const breadcrumbs = useMemo(() => {
    const parts = currentPath === "root" ? [] : currentPath.split("/");
    const crumbs: BreadcrumbItem[] = [
      { name: "root", displayName: "Memory Bank", path: "root" }
    ];

    let accumulatedPath = "";
    for (const part of parts) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      crumbs.push({
        name: part,
        displayName: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
        path: accumulatedPath
      });
    }

    console.log("[useFolderNavigation] breadcrumbs generated:", crumbs);
    return crumbs;
  }, [currentPath]);

  const folderContent = useMemo(() => {
    const folders: IndexCategory[] = [];
    const files: IndexFile[] = [];

    if (currentPath === "root") {
      // Root level: show all top-level categories and root-level files
      for (const category of categories) {
        // Skip the root files category - we'll handle its files directly
        if (category.name === 'root') {
          // Add root-level files directly
          files.push(...(category.files || []));
        } else {
          // Add other categories as folders
          folders.push(category);
        }
      }
    } else {
      // Navigate to specific folder
      const parts = currentPath.split("/");
      let currentCategory: IndexCategory | undefined = categories.find(
        cat => cat.name === parts[0]
      );

      // Traverse nested structure
      for (let i = 1; i < parts.length && currentCategory; i++) {
        currentCategory = currentCategory.subcategories?.find(
          cat => cat.name === parts[i]
        );
      }

      if (currentCategory) {
        folders.push(...(currentCategory.subcategories || []));
        files.push(...(currentCategory.files || []));
      }
    }

    console.log(
      "[useFolderNavigation] content loaded - folders:",
      folders.length,
      "files:",
      files.length
    );
    return { folders, files };
  }, [currentPath, categories]);

  const navigateToFolder = (folderPath: string) => {
    console.log("[useFolderNavigation] navigating to:", folderPath);
    setCurrentPath(folderPath);
  };

  const navigateToBreadcrumb = (path: string) => {
    console.log("[useFolderNavigation] breadcrumb navigation to:", path);
    setCurrentPath(path);
  };

  return {
    currentPath,
    breadcrumbs,
    folderContent,
    navigateToFolder,
    navigateToBreadcrumb
  };
}