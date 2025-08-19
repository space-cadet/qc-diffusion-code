import React from 'react';
import type { SimulationParams } from './types';

interface ControlsProps {
  params: SimulationParams;
  onChange: (params: SimulationParams) => void;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
}

export default function Controls({ params, onChange, isRunning, onStart, onStop, onPause }: ControlsProps) {
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

      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-semibold">Simulation Control</h3>
        <div className="flex gap-2">
          <button
            onClick={onStart}
            disabled={isRunning}
            className="px-3 py-1 bg-green-500 text-white rounded disabled:bg-gray-300 text-sm"
          >
            Start
          </button>
          <button
            onClick={onPause}
            disabled={!isRunning}
            className="px-3 py-1 bg-yellow-500 text-white rounded disabled:bg-gray-300 text-sm"
          >
            Pause
          </button>
          <button
            onClick={onStop}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}
