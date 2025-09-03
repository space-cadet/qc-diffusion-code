export interface ObservableField {
  label: string;
  path: string;
  format: 'number' | 'scientific' | 'fixed';
  color?: string;
  precision?: number;
}

import type { RandomWalkUIState } from "../stores/appStore";

export interface ObservableConfig {
  id: string;
  name: string;
  text: string;
  pollingInterval: number; // milliseconds
  fields: ObservableField[];
  uiToggle: keyof RandomWalkUIState;
}

export const BUILT_IN_OBSERVABLES: Record<string, ObservableConfig> = {
  particleCount: {
    id: 'particleCount',
    name: 'Particle Count N(t)',
    text: `name: particleCount, reduce: count`,
    uiToggle: 'showParticleCount',
    pollingInterval: 200, // Less frequent updates needed
    fields: [
      { label: 'Count', path: 'value', format: 'number' },
      { label: 'Time', path: 'timestamp', format: 'fixed', precision: 2 }
    ]
  },
  kineticEnergy: {
    id: 'kineticEnergy',
    name: 'Kinetic Energy',
    text: `name: kineticEnergy, select: 0.5 * (velocity.vx^2 + velocity.vy^2), reduce: mean`,
    uiToggle: 'showKineticEnergy',
    pollingInterval: 100, // Standard polling for energy values
    fields: [
      { label: 'Average KE', path: 'value', format: 'number', precision: 10 },
      { label: 'Time', path: 'timestamp', format: 'fixed', precision: 2 }
    ]
  },
  momentum: {
    id: 'momentum',
    name: 'Total Momentum',
    text: `observable "momentum" { select: velocity, reduce: sum }`,
    uiToggle: 'showTotalMomentum',
    pollingInterval: 50, // Fast updates for momentum (rapidly changing)
    fields: [
      { label: '|P| total', path: 'totalMomentumMagnitude', format: 'fixed', precision: 2 },
      { label: 'Px', path: 'totalMomentumX', format: 'fixed', precision: 2, color: 'red' },
      { label: 'Py', path: 'totalMomentumY', format: 'fixed', precision: 2, color: 'green' },
      { label: '|P| avg', path: 'averageMomentumMagnitude', format: 'fixed', precision: 4 },
      { label: 'Active particles', path: 'activeParticleCount', format: 'number' },
      { label: 'Time', path: 'timestamp', format: 'fixed', precision: 2 }
    ]
  },
  msd: {
    id: 'msd',
    name: 'Mean Squared Displacement',
    text: `observable "msd" { select: position.magnitude^2, reduce: mean }`,
    uiToggle: 'showMSD',
    pollingInterval: 500, // Slower updates for MSD (cumulative metric)
    fields: [
      { label: 'MSD', path: 'meanSquaredDisplacement', format: 'fixed', precision: 1 },
      { label: 'RMSD', path: 'rootMeanSquaredDisplacement', format: 'fixed', precision: 2 },
      { label: 'Max disp', path: 'maxDisplacement', format: 'fixed', precision: 2, color: 'orange' },
      { label: 'Min disp', path: 'minDisplacement', format: 'fixed', precision: 2, color: 'blue' },
      { label: 'Active particles', path: 'activeParticleCount', format: 'number' },
      { label: 'Time', path: 'timestamp', format: 'fixed', precision: 2 }
    ]
  }
};
