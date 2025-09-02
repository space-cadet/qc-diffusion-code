import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SimulationParams } from '../types'
import type { Layout } from 'react-grid-layout'
import type { RandomWalkParams } from '../types/simulationTypes'

interface RandomWalkUIState {
  isStrategyOpen: boolean
  isBoundaryOpen: boolean
  isParametersOpen: boolean
  isDistributionOpen: boolean
  // UI option: use log scale for particles slider
  particlesLogScale: boolean
  // UI option: use log scale for temperature slider
  temperatureLogScale: boolean
  // Observables Panel
  isObservablesExpanded: boolean
  showParticleCount: boolean
  showKineticEnergy: boolean
  showTotalMomentum: boolean
  showMomentumX: boolean
  showMomentumY: boolean
  showMSD: boolean
  // Density Profile Panel
  densityAutoUpdate: boolean
}

// Floating window geometry for Observables panel rendered via react-rnd
interface WindowRect {
  left: number
  top: number
  width: number
  height: number
  zIndex: number
}

interface RandomWalkSimulationState {
  time: number
  collisions: number
  interparticleCollisions: number
  status: 'Running' | 'Paused' | 'Stopped' | 'Initialized'
  particleData: Array<{
    id: string
    position: { x: number; y: number }
    velocity: { vx: number; vy: number }
    collisionCount: number
    lastCollisionTime: number
    waitingTime: number
  }> | null
  densityHistory: Array<{
    time: number
    density: number[][]
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number }
  }>
  observableData: Record<string, any>
}

// Persistent PDE page state (simulation + UI bits)
interface PdePlotState {
  xRange?: [number, number]
  yRange?: [number, number]
  legend?: boolean
  autoscale?: boolean
}

interface PdeState {
  isRunning: boolean
  time: number
  lastFrame: any | null // AnimationFrame shape; keep as any to avoid circular type imports here
  plot: PdePlotState
}

interface AppState {
  activeTab: 'simulation' | 'randomwalk' | 'gridlayout' | 'randomwalksim' | 'analysis'
  simulationParams: SimulationParams
  gridLayoutParams: RandomWalkParams
  randomWalkSimLayouts: Layout[]
  randomWalkUIState: RandomWalkUIState
  randomWalkSimulationState: RandomWalkSimulationState
  // RND-based Observables floating window state
  observablesWindow: WindowRect
  customObservablesWindow: WindowRect
  zCounter: number
  observablesCollapsed: boolean
  customObservablesCollapsed: boolean
  // Custom text observables storage
  customObservables: string[]
  // Custom observable visibility state (by observable name)
  customObservableVisibility: Record<string, boolean>
  // PDE persistent state
  pdeState: PdeState
  // PDE UI fold states for Controls panel
  pdeUIState: {
    equationsOpen: boolean
    telegraphOpen: boolean
    diffusionOpen: boolean
    initialConditionsOpen: boolean
    simulationSettingsOpen: boolean
  }
  setActiveTab: (tab: 'simulation' | 'randomwalk' | 'gridlayout' | 'randomwalksim' | 'analysis') => void
  setSimulationParams: (params: SimulationParams) => void
  setGridLayoutParams: (params: RandomWalkParams) => void
  setRandomWalkSimLayouts: (layouts: Layout[]) => void
  setRandomWalkUIState: (state: RandomWalkUIState) => void
  setRandomWalkSimulationState: (state: RandomWalkSimulationState) => void
  setObservablesWindow: (rect: WindowRect) => void
  setCustomObservablesWindow: (rect: WindowRect) => void
  setZCounter: (value: number) => void
  setObservablesCollapsed: (collapsed: boolean) => void
  setCustomObservablesCollapsed: (collapsed: boolean) => void
  setCustomObservables: (observables: string[]) => void
  addCustomObservable: (observable: string) => void
  removeCustomObservable: (index: number) => void
  updateCustomObservable: (index: number, observable: string) => void
  setCustomObservableVisibility: (name: string, visible: boolean) => void
  updateSimulationMetrics: (time: number, collisions: number, status: RandomWalkSimulationState['status'], interparticleCollisions: number) => void
  saveSimulationSnapshot: (
    particleData: RandomWalkSimulationState['particleData'],
    densityHistory: RandomWalkSimulationState['densityHistory'],
    observableData: RandomWalkSimulationState['observableData']
  ) => void
  // PDE setters
  setPdeState: (partial: Partial<PdeState>) => void
  setPdeUIState: (partial: Partial<AppState['pdeUIState']>) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: 'simulation',
      simulationParams: {
        collision_rate: 1.0,
        velocity: 1.0,
        diffusivity: 1.0,
        t_range: 5.0,
        dt: 0.02,
        animationSpeed: 1.0,
        distribution: 'gaussian',
        // distribution params defaults
        dist_center: 0,
        dist_sigma: 1,
        step_left: -1,
        step_right: 1,
        step_height: 1,
        sine_freq: 1,
        sine_amp: 1,
        cos_freq: 1,
        cos_amp: 1,
        dg_center1: -1,
        dg_sigma1: 0.5,
        dg_center2: 1,
        dg_sigma2: 0.5,
        dg_weight: 0.5,
        x_min: -5.0,
        x_max: 5.0,
        mesh_size: 64,
        selectedEquations: ['telegraph', 'diffusion'],
        solver_config: { telegraph: 'lax-wendroff', diffusion: 'crank-nicolson' },
        solver_params: { dt_factor: 1.0, theta: 0.5, tolerance: 1e-6, max_iter: 100 },
        boundaryCondition: 'neumann',
        dirichlet_value: 0.0,
      },
      pdeState: {
        isRunning: false,
        time: 0,
        lastFrame: null,
        plot: { autoscale: false },
      },
      pdeUIState: {
        equationsOpen: true,
        telegraphOpen: true,
        diffusionOpen: true,
        initialConditionsOpen: true,
        simulationSettingsOpen: true,
      },
      gridLayoutParams: {
        particles: 1000,
        minParticles: 0,
        maxParticles: 2000,
        collisionRate: 2.5,
        jumpLength: 0.1,
        velocity: 1.0,
        dt: 0.01,
        simulationType: 'continuum',
        dimension: '2D',
        interparticleCollisions: false,
        strategies: [],
        boundaryCondition: 'periodic',
        graphType: 'lattice1D',
        graphSize: 20,
        isPeriodic: false,
        showEdgeWeights: false,
        showAnimation: true,
        temperature: 1.0, // Default thermal temperature
        // Solver selection defaults
        solverType: 'gpu_explicit',
        solverParams: { substeps: 1, cnTheta: 0.5, tolerance: 1e-4, maxIter: 50 },
        initialDistType: 'uniform',
        distSigmaX: 80,
        distSigmaY: 80,
        distR0: 150,
        distDR: 20,
        distThickness: 40,
        distNx: 20,
        distNy: 15,
        distJitter: 4,
      },
      randomWalkSimLayouts: [
        { i: "parameters", x: 0, y: 0, w: 3, h: 8, minW: 3, minH: 6 },
        { i: "canvas", x: 3, y: 0, w: 9, h: 8, minW: 6, minH: 6 },
        { i: "observables", x: 0, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
        { i: "density", x: 4, y: 8, w: 8, h: 4, minW: 8, minH: 3 },
        { i: "history", x: 0, y: 12, w: 12, h: 4, minW: 6, minH: 2 },
        { i: "replay", x: 0, y: 16, w: 8, h: 3, minW: 6, minH: 2 },
        { i: "export", x: 8, y: 16, w: 4, h: 3, minW: 4, minH: 2 },
      ],
      randomWalkUIState: {
        isStrategyOpen: false,
        isBoundaryOpen: false,
        isParametersOpen: true,
        isDistributionOpen: false,
        particlesLogScale: true,
        temperatureLogScale: true, // Default to log scale for temperature
        // Observables Panel
        isObservablesExpanded: true,
        showParticleCount: false,
        showKineticEnergy: false,
        showTotalMomentum: false,
        showMomentumX: false,
        showMomentumY: false,
        showMSD: false,
        // Density Profile Panel
        densityAutoUpdate: false,
      },
      randomWalkSimulationState: {
        time: 0,
        collisions: 0,
        interparticleCollisions: 0,
        status: 'Stopped',
        particleData: null,
        densityHistory: [],
        observableData: {},
      },
      // Default position/size for Observables floating window
      observablesWindow: {
        left: 24,
        top: 24,
        width: 420,
        height: 320,
        zIndex: 1,
      },
      // Default position/size for Custom Observables floating window
      customObservablesWindow: {
        left: 460,
        top: 24,
        width: 380,
        height: 400,
        zIndex: 2,
      },
      zCounter: 2,
      observablesCollapsed: false,
      customObservablesCollapsed: false,
      customObservables: [],
      customObservableVisibility: {},
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSimulationParams: (params) => set({ simulationParams: params }),
      setGridLayoutParams: (params) => set({ gridLayoutParams: params }),
      setRandomWalkSimLayouts: (layouts) => set({ randomWalkSimLayouts: layouts }),
      setRandomWalkUIState: (state) => set({ randomWalkUIState: state }),
      setRandomWalkSimulationState: (state) => set({ randomWalkSimulationState: state }),
      setObservablesWindow: (rect) => set({ observablesWindow: rect }),
      setCustomObservablesWindow: (rect) => set({ customObservablesWindow: rect }),
      setZCounter: (value) => set({ zCounter: value }),
      setObservablesCollapsed: (collapsed) => set({ observablesCollapsed: collapsed }),
      setCustomObservablesCollapsed: (collapsed) => set({ customObservablesCollapsed: collapsed }),
      setCustomObservables: (observables) => set({ customObservables: observables }),
      addCustomObservable: (observable) => set((state) => ({ 
        customObservables: [...state.customObservables, observable] 
      })),
      removeCustomObservable: (index) => set((state) => ({
        customObservables: state.customObservables.filter((_, i) => i !== index)
      })),
      updateCustomObservable: (index, observable) => set((state) => ({
        customObservables: state.customObservables.map((obs, i) => i === index ? observable : obs)
      })),
      setCustomObservableVisibility: (name, visible) => set((state) => ({
        customObservableVisibility: { ...state.customObservableVisibility, [name]: visible }
      })),
      updateSimulationMetrics: (time, collisions, status, interparticleCollisions) => 
        set((state) => ({
          randomWalkSimulationState: {
            ...state.randomWalkSimulationState,
            time,
            collisions,
            status,
            interparticleCollisions
          }
        })),
      saveSimulationSnapshot: (particleData, densityHistory, observableData) =>
        set((state) => ({
          randomWalkSimulationState: {
            ...state.randomWalkSimulationState,
            particleData,
            densityHistory,
            observableData
          }
        })),
      setPdeState: (partial) =>
        set((state) => ({ pdeState: { ...state.pdeState, ...partial } })),
      setPdeUIState: (partial) =>
        set((state) => ({ pdeUIState: { ...state.pdeUIState, ...partial } })),
    }),
    { 
      name: 'qc-diffusion-app-state',
      version: 1,
      migrate: (state: any, version) => {
        if (!state) return state;
        const glp = state.gridLayoutParams || {};
        if (glp.minParticles === undefined) glp.minParticles = 0;
        if (glp.maxParticles === undefined) glp.maxParticles = 2000;
        if (glp.dt === undefined) glp.dt = 0.01;
        const ui = state.randomWalkUIState || {};
        if (ui.particlesLogScale === undefined) ui.particlesLogScale = true;
        return {
          ...state,
          gridLayoutParams: {
            ...glp,
          },
          randomWalkUIState: {
            ...ui,
          },
        };
      },
      // Persist everything except runtime state
      partialize: (state) => ({
        activeTab: state.activeTab,
        simulationParams: state.simulationParams,
        pdeState: state.pdeState,
        pdeUIState: state.pdeUIState,
        gridLayoutParams: state.gridLayoutParams,
        randomWalkSimLayouts: state.randomWalkSimLayouts,
        randomWalkUIState: state.randomWalkUIState,
        randomWalkSimulationState: state.randomWalkSimulationState,
        observablesWindow: state.observablesWindow,
        customObservablesWindow: state.customObservablesWindow,
        zCounter: state.zCounter,
        observablesCollapsed: state.observablesCollapsed,
        customObservablesCollapsed: state.customObservablesCollapsed,
        customObservables: state.customObservables,
        customObservableVisibility: state.customObservableVisibility,
      }),
    }
  )
)
