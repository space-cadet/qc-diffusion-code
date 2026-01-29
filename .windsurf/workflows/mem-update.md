---
description: Memory Bank Update Workflow
auto_execution_mode: 1
---

## Memory Bank Update Workflow (Enhanced v6.12 Compliance)

### Step 1: Read Memory Bank Update Protocol
- **First Action:** Read the memory bank update protocol from `memory-bank/integrated-rules-v6.12.md` (Sections 1.5, 1.6, and 6.5)
- **Purpose:** Understand strict compliance requirements, file operation standards, and approval protocols
- **Critical:** Must read this before making any file modifications

### Step 2: Deep Memory Bank Scan
- **Comprehensive Scan:** Perform deep scan of entire memory bank structure
- **Identify Related Content:**
  - All existing tasks in `memory-bank/tasks/` related to current work
  - All sub-tasks and implementation details in `memory-bank/implementation-details/`
  - Relevant session files and cache entries
  - Current active context and task registry
- **Analysis:** Determine relationships and dependencies between existing documentation

### Step 3: Request Approval for New Content
- **Assessment:** Based on deep scan, determine if new tasks, sub-tasks, or implementation docs are needed
- **User Approval:** **MUST** request explicit user approval before creating any new:
  - Task files (`tasks/T{ID}.md`)
  - Implementation detail files
  - Registry entries
  - Session files
- **Documentation:** Clearly state what new content is needed and why

### Step 4: Initialize Context (Time & Timezone)
- **Get Current Time:** Determine current system time and timezone (IST format: `YYYY-MM-DD HH:MM:SS TZ`)
- **Verify Timestamp Standards:** Ensure compliance with v6.12 timestamp requirements
- **Prepare for Updates:** Have accurate timestamps ready for all file updates

### Step 5: Update Specific Files (Task/Implementation)
- **Template Compliance:** All file updates MUST follow the exact formats given in `memory-bank/memory-bank/templates/` folder
- **Available Templates:** 
  - `task-template.md` for new task files
  - `tasks.md` for task registry
  - `session_cache.md` for session cache
  - `edit_history.md` for edit history
  - `activeContext.md` for active context
  - And other specialized templates as needed
- **Targeted Updates:** Update only the specific task files and implementation docs identified in Step 2-3
- **Strict Rule:** Use `edit_block` (or equivalent) for updates. **Never** overwrite whole files unless creating new ones
- **Schema Compliance:** Follow v6.12 requirements AND template formats exactly

### Step 6: Update Registries (Strict Schema Enforced)
- **`tasks.md`:** Update status/timestamps
  - *Constraint:* Must match `| ID | Title | Status | Priority | Started | Dependencies | Details |`
  - *Constraint:* Status must be `🔄`, `✅`, `⏸️`, or `❌`
  - *Constraint:* Details must be `[Details](tasks/Txx.md)`
- **`session_cache.md`:** Update active tasks/history

### Step 7: Update Session Log
- **Check for `sessions/YYYY-MM-DD-PERIOD.md`**
- **If exists:** Update while **PRESERVING EXISTING CONTENT**. Append new work items
- **If new:** Create with standard header following v6.12 template

### Step 8: Update History (Strict Regex Compliance)
- **`edit_history.md`:** Prepend new entry
  - *Header:* `#### HH:MM:SS IST - TaskID: Description`
  - *Bullet:* `- Action `relative/path` - Description`
  - *Action:* `Created`, `Modified`, `Updated`, `Deleted`

### Step 9: Finalize
- **Generate Commit Message:** Create commit message per v6.12 format
- **Verify Compliance:** Ensure all updates follow strict v6.12 requirements
- **Document Completion:** Note workflow completion in appropriate logs