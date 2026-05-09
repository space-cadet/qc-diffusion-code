---
kind: edit_chunk
id: 2026-05-09-044647-T25-memory-bank-async
created_at: 2026-05-09T04:46:47+05:30
task_ids: [T25]
source_branch: cloud-claw/screenshot-poc
source_commit: 72300b6
---

# T25: Memory Bank Loading Performance Fix

## Problem
Memory Bank page took 10-15 seconds to load because `useMemoryBankDocs.ts` used `import.meta.glob` with `eager: true`, which blocked the React render thread while synchronously scanning all files.

## Solution
Rewrote `useMemoryBankDocs.ts` to use async loading with `useState`/`useEffect`:
- Changed from eager imports to dynamic `import()` with Promise.all
- Added `isLoading` and `error` states to `MemoryBankData` interface
- Components now show "Loading documents..." instead of blocking

## Files Changed
- Modified `frontend/src/memoryBank/hooks/useMemoryBankDocs.ts` - Async rewrite with loading states
- Modified `frontend/src/memoryBank/components/Sidebar.tsx` - Added loading/error UI
- Modified `frontend/src/memoryBank/components/FileListView.tsx` - Added loading state
- Modified `frontend/src/memoryBank/components/FileGridView.tsx` - Added loading state

## Verification
- Screenshot `05-memory-bank.png` shows page loads with sidebar displaying 18 files
- No timeout errors in capture script

## Impact
- Memory Bank now loads immediately with loading indicator
- File tree renders asynchronously without blocking UI
- Better user experience on slower systems
