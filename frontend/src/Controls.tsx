import React from 'react';
import type { SimulationParams } from './types';

interface ControlsProps {
  params: SimulationParams;
  onChange: (params: SimulationParams) => void;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onReset: () => void;
}

export default function Controls({ params, onChange, isRunning, onStart, onStop, onPause, onReset }: ControlsProps) {
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

        <div>
          <label className="block text-sm font-medium mb-1">Starting Distribution</label>
          <select
            value={params.distribution}
            onChange={(e) => onChange({ ...params, distribution: e.target.value })}
            className="w-full p-1 border border-gray-300 rounded text-sm"
          >
            <option value="gaussian">Gaussian</option>
            <option value="step">Step Function</option>
            <option value="delta">Delta Function</option>
            <option value="sine">Sine Wave</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            x_min: {params.x_min.toFixed(1)}
          </label>
          <input
            type="range"
            min="-10"
            max="0"
            step="0.5"
            value={params.x_min}
            onChange={(e) => handleChange('x_min', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            x_max: {params.x_max.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={params.x_max}
            onChange={(e) => handleChange('x_max', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Mesh Size: {params.mesh_size}
          </label>
          <input
            type="range"
            min="32"
            max="256"
            step="16"
            value={params.mesh_size}
            onChange={(e) => handleChange('mesh_size', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Total Time: {params.t_range.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.5"
            max="20"
            step="0.5"
            value={params.t_range}
            onChange={(e) => handleChange('t_range', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Time Step: {params.dt.toFixed(3)}
          </label>
          <input
            type="range"
            min="0.001"
            max="0.1"
            step="0.001"
            value={params.dt}
            onChange={(e) => handleChange('dt', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Solver Type</label>
          <div className="flex gap-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="solver"
                value="python"
                checked={params.solver_type !== 'webgl'}
                onChange={() => onChange({ ...params, solver_type: 'python' })}
                className="mr-1"
              />
              Python
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="solver"
                value="webgl"
                checked={params.solver_type === 'webgl'}
                onChange={() => onChange({ ...params, solver_type: 'webgl' })}
                className="mr-1"
              />
              WebGL
            </label>
          </div>
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
          <button
            onClick={onReset}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
