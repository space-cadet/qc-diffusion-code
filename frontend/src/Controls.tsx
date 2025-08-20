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

  const handleEquationToggle = (equation: string) => {
    const currentEquations = params.selectedEquations || ['telegraph', 'diffusion'];
    const newEquations = currentEquations.includes(equation)
      ? currentEquations.filter(eq => eq !== equation)
      : [...currentEquations, equation];
    onChange({ ...params, selectedEquations: newEquations });
  };

  const selectedEquations = params.selectedEquations || ['telegraph', 'diffusion'];

  return (
    <div className="p-4 bg-gray-50 border-r border-gray-200">
      <h2 className="text-lg font-semibold mb-6">Parameters</h2>
      
      {/* Equation Selection with Parameters */}
      <div className="mb-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Equations</h3>
        
        {/* Telegraph Equation */}
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <label className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={selectedEquations.includes('telegraph')}
              onChange={() => handleEquationToggle('telegraph')}
              className="mr-2"
            />
            <span className="text-sm font-medium">Telegraph Equation</span>
          </label>
          
          {selectedEquations.includes('telegraph') && (
            <div className="ml-6 space-y-3 border-l-2 border-gray-200 pl-3">
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
            </div>
          )}
        </div>

        {/* Diffusion Equation */}
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <label className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={selectedEquations.includes('diffusion')}
              onChange={() => handleEquationToggle('diffusion')}
              className="mr-2"
            />
            <span className="text-sm font-medium">Diffusion Equation</span>
          </label>
          
          {selectedEquations.includes('diffusion') && (
            <div className="ml-6 space-y-3 border-l-2 border-gray-200 pl-3">
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
          )}
        </div>

        {/* Wheeler-DeWitt Equation (Future) */}
        <div className="p-3 bg-white rounded-lg border border-gray-200 opacity-50">
          <label className="flex items-center">
            <input
              type="checkbox"
              disabled
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-400">Wheeler-DeWitt (Future)</span>
          </label>
        </div>
      </div>

      {/* Initial Conditions */}
      <div className="mb-6 p-3 bg-white rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">Initial Conditions</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Starting Distribution</label>
            <select
              value={params.distribution}
              onChange={(e) => onChange({ ...params, distribution: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
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
        </div>
      </div>

      {/* Simulation Settings */}
      <div className="mb-6 p-3 bg-white rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">Simulation Settings</h3>
        <div className="space-y-4">
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
        </div>
      </div>


    </div>
  );
}
