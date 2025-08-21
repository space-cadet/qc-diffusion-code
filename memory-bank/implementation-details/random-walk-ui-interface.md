# Random Walk UI Interface Design

*Created: 2025-08-21 07:03:35 IST*

## Overview

This document defines the user interface design for the Random Walk simulation page, including layout, controls, history management, and data export functionality.

## Main Interface Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QC-Diffusion Simulator                                    [Home|Telegraph|AMR|RandomWalk] │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Random Walk → Telegraph Equation                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┬───────────────────────────────────────────────────────┐
│   Parameters        │                                                       │
│                     │                                                       │
│ Particles: [1000▼]  │                  Particle Canvas                      │
│                     │                                                       │
│ λ (Collision):      │              [Live particle dots]                    │
│ [▓▓▓▓░░░░░░] 2.5     │                                                       │
│                     │                                                       │
│ a (Jump Length):    │                                                       │
│ [▓▓▓░░░░░░░] 0.1     │                                                       │
│                     │                                                       │
│ v (Velocity):       │                                                       │
│ [▓▓▓▓▓░░░░░] 1.0     │                                                       │
│                     │                                                       │
│ ┌─────────────────┐ │                                                       │
│ │ [▶️ Start]      │ │                                                       │
│ │ [⏸️ Pause]      │ │                                                       │
│ │ [🔄 Reset]      │ │                                                       │
│ └─────────────────┘ │                                                       │
│                     │                                                       │
│ Status:             │                                                       │
│ ● Running           │                                                       │
│ Time: 12.3s         │                                                       │
│ Collisions: 2,847   │                                                       │
└─────────────────────┼───────────────────────────────────────────────────────┤
                      │                                                       │
┌─────────────────────┴───────────────────────────────────────────────────────┐
│                            Density Comparison                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ρ(x,t)                                                                     │
│    ▲                                                                        │
│    │     ╭─╮     ← Random Walk (blue dots)                                  │
│    │    ╱   ╲                                                               │
│    │   ╱     ╲   ← Telegraph Equation (red curve)                          │
│    │  ╱       ╲                                                             │
│    │ ╱         ╲                                                            │
│    └─────────────────────────────────────────► x                               │
│                                                                             │
│  Convergence Error: 0.023  │  D_eff: 0.89  │  v_eff: 1.02                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## History Interface and Controls

```
┌─────────────────────┬───────────────────────────────────────────────────────┐
│   Parameters        │                  Particle Canvas                      │
│                     │                                                       │
│ Particles: [1000▼]  │              [Live particle dots]                    │
│ λ: [▓▓▓▓░░░░░░] 2.5  │                                                       │
│ a: [▓▓▓░░░░░░░] 0.1  │                                                       │
│ v: [▓▓▓▓▓░░░░░] 1.0  │                                                       │
│                     │                                                       │
│ ┌─────────────────┐ │                                                       │
│ │ [▶️ Start] [📖]  │ │  📖 = History Panel Toggle                           │
│ │ [⏸️ Pause] [💾]  │ │  💾 = Save Current State                             │
│ │ [🔄 Reset] [📊]  │ │  📊 = Export Data                                    │
│ └─────────────────┘ │                                                       │
└─────────────────────┴───────────────────────────────────────────────────────┤

┌─────────────────────────────────────────────────────────────────────────────┐
│                              📖 Simulation History                          │
├─────────────────────┬──────────────────┬────────────────┬─────────────────────┤
│      Time Range     │    Parameters    │    Actions     │       Preview       │
├─────────────────────┼──────────────────┼────────────────┼─────────────────────┤
│ ⏰ 0.0s - 5.2s      │ λ=2.5, a=0.1     │ [👁️] [📊] [🗑️] │      ╱╲             │
│ ● Current           │ v=1.0, N=1000    │ View Export Del │     ╱  ╲            │
│                     │                  │                │    ╱____╲           │
├─────────────────────┼──────────────────┼────────────────┼─────────────────────┤
│ ⏰ 5.2s - 12.8s     │ λ=3.0, a=0.1     │ [👁️] [📊] [🗑️] │      ╱╲             │
│ ○ Saved             │ v=1.2, N=1000    │                │     ╱  ╲            │
│                     │                  │                │    ╱____╲           │
├─────────────────────┼──────────────────┼────────────────┼─────────────────────┤
│ ⏰ 0.0s - 8.1s      │ λ=1.5, a=0.2     │ [👁️] [📊] [🗑️] │       ╱╲            │
│ ○ Saved             │ v=0.8, N=500     │                │      ╱  ╲           │
│                     │                  │                │     ╱____╲          │
├─────────────────────┼──────────────────┼────────────────┼─────────────────────┤
│ ⏰ 0.0s - 15.3s     │ λ=4.0, a=0.05    │ [👁️] [📊] [🗑️] │        ╱╲           │
│ ○ Saved             │ v=1.5, N=2000    │                │       ╱  ╲          │
│                     │                  │                │      ╱____╲         │
└─────────────────────┴──────────────────┴────────────────┴─────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          🔄 Replay Controls                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Selected Run: ⏰ 5.2s - 12.8s (λ=3.0, a=0.1, v=1.2)                        │
│                                                                             │
│ [⏮️] [⏪] [▶️] [⏸️] [⏩] [⏭️]    Speed: [1x▼]    Time: 7.4s / 12.8s          │
│                                                                             │
│ Progress: [▓▓▓▓▓▓▓░░░░░░░░░░░░] 58%                                          │
│                                                                             │
│ Options: [🔄 Loop] [📊 Show Metrics] [⚖️ Compare Mode]                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          📊 Data Export Options                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Export Format: [CSV ▼] [JSON] [HDF5]                                        │
│                                                                             │
│ Data to Export:                                                             │
│ ☑️ Particle positions over time    ☑️ Density field ρ(x,t)                  │
│ ☑️ Velocity field u(x,t)           ☑️ Collision events                       │
│ ☑️ Parameters & metadata           ☐ Individual trajectories                │
│                                                                             │
│ Time Range: [Full Run ▼] [Custom: 2.0s - 8.5s]                             │
│                                                                             │
│ [📥 Download] [📋 Copy to Clipboard] [🔗 Share Link]                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Structure

### Core Components

1. **RandomWalkPage.tsx** - Main page component
2. **ParameterPanel.tsx** - Left sidebar with physics controls
3. **ParticleCanvas.tsx** - Main visualization area
4. **DensityComparison.tsx** - Bottom comparison chart
5. **HistoryPanel.tsx** - Simulation history management
6. **ExportPanel.tsx** - Data export functionality

### Parameter Controls

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| Particles (N) | Dropdown | 100,500,1000,2000,5000 | 1000 | Number of particles |
| Collision Rate (λ) | Slider | 0.1 - 10.0 | 2.5 | Poisson collision frequency |
| Jump Length (a) | Slider | 0.01 - 1.0 | 0.1 | Lattice spacing |
| Velocity (v) | Slider | 0.1 - 5.0 | 1.0 | Particle velocity |

### Derived Parameters Display

- **Diffusion Constant**: D = v²/(2λ)
- **Mean Free Path**: ⟨distance⟩ = v/λ
- **Mean Wait Time**: ⟨τ⟩ = 1/λ

### Control Buttons

| Button | Function | State Dependencies |
|--------|----------|-------------------|
| ▶️ Start | Begin simulation | Disabled when running |
| ⏸️ Pause | Pause simulation | Enabled when running |
| 🔄 Reset | Reset to initial state | Always enabled |
| 💾 Save | Save current state | Enabled when running |
| 📖 History | Toggle history panel | Always enabled |
| 📊 Export | Export current data | Enabled when data exists |

## Status Display

### Real-time Metrics
- **Simulation Time**: Current time t
- **Total Collisions**: Sum of all collision events
- **Simulation State**: Running/Paused/Stopped
- **FPS**: Rendering frame rate
- **Particle Count**: Active particles

### Convergence Metrics
- **Convergence Error**: |ρ_random(x,t) - ρ_telegraph(x,t)|
- **Effective Diffusion**: D_eff measured from simulation
- **Effective Velocity**: v_eff measured from simulation

## Canvas Visualization

### Particle Display
- **Particle Dots**: Real-time positions of all particles
- **Color Coding**: By velocity direction (+1 red, -1 blue)
- **Trail Mode**: Optional particle trajectory trails
- **Zoom/Pan**: Interactive canvas navigation

### Density Overlay
- **Heat Map**: Optional density field visualization
- **Grid Lines**: Spatial binning visualization
- **Density Profile**: Real-time ρ(x,t) curve overlay

## History Management

### Automatic Saves
- **Time Intervals**: Every 5 seconds during simulation
- **Parameter Changes**: Before any parameter modification
- **State Changes**: Start/pause/reset events

### Manual Saves
- **Bookmarks**: User-initiated save points
- **Naming**: Optional custom names for saved states
- **Metadata**: Automatic timestamp and parameter capture

### History Display
- **Chronological List**: Most recent first
- **Thumbnail Previews**: Density profile snapshots
- **Quick Actions**: View, export, delete per entry
- **Search/Filter**: By parameters or time range

## Replay System

### VCR Controls
- **Play/Pause**: Standard media controls
- **Speed Control**: 0.1x, 0.5x, 1x, 2x, 5x, 10x
- **Scrubbing**: Click timeline to jump to time
- **Loop Mode**: Continuous replay option

### Compare Mode
- **Overlay**: Multiple simulations on same canvas
- **Side-by-side**: Split screen comparison
- **Parameter Diff**: Highlight parameter differences
- **Metrics Table**: Quantitative comparison

## Data Export

### Export Formats
- **CSV**: Comma-separated values for spreadsheets
- **JSON**: Structured data for web applications
- **HDF5**: Scientific data format for large datasets

### Data Types
- **Particle Trajectories**: Individual particle paths over time
- **Density Fields**: ρ(x,t) binned data
- **Velocity Fields**: u(x,t) binned data
- **Collision Events**: Time, position, direction changes
- **Parameters**: Physics constants and simulation settings
- **Metadata**: Timestamps, version, system info

### Export Options
- **Time Range**: Full simulation or custom range
- **Spatial Range**: All positions or custom bounds
- **Data Decimation**: Reduce file size by sampling
- **Compression**: Optional data compression

## Integration Points

### Existing Components
- **Navigation**: Add "RandomWalk" tab to existing header
- **Telegraph Solver**: Import from C1 task for comparison
- **WebGL Infrastructure**: Leverage existing GPU acceleration
- **Parameter Controls**: Reuse styling from telegraph page

### Data Flow
1. **Parameters** → CTRW Physics Engine
2. **Physics** → tsParticles System
3. **Particles** → Density Calculator
4. **Density** → Telegraph Comparison
5. **Results** → History System
6. **History** → Export System

## Technical Requirements

### Performance Targets
- **60 FPS**: Smooth animation for N ≤ 1000 particles
- **30 FPS**: Acceptable for N ≤ 5000 particles
- **Real-time**: Density calculation within 16ms
- **Responsive**: UI interactions within 100ms

### Browser Support
- **WebGL 2.0**: For GPU acceleration
- **Canvas 2D**: Fallback for density plots
- **Local Storage**: For session persistence
- **File API**: For data export

### Memory Management
- **Particle Buffers**: Efficient array storage
- **History Limits**: Maximum 50 saved states
- **Data Cleanup**: Automatic garbage collection
- **Canvas Optimization**: Minimize redraw operations

## Implementation Priority

### Phase 1: Basic Layout
1. Navigation tab integration
2. Static parameter panel
3. Placeholder canvas
4. Basic control buttons

### Phase 2: Core Functionality
1. Parameter sliders with validation
2. CTRW physics integration
3. Basic particle rendering
4. Start/pause/reset controls

### Phase 3: Visualization
1. tsParticles integration
2. Real-time density calculation
3. Telegraph equation comparison
4. Status display

### Phase 4: History System
1. Automatic state saving
2. History panel interface
3. Replay controls
4. Basic export functionality

### Phase 5: Advanced Features
1. Compare mode
2. Advanced export options
3. Performance optimizations
4. Mobile responsiveness

## File Structure

```
frontend/src/
├── pages/
│   └── RandomWalkPage.tsx          # Main page component
├── components/randomwalk/
│   ├── ParameterPanel.tsx          # Physics parameter controls
│   ├── ParticleCanvas.tsx          # Main particle visualization
│   ├── DensityComparison.tsx       # Telegraph equation comparison
│   ├── HistoryPanel.tsx            # Simulation history management
│   ├── ExportPanel.tsx             # Data export interface
│   └── ReplayControls.tsx          # VCR-style replay controls
├── hooks/
│   ├── useRandomWalk.ts            # Core simulation logic
│   ├── useHistory.ts               # History management
│   └── useExport.ts                # Data export functionality
└── utils/randomwalk/
    ├── ctrwPhysics.ts              # CTRW physics engine
    ├── densityCalculator.ts        # Spatial binning and density
    ├── historyManager.ts           # State persistence
    └── dataExporter.ts             # Export format handlers
```

## Success Criteria

1. **Intuitive Interface**: Users can explore parameters without training
2. **Smooth Performance**: Real-time simulation without lag
3. **Scientific Accuracy**: Correct convergence to telegraph equation
4. **Data Accessibility**: Easy export for further analysis
5. **Session Continuity**: Reliable save/load functionality
6. **Cross-platform**: Works on desktop and mobile browsers
