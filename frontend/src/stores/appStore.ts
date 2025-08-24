import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SimulationParams } from '../types'
import type { Layout } from 'react-grid-layout'

interface GridLayoutParams {
  particles: number
  collisionRate: number
  jumpLength: number
  velocity: number
  simulationType: 'continuum' | 'graph'
  strategy: 'ctrw' | 'simple' | 'levy' | 'fractional'
  boundaryCondition: 'periodic' | 'reflective' | 'absorbing'
  graphType: 'lattice1D' | 'lattice2D' | 'path' | 'complete'
  graphSize: number
  isPeriodic: boolean
  showEdgeWeights: boolean
  showAnimation: boolean
  // Initial distribution controls
  initialDistType: 'uniform' | 'gaussian' | 'ring' | 'stripe' | 'grid'
  // Gaussian
  distSigmaX: number
  distSigmaY: number
  // Ring
  distR0: number
  distDR: number
  // Stripe (vertical band)
  distThickness: number
  // Grid
  distNx: number
  distNy: number
  distJitter: number
}

interface RandomWalkUIState {
  isStrategyOpen: boolean
  isBoundaryOpen: boolean
  isParametersOpen: boolean
  isDistributionOpen: boolean
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

interface RandomWalkSimulationState {
  time: number
  collisions: number
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

interface AppState {
  activeTab: 'simulation' | 'randomwalk' | 'gridlayout' | 'randomwalksim'
  simulationParams: SimulationParams
  gridLayoutParams: GridLayoutParams
  randomWalkSimLayouts: Layout[]
  randomWalkUIState: RandomWalkUIState
  randomWalkSimulationState: RandomWalkSimulationState
  setActiveTab: (tab: 'simulation' | 'randomwalk' | 'gridlayout' | 'randomwalksim') => void
  setSimulationParams: (params: SimulationParams) => void
  setGridLayoutParams: (params: GridLayoutParams) => void
  setRandomWalkSimLayouts: (layouts: Layout[]) => void
  setRandomWalkUIState: (state: RandomWalkUIState) => void
  setRandomWalkSimulationState: (state: RandomWalkSimulationState) => void
  updateSimulationMetrics: (time: number, collisions: number, status: RandomWalkSimulationState['status']) => void
  saveSimulationSnapshot: (
    particleData: RandomWalkSimulationState['particleData'],
    densityHistory: RandomWalkSimulationState['densityHistory'],
    observableData: RandomWalkSimulationState['observableData']
  ) => void
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
        dt: 0.01,
        distribution: "gaussian",
        x_min: -5.0,
        x_max: 5.0,
        mesh_size: 64,
        selectedEquations: ['telegraph', 'diffusion'],
      },
      gridLayoutParams: {
        particles: 1000,
        collisionRate: 2.5,
        jumpLength: 0.1,
        velocity: 1.0,
        simulationType: 'continuum',
        strategy: 'ctrw',
        boundaryCondition: 'periodic',
        graphType: 'lattice1D',
        graphSize: 20,
        isPeriodic: false,
        showEdgeWeights: false,
        showAnimation: true,
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
        status: 'Stopped',
        particleData: null,
        densityHistory: [],
        observableData: {},
      },
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSimulationParams: (params) => set({ simulationParams: params }),
      setGridLayoutParams: (params) => set({ gridLayoutParams: params }),
      setRandomWalkSimLayouts: (layouts) => set({ randomWalkSimLayouts: layouts }),
      setRandomWalkUIState: (state) => set({ randomWalkUIState: state }),
      setRandomWalkSimulationState: (state) => set({ randomWalkSimulationState: state }),
      updateSimulationMetrics: (time, collisions, status) => 
        set((state) => ({
          randomWalkSimulationState: {
            ...state.randomWalkSimulationState,
            time,
            collisions,
            status
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
    }),
    { 
      name: 'qc-diffusion-app-state',
      // Persist everything except runtime state
      partialize: (state) => ({
        activeTab: state.activeTab,
        simulationParams: state.simulationParams,
        gridLayoutParams: state.gridLayoutParams,
        randomWalkSimLayouts: state.randomWalkSimLayouts,
        randomWalkUIState: state.randomWalkUIState,
        randomWalkSimulationState: state.randomWalkSimulationState,
      }),
    }
  )
)
