# Error Log
*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2025-08-24 00:02:35 IST*

## 2025-08-23 21:40: T5b - State Restoration Not Working Despite Implementation
**File:** `frontend/src/RandomWalkSim.tsx`
**Error:** State restoration on page reload not functioning - particles not maintaining ring distribution after browser refresh
**Cause:** Implementation completed but restoration logic not triggering properly during component initialization
**Fix:** Requires debugging of useEffect timing and particle data structure validation
**Changes:** Enhanced persistence architecture implemented but needs connection verification
**Task:** T5b

## 2025-08-23 18:49: T9 - pnpm Lockfile Synchronization Issues  
**File:** `frontend/package.json`, `pnpm-lock.yaml`
**Error:** ERR_PNPM_OUTDATED_LOCKFILE preventing Vercel deployment
**Cause:** Adding local graph-core dependency created lockfile inconsistency
**Fix:** Created pnpm-workspace.yaml with proper monorepo configuration, updated build commands
**Changes:** Resolved through workspace-aware pnpm commands and Vercel build configuration
**Task:** T9

## 2025-08-23 17:05: T8 - Density Profile Clustering at Canvas Corners
**File:** `frontend/src/physics/RandomWalkSimulator.ts`  
**Error:** Density calculations showing artificial clustering at (0,0) instead of uniform distribution
**Cause:** Coordinate mapping error between canvas coordinates and physics space during initialization
**Fix:** Corrected coordinate conversion flow: canvas → physics for proper density calculation
**Changes:** Fixed initialization to use physics coordinates consistently
**Task:** T8

## 2025-08-22 21:11: T5c - Physics-Canvas Coordinate System Misalignment
**File:** `frontend/src/physics/ParticleManager.ts`
**Error:** Particle boundaries not matching expected physics simulation space
**Cause:** Inconsistent coordinate transformations between physics space (-200,+200) and canvas (0,width)
**Fix:** Added coordinate transformation functions mapToCanvas() and mapToPhysics() with boundary visualization
**Changes:** Implemented proper coordinate system separation with visual boundary indicators  
**Task:** T5c

## 2025-08-22 18:38: T5b - Particle Animation Interference Issues
**File:** `frontend/src/RandomWalkSim.tsx`, `frontend/src/config/tsParticlesConfig.ts`
**Error:** Particle display not updating during simulation, animation conflicts between tsParticles and custom physics
**Cause:** Destructive container.refresh() calls interfering with particle state
**Fix:** Replaced container.refresh() with container.draw(false), decoupled physics from rendering
**Changes:** Clean separation between physics stepping and animation rendering
**Task:** T5b

## 2025-08-22 12:04: T6a - tsParticles High-Level API Animation Conflicts
**File:** `frontend/src/components/ParticleCanvas.tsx`
**Error:** Built-in tsParticles movement interfering with custom CTRW physics implementation
**Cause:** High-level React wrapper providing limited control over particle motion
**Fix:** Complete rewrite using low-level tsParticles API with direct engine management
**Changes:** Manual container management, eliminated animation conflicts, direct particle control
**Task:** T6a

## 2025-08-20 23:44: T4 - Non-Functional Pause Button
**File:** `frontend/src/App.tsx`, `backend/api.py`  
**Error:** Pause button had no effect on running simulations for both WebGL and WebSocket solvers
**Cause:** Missing WebGL pause handling, backend state not persisting during pause, frontend-backend synchronization issues
**Fix:** Added backend parameter storage, WebGL pause integration, pause_state message synchronization
**Changes:** Unified pause behavior across solver types with proper state management
**Task:** T4

## 2025-08-20 10:43: T1 - Telegraph Equation Numerical Instability
**File:** `frontend/src/webgl/webgl-solver.js`, `frontend/src/webgl/simulation_shaders.js`
**Error:** Telegraph equation showing numerical instability and incorrect conservation behavior
**Cause:** Incorrect mathematical implementation as single equation instead of proper first-order system
**Fix:** Corrected to proper first-order system: du/dt = w, dw/dt = v²∇²u - 2aw with velocity parameter
**Changes:** Added velocity field extraction, conservation monitoring system, proper physical implementation
**Task:** T1
