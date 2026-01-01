# Git Worktrees: A Practical Guide

**Created**: 2025-07-07 17:19:52 IST  
**Last Updated**: 2025-07-07 17:22:26 IST

## Table of Contents
1. [What Are Worktrees?](#what-are-worktrees)
2. [Key Benefits](#key-benefits)
3. [Basic Commands](#basic-commands)
4. [Node Modules Handling](#node-modules-handling)
5. [Important Behaviors](#important-behaviors)
6. [Advanced Behaviors](#advanced-behaviors)
7. [Practical Example](#practical-example)
8. [Best Practices](#best-practices)
9. [Example Worktree Structure](#example-worktree-structure)
10. [Transferring Changes Between Worktrees](#transferring-changes-between-worktrees)
11. [FAQ](#faq)

## What Are Worktrees?
Git worktrees allow multiple working directories to share the same repository. Each worktree:
- Exists in its own folder (typically one level above main project)
- Can have different branches checked out simultaneously 
- Shares the same underlying Git objects and history

## Key Benefits
1. **Parallel Development**: Work on multiple branches without switching
2. **Isolation**: Changes in one worktree don't affect others until committed
3. **No Stashing**: Eliminates the need for constant `git stash` operations

## Basic Commands
```bash
# Create new worktree
git worktree add ../new-feature feature-branch

# List worktrees
git worktree list

# Remove worktree
git worktree remove ../new-feature
```

## Node Modules Handling
Options for managing dependencies across worktrees:
1. **Symlink Approach** (recommended):
   ```bash
   ln -s ../main-project/node_modules node_modules
   ```
   - Pros: Single install location
   - Cons: Package installations affect all worktrees

2. **Separate Installs**:
   ```bash
   npm install
   ```
   - Pros: Complete isolation
   - Cons: Duplicate disk usage

## Important Behaviors
- `git reset --hard` only affects current worktree
- Commits are visible across all worktrees immediately
- Each worktree maintains its own:
  - Working directory state
  - Staging area
  - HEAD reference

## Advanced Behaviors
### How Resets Affect Worktrees
1. **Local Operations**:
   - `git reset` only affects the worktree where executed
   - Other worktrees maintain their working directory states

2. **Branch Safety**:
   - Git prevents resetting branches checked out in other worktrees
   - Example warning:
     ```
     warning: not updating ref 'refs/heads/feature-branch':
              is at 123abcd but expected 456efgh
     ```

3. **Shared History**:
   - Resets become visible in all worktrees after execution
   - But file changes remain isolated until worktrees update

4. **Danger Zones**:
   - Deleting branches used by other worktrees
   - Force-pushing rewritten history
   - These require manual cleanup in affected worktrees

## Practical Example
### Scenario: Hotfix While Developing
```bash
# 1. Create main project worktree
cd ~/code
git clone git@github.com:user/ts-quantum.git

# 2. Create feature worktree
git worktree add ../quantum-feature feature/new-gates

# 3. Emergency hotfix (in main worktree)
cd ~/code/ts-quantum
git pull origin main
git checkout -b hotfix/security-patch

# 4. Continue working in feature worktree
cd ~/code/quantum-feature
# All files remain unchanged

git status  # Shows feature branch state

# 5. After hotfix completes in main worktree:
cd ~/code/ts-quantum
git checkout main
git merge hotfix/security-patch
git push

# 6. Update feature worktree (when ready)
cd ~/code/quantum-feature
git fetch origin
git rebase origin/main
```
Key Observations:
- Hotfix work didn't disturb feature development
- No stash/checkout dance required
- Both branches could reference the shared node_modules

## Best Practices
1. Place worktrees in sibling directories of main project
2. Use descriptive folder names matching branch names
3. Clean up unused worktrees regularly
4. For TypeScript/Node projects, consider symlinking node_modules

## Transferring Changes Between Worktrees
### Method 1: Cherry-pick (Recommended)
```bash
# From target branch worktree
cd ../quantum-feature
git cherry-pick <commit-hash>
```

### Method 2: Patch Transfer
```bash
# In source worktree
git diff > changes.patch

# In target worktree
git apply ../source-worktree/changes.patch
```

### Handling Merge Conflicts
1. **During cherry-pick**:
   ```bash
   # Resolve conflicts then:
   git cherry-pick --continue
   # OR abort with:
   git cherry-pick --abort
   ```

2. **During patch apply**:
   ```bash
   # View conflicts:
   git status
   # Edit conflicted files then:
   git add .
   ```

3. **Best Practices**:
   - Transfer small, focused changes
   - Document transferred commits
   - Verify changes in target worktree

## Example Worktree Structure
```
/Users/deepak/code/
├── ts-quantum/          # Main project
├── quantum-feature/     # Feature branch worktree
└── quantum-hotfix/      # Hotfix branch worktree
```

## FAQ
**Q:** Can I have multiple worktrees for the same branch?  
**A:** No, each branch can only be checked out in one worktree at a time.

**Q:** Do worktrees appear in `git branch` output?  
**A:** Yes, but they're regular branches - the worktree connection is maintained in `.git/worktrees/`
