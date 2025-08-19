import React from 'react';
import type { SimulationParams } from './types';

interface ControlsProps {
  params: SimulationParams;
  onChange: (params: SimulationParams) => void;
}

export default function Controls({ params, onChange }: ControlsProps) {
  const handleChange = (key: keyof SimulationParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="p-4 bg-gray-50 border-r border-gray-200">
      <h2 className="text-lg font-semibold mb-4">Parameters</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Collision Rate (a): {params.collision_rate.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={params.collision_rate}
            onChange={(e) => handleChange('collision_rate', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Velocity (v): {params.velocity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={params.velocity}
            onChange={(e) => handleChange('velocity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Diffusivity (k): {params.diffusivity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={params.diffusivity}
            onChange={(e) => handleChange('diffusivity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
