import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SimulationParams } from '../types'
import type { Layout } from 'react-grid-layout'
import type { RandomWalkParams } from '../types/simulationTypes'

export interface RandomWalkUIState {
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
  particleViewAutoUpdate: boolean
  persistentDiagnosticsAutoUpdate: boolean
  strategyDiagnosticsAutoUpdate: boolean
}

export type SpheroidConstraint = 'volume' | 'area'
export type SpheroidMetric = 'meanQ' | 'meanR' | 'meanArea' | 'meanVolume' | 'meanPoleCurvature' | 'meanEquatorCurvature'

export interface SpheroidWalkUIState {
  profileIndex: number
  seed: string
  population: number
  stepCount: number
  colorByCurvature: boolean
  metric: SpheroidMetric
  constraint: SpheroidConstraint
}

export const DEFAULT_SPHEROID_WALK_UI_STATE: SpheroidWalkUIState = {
  profileIndex: 0,
  seed: '39017',
  population: 2000,
  stepCount: 200,
  colorByCurvature: true,
  metric: 'meanR',
  constraint: 'volume',
}

// Floating window geometry for Observables panel rendered via react-rnd
interface WindowRect {
  left: number
  top: number
  width: number
  height: number
  zIndex: number
}

export interface RandomWalkSimulationState {
  isRunning: boolean
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
  selectedHistoryIndex: number
  history: Array<{
    startTime: number
    endTime: number
    parameters: RandomWalkParams
    particleData: RandomWalkSimulationState['particleData']
    densityHistory: RandomWalkSimulationState['densityHistory']
    observableData: RandomWalkSimulationState['observableData']
  }>
  gpuState?: {
    positions: Float32Array
    velocities: Float32Array
    collisionCount: number
    simulationTime: number
  }
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
  activeTab: 'simulation' | 'randomwalk' | 'gridlayout' | 'randomwalksim' | 'analysis' | 'quantumwalk' | 'quantumwalk-refactored' | 'labdemo' | 'simplicialgrowth' | 'spheroidwalk' | 'memorybank'
  simulationParams: SimulationParams
  gridLayoutParams: RandomWalkParams
  randomWalkSimLayouts: Layout[]
  randomWalkSimCollapsed: Record<string, boolean>
  randomWalkViewportZoom: number
  randomWalkUIState: RandomWalkUIState
  spheroidWalkUIState: SpheroidWalkUIState
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
  // Physics engine selection
  useNewEngine: boolean
  // Observables framework selection
  useStreamingObservables: boolean
  // GPU acceleration toggle
  useGPU: boolean
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
  setActiveTab: (tab: 'simulation' | 'randomwalk' | 'gridlayout' | 'randomwalksim' | 'analysis' | 'quantumwalk' | 'quantumwalk-refactored' | 'labdemo' | 'simplicialgrowth' | 'spheroidwalk' | 'memorybank') => void
  setSimulationParams: (params: SimulationParams) => void
  setGridLayoutParams: (params: RandomWalkParams) => void
  setRandomWalkSimLayouts: (layouts: Layout[]) => void
  setRandomWalkSimCollapsed: (key: string, collapsed: boolean) => void
  setRandomWalkViewportZoom: (zoom: number) => void
  setRandomWalkUIState: (state: Partial<RandomWalkUIState>) => void
  setSpheroidWalkUIState: (state: Partial<SpheroidWalkUIState>) => void
  setRandomWalkSimulationState: (state: RandomWalkSimulationState) => void
  setSelectedHistoryIndex: (index: number) => void
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
  setUseNewEngine: (useNew: boolean) => void
  setUseStreamingObservables: (useStreaming: boolean) => void
  setUseGPU: (useGPU: boolean) => void
  setIsRunning: (isRunning: boolean) => void
  updateSimulationMetrics: (time: number, collisions: number, status: RandomWalkSimulationState['status'], interparticleCollisions: number) => void
  saveSimulationSnapshot: (
    particleData: RandomWalkSimulationState['particleData'],
    densityHistory: RandomWalkSimulationState['densityHistory'],
    observableData: RandomWalkSimulationState['observableData'],
    gpuState?: RandomWalkSimulationState['gpuState']
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
      spheroidWalkUIState: { ...DEFAULT_SPHEROID_WALK_UI_STATE },
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
        strategies: ['simple'],
        seed: 42,
        levyAlpha: 1.5,
        levyScale: 20,
        fractionalBeta: 0.7,
        fractionalWaitingScale: 0.1,
        fractionalJumpLength: 10,
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
        initialDistByDimension: { '1D': 'uniform', '2D': 'uniform' },
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
        { i: "density", x: 0, y: 8, w: 8, h: 5, minW: 6, minH: 3 },
        { i: "history", x: 8, y: 8, w: 4, h: 5, minW: 3, minH: 3 },
        { i: "persistentDiagnostics", x: 0, y: 13, w: 6, h: 5, minW: 4, minH: 3 },
        { i: "diagnostics", x: 6, y: 13, w: 6, h: 5, minW: 4, minH: 3 },
        { i: "export", x: 0, y: 18, w: 12, h: 3, minW: 4, minH: 2 },
      ],
      randomWalkSimCollapsed: {},
      randomWalkViewportZoom: 1,
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
        particleViewAutoUpdate: true,
        persistentDiagnosticsAutoUpdate: true,
        strategyDiagnosticsAutoUpdate: true,
      },
      randomWalkSimulationState: {
        isRunning: false,
        time: 0,
        collisions: 0,
        interparticleCollisions: 0,
        status: 'Stopped',
        particleData: null,
        densityHistory: [],
        observableData: {},
        selectedHistoryIndex: -1,
        history: [],
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
      useNewEngine: false, // Default to legacy engine
      useStreamingObservables: false, // Default to polling
      useGPU: false, // Default to CPU physics
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSimulationParams: (params) => set({ simulationParams: params }),
      setGridLayoutParams: (params) => set((state) => {
        const current = state.gridLayoutParams as Partial<RandomWalkParams> | undefined;
        const requestedStrategies = params.strategies ?? current?.strategies ?? ['simple'];
        const motionStrategies = requestedStrategies.filter((strategy) => strategy !== 'collisions');
        return {
          gridLayoutParams: {
            ...current,
            ...params,
            strategies: motionStrategies.length ? motionStrategies : ['simple'],
            interparticleCollisions: params.interparticleCollisions === undefined
              ? Boolean(current?.interparticleCollisions || requestedStrategies.includes('collisions'))
              : params.interparticleCollisions,
            seed: params.seed ?? current?.seed ?? 42,
            levyAlpha: params.levyAlpha ?? current?.levyAlpha ?? 1.5,
            levyScale: params.levyScale ?? current?.levyScale ?? 20,
            fractionalBeta: params.fractionalBeta ?? current?.fractionalBeta ?? 0.7,
            fractionalWaitingScale: params.fractionalWaitingScale ?? current?.fractionalWaitingScale ?? 0.1,
            fractionalJumpLength: params.fractionalJumpLength ?? current?.fractionalJumpLength ?? 10,
          } as RandomWalkParams,
        };
      }),
      setRandomWalkSimLayouts: (layouts) => set({ randomWalkSimLayouts: layouts }),
      setRandomWalkSimCollapsed: (key, collapsed) => set((state) => ({
        randomWalkSimCollapsed: { ...state.randomWalkSimCollapsed, [key]: collapsed },
      })),
      setRandomWalkViewportZoom: (zoom) => set({ randomWalkViewportZoom: Math.min(3, Math.max(0.5, zoom)) }),
      setRandomWalkUIState: (partial) => set((state) => ({ randomWalkUIState: { ...state.randomWalkUIState, ...partial } })),
      setRandomWalkSimulationState: (state) => set({ randomWalkSimulationState: state }),
      setSelectedHistoryIndex: (index) => set((state) => ({
        randomWalkSimulationState: {
          ...state.randomWalkSimulationState,
          selectedHistoryIndex: index
        }
      })),
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
      setUseNewEngine: (useNew) => set({ useNewEngine: useNew }),
      setUseStreamingObservables: (useStreaming) => set({ useStreamingObservables: useStreaming }),
      setUseGPU: (useGPU) => set({ useGPU: useGPU }),
      setIsRunning: (isRunning) => set((state) => ({
        randomWalkSimulationState: {
          ...state.randomWalkSimulationState,
          isRunning
        }
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
      saveSimulationSnapshot: (particleData, densityHistory, observableData, gpuState?) =>
        set((state) => ({
          randomWalkSimulationState: {
            ...state.randomWalkSimulationState,
            particleData,
            densityHistory,
            observableData,
            gpuState: gpuState || state.randomWalkSimulationState.gpuState
          }
        })),
      setPdeState: (partial) =>
        set((state) => ({ pdeState: { ...state.pdeState, ...partial } })),
      setPdeUIState: (partial) =>
        set((state) => ({ pdeUIState: { ...state.pdeUIState, ...partial } })),
      setSpheroidWalkUIState: (partial) =>
        set((state) => ({ spheroidWalkUIState: { ...DEFAULT_SPHEROID_WALK_UI_STATE, ...state.spheroidWalkUIState, ...partial } })),
    }),
    { 
      name: 'qc-diffusion-app-state',
      version: 1,
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AppState>
        const savedGridParams = persisted.gridLayoutParams as Partial<RandomWalkParams> | undefined
        const persistedLayouts = persisted.randomWalkSimLayouts ?? []
        const newPanelRow = persistedLayouts.reduce((bottom, layout) => Math.max(bottom, layout.y + layout.h), 0) + 1
        return {
          ...currentState,
          ...persisted,
          randomWalkSimLayouts: currentState.randomWalkSimLayouts.map((defaultLayout) => {
            const savedLayout = persistedLayouts.find((layout) => layout.i === defaultLayout.i)
            if (savedLayout) return savedLayout
            if (persistedLayouts.length && (defaultLayout.i === 'persistentDiagnostics' || defaultLayout.i === 'diagnostics')) {
              return { ...defaultLayout, y: newPanelRow }
            }
            return defaultLayout
          }),
          randomWalkSimCollapsed: persisted.randomWalkSimCollapsed ?? {},
          randomWalkViewportZoom: persisted.randomWalkViewportZoom ?? 1,
          gridLayoutParams: {
            ...currentState.gridLayoutParams,
            ...savedGridParams,
            strategies: savedGridParams?.strategies?.filter((strategy) => strategy !== 'collisions').length
              ? savedGridParams.strategies.filter((strategy) => strategy !== 'collisions')
              : ['simple'],
            interparticleCollisions: Boolean(
              savedGridParams?.interparticleCollisions || savedGridParams?.strategies?.includes('collisions')
            ),
            seed: savedGridParams?.seed ?? currentState.gridLayoutParams.seed,
            levyAlpha: savedGridParams?.levyAlpha ?? currentState.gridLayoutParams.levyAlpha,
            levyScale: savedGridParams?.levyScale ?? currentState.gridLayoutParams.levyScale,
            fractionalBeta: savedGridParams?.fractionalBeta ?? currentState.gridLayoutParams.fractionalBeta,
            fractionalWaitingScale: savedGridParams?.fractionalWaitingScale ?? currentState.gridLayoutParams.fractionalWaitingScale,
            fractionalJumpLength: savedGridParams?.fractionalJumpLength ?? currentState.gridLayoutParams.fractionalJumpLength,
          },
          spheroidWalkUIState: {
            ...DEFAULT_SPHEROID_WALK_UI_STATE,
            ...persisted.spheroidWalkUIState,
          },
        }
      },
      migrate: (state: any, version) => {
        if (!state) return state;
        const glp = state.gridLayoutParams || {};
        if (glp.minParticles === undefined) glp.minParticles = 0;
        if (glp.maxParticles === undefined) glp.maxParticles = 2000;
        if (glp.dt === undefined) glp.dt = 0.01;
        if (!Array.isArray(glp.strategies)) glp.strategies = ['simple'];
        if (glp.strategies.includes('collisions')) glp.interparticleCollisions = true;
        glp.strategies = glp.strategies.filter((strategy: string) => strategy !== 'collisions');
        if (glp.strategies.length === 0) glp.strategies = ['simple'];
        if (glp.seed === undefined) glp.seed = 42;
        if (glp.levyAlpha === undefined) glp.levyAlpha = 1.5;
        if (glp.levyScale === undefined) glp.levyScale = 20;
        if (glp.fractionalBeta === undefined) glp.fractionalBeta = 0.7;
        if (glp.fractionalWaitingScale === undefined) glp.fractionalWaitingScale = 0.1;
        if (glp.fractionalJumpLength === undefined) glp.fractionalJumpLength = 10;
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
        randomWalkSimCollapsed: state.randomWalkSimCollapsed,
        randomWalkViewportZoom: state.randomWalkViewportZoom,
        randomWalkUIState: state.randomWalkUIState,
        spheroidWalkUIState: state.spheroidWalkUIState,
        randomWalkSimulationState: state.randomWalkSimulationState,
        observablesWindow: state.observablesWindow,
        customObservablesWindow: state.customObservablesWindow,
        zCounter: state.zCounter,
        observablesCollapsed: state.observablesCollapsed,
        customObservablesCollapsed: state.customObservablesCollapsed,
        customObservables: state.customObservables,
        customObservableVisibility: state.customObservableVisibility,
        useNewEngine: state.useNewEngine,
        useStreamingObservables: state.useStreamingObservables,
        useGPU: state.useGPU,
      }),
    }
  )
)
