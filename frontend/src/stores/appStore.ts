import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SimulationParams } from '../types'

interface GridLayoutParams {
  particles: number
  collisionRate: number
  jumpLength: number
  velocity: number
}

interface AppState {
  activeTab: 'simulation' | 'randomwalk' | 'gridlayout'
  simulationParams: SimulationParams
  gridLayoutParams: GridLayoutParams
  setActiveTab: (tab: 'simulation' | 'randomwalk' | 'gridlayout') => void
  setSimulationParams: (params: SimulationParams) => void
  setGridLayoutParams: (params: GridLayoutParams) => void
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
      },
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSimulationParams: (params) => set({ simulationParams: params }),
      setGridLayoutParams: (params) => set({ gridLayoutParams: params }),
    }),
    { 
      name: 'qc-diffusion-app-state',
      // Persist everything except runtime state
      partialize: (state) => ({
        activeTab: state.activeTab,
        simulationParams: state.simulationParams,
        gridLayoutParams: state.gridLayoutParams,
      }),
    }
  )
)
