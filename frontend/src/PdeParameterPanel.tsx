import React, { useEffect, useState } from 'react';
import type { SimulationParams, SolverType } from './types';
import { useAppStore } from './stores/appStore';

interface ControlsProps {
  params: SimulationParams;
  onChange: (params: SimulationParams) => void;
}

export default function Controls({ params, onChange }: ControlsProps) {
  const { pdeUIState, setPdeUIState } = useAppStore();
  const [solverOpen, setSolverOpen] = useState<boolean>(false);
  // Local string states to allow negative typing and intermediate values
  const [centerStr, setCenterStr] = useState<string>(String(params.dist_center ?? 0));
  const [dgCenter1Str, setDgCenter1Str] = useState<string>(String(params.dg_center1 ?? -1));
  const [dgCenter2Str, setDgCenter2Str] = useState<string>(String(params.dg_center2 ?? 1));
  const [stepLeftStr, setStepLeftStr] = useState<string>(String(params.step_left ?? -1));
  const [stepRightStr, setStepRightStr] = useState<string>(String(params.step_right ?? 1));

  // Sync local strings when params change from outside (e.g., reset, load)
  useEffect(() => { setCenterStr(String(params.dist_center ?? 0)); }, [params.dist_center]);
  useEffect(() => { setDgCenter1Str(String(params.dg_center1 ?? -1)); }, [params.dg_center1]);
  useEffect(() => { setDgCenter2Str(String(params.dg_center2 ?? 1)); }, [params.dg_center2]);
  useEffect(() => { setStepLeftStr(String(params.step_left ?? -1)); }, [params.step_left]);
  useEffect(() => { setStepRightStr(String(params.step_right ?? 1)); }, [params.step_right]);
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

  const handleSolverChange = (equation: 'telegraph' | 'diffusion', solver: SolverType) => {
    const newConfig = { ...params.solver_config, [equation]: solver };
    onChange({ ...params, solver_config: newConfig });
  };

  const selectedEquations = params.selectedEquations || ['telegraph', 'diffusion'];

  return (
    <div className="p-4 bg-gray-50 border-r border-gray-200">
      <h2 className="text-lg font-semibold mb-6">Parameters</h2>

      {/* Solver Selection (foldable) */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setSolverOpen(!solverOpen)}
          className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <span className="text-sm font-semibold text-gray-700">Solver</span>
          <span className="text-xs text-gray-500">{solverOpen ? 'Hide' : 'Show'}</span>
        </button>
        {solverOpen && (
          <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={params.solver_type ?? 'python'}
                onChange={(e) => onChange({ ...params, solver_type: e.target.value as 'python' | 'webgl' })}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="python">CPU (Backend Python)</option>
                <option value="webgl">GPU (WebGL Explicit)</option>
              </select>
            </div>
            {params.solver_type === 'webgl' && (
              <div className="text-xs text-gray-600">
                Forward Euler is CFL-limited. If unstable at high k, reduce dt or switch to CPU.
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Equations Panel (foldable + scrollable) */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setPdeUIState({ equationsOpen: !pdeUIState.equationsOpen })}
          className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <span className="text-sm font-semibold text-gray-700">Equations</span>
          <span className="text-xs text-gray-500">{pdeUIState.equationsOpen ? 'Hide' : 'Show'}</span>
        </button>
        {pdeUIState.equationsOpen && (
          <div className="mt-2 max-h-64 overflow-y-auto space-y-3 pr-1">
            {/* Telegraph */}
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedEquations.includes('telegraph')}
                    onChange={() => handleEquationToggle('telegraph')}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">Telegraph Equation</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPdeUIState({ telegraphOpen: !pdeUIState.telegraphOpen })}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  {pdeUIState.telegraphOpen ? 'Collapse' : 'Expand'}
                </button>
              </div>
              {pdeUIState.telegraphOpen && (
                <div className="mt-3 ml-2 space-y-3 border-l-2 border-gray-200 pl-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Collision Rate (a): {params.collision_rate.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="any"
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
                      step="any"
                      value={params.velocity}
                      onChange={(e) => handleChange('velocity', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Solver</label>
                    <select
                      value={params.solver_config?.telegraph ?? 'forward-euler'}
                      onChange={(e) => handleSolverChange('telegraph', e.target.value as SolverType)}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="lax-wendroff">Lax-Wendroff</option>
                      <option value="forward-euler">Forward Euler</option>
                      <option value="rk4">Runge-Kutta 4</option>
                      <option value="crank-nicolson">Crank-Nicolson</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Diffusion */}
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedEquations.includes('diffusion')}
                    onChange={() => handleEquationToggle('diffusion')}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">Diffusion Equation</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPdeUIState({ diffusionOpen: !pdeUIState.diffusionOpen })}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  {pdeUIState.diffusionOpen ? 'Collapse' : 'Expand'}
                </button>
              </div>
              {pdeUIState.diffusionOpen && (
                <div className="mt-3 ml-2 space-y-3 border-l-2 border-gray-200 pl-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Diffusivity (k): {params.diffusivity.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="any"
                      value={params.diffusivity}
                      onChange={(e) => handleChange('diffusivity', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Solver</label>
                    <select
                      value={params.solver_config?.diffusion ?? 'crank-nicolson'}
                      onChange={(e) => handleSolverChange('diffusion', e.target.value as SolverType)}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="crank-nicolson">Crank-Nicolson</option>
                      <option value="forward-euler">Forward Euler</option>
                      <option value="rk4">Runge-Kutta 4</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Wheeler-DeWitt (disabled) */}
            <div className="p-3 bg-white rounded-lg border border-gray-200 opacity-50">
              <label className="flex items-center">
                <input type="checkbox" disabled className="mr-2" />
                <span className="text-sm font-medium text-gray-400">Wheeler-DeWitt (Future)</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Solver Parameters - conditional based on selected solvers */}
      {(params.solver_config?.telegraph === 'crank-nicolson' || 
        params.solver_config?.diffusion === 'crank-nicolson' ||
        params.solver_config?.telegraph === 'rk4' || 
        params.solver_config?.diffusion === 'rk4') && (
        <div className="mb-6 p-3 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Solver Parameters</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">DT Factor</label>
              <input
                type="number"
                min="0.1"
                max="2.0"
                step="0.1"
                value={params.solver_params?.dt_factor ?? 1.0}
                onChange={(e) => onChange({ 
                  ...params, 
                  solver_params: { ...params.solver_params, dt_factor: parseFloat(e.target.value) }
                })}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
            {(params.solver_config?.telegraph === 'crank-nicolson' || 
              params.solver_config?.diffusion === 'crank-nicolson') && (
              <>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">CN Theta</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={params.solver_params?.theta ?? 0.5}
                    onChange={(e) => onChange({ 
                      ...params, 
                      solver_params: { ...params.solver_params, theta: parseFloat(e.target.value) }
                    })}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tolerance</label>
                  <input
                    type="number"
                    min="1e-8"
                    max="1e-3"
                    step="1e-7"
                    value={params.solver_params?.tolerance ?? 1e-6}
                    onChange={(e) => onChange({ 
                      ...params, 
                      solver_params: { ...params.solver_params, tolerance: parseFloat(e.target.value) }
                    })}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Max Iter</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    step="10"
                    value={params.solver_params?.max_iter ?? 100}
                    onChange={(e) => onChange({ 
                      ...params, 
                      solver_params: { ...params.solver_params, max_iter: parseInt(e.target.value) }
                    })}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Initial Conditions (foldable) */}
      <div className="mb-6 p-3 bg-white rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => setPdeUIState({ initialConditionsOpen: !pdeUIState.initialConditionsOpen })}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Initial Conditions</h3>
          <span className="text-xs text-gray-500">{pdeUIState.initialConditionsOpen ? 'Hide' : 'Show'}</span>
        </button>
        {pdeUIState.initialConditionsOpen && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Starting Distribution</label>
            <select
              value={params.distribution}
              onChange={(e) => onChange({ ...params, distribution: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            >
              <option value="gaussian">Gaussian</option>
              <option value="double_gaussian">Double Gaussian</option>
              <option value="step">Step Function</option>
              <option value="delta">Delta Function</option>
              <option value="sine">Sine Wave</option>
              <option value="cosine">Cosine Wave</option>
            </select>
          </div>

          {/* Gaussian / Delta parameters */}
          {(params.distribution === 'gaussian' || params.distribution === 'delta') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Center</label>
                <input
                  type="text"
                  value={centerStr}
                  onChange={(e) => setCenterStr(e.target.value)}
                  onBlur={() => {
                    const v = parseFloat(centerStr);
                    if (!Number.isNaN(v)) onChange({ ...params, dist_center: v });
                  }}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sigma</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={params.dist_sigma ?? 1}
                  onChange={(e) => onChange({ ...params, dist_sigma: parseFloat(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          )}

          {/* Double Gaussian parameters */}
          {params.distribution === 'double_gaussian' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Center 1</label>
                  <input
                    type="text"
                    value={dgCenter1Str}
                    onChange={(e) => setDgCenter1Str(e.target.value)}
                    onBlur={() => {
                      const v = parseFloat(dgCenter1Str);
                      if (!Number.isNaN(v)) onChange({ ...params, dg_center1: v });
                    }}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Sigma 1</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={params.dg_sigma1 ?? 0.5}
                    onChange={(e) => onChange({ ...params, dg_sigma1: parseFloat(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Center 2</label>
                  <input
                    type="text"
                    value={dgCenter2Str}
                    onChange={(e) => setDgCenter2Str(e.target.value)}
                    onBlur={() => {
                      const v = parseFloat(dgCenter2Str);
                      if (!Number.isNaN(v)) onChange({ ...params, dg_center2: v });
                    }}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Sigma 2</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={params.dg_sigma2 ?? 0.5}
                    onChange={(e) => onChange({ ...params, dg_sigma2: parseFloat(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Weight (mix of #1)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={params.dg_weight ?? 0.5}
                  onChange={(e) => onChange({ ...params, dg_weight: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-right">{(params.dg_weight ?? 0.5).toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* Step parameters */}
          {params.distribution === 'step' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Left</label>
                <input
                  type="text"
                  value={stepLeftStr}
                  onChange={(e) => setStepLeftStr(e.target.value)}
                  onBlur={() => {
                    const v = parseFloat(stepLeftStr);
                    if (!Number.isNaN(v)) onChange({ ...params, step_left: v });
                  }}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Right</label>
                <input
                  type="text"
                  value={stepRightStr}
                  onChange={(e) => setStepRightStr(e.target.value)}
                  onBlur={() => {
                    const v = parseFloat(stepRightStr);
                    if (!Number.isNaN(v)) onChange({ ...params, step_right: v });
                  }}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Height</label>
                <input
                  type="number"
                  value={params.step_height ?? 1}
                  onChange={(e) => onChange({ ...params, step_height: parseFloat(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          )}

          {/* Sine parameters */}
          {params.distribution === 'sine' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Frequency (π·x)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={params.sine_freq ?? 1}
                  onChange={(e) => onChange({ ...params, sine_freq: parseFloat(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Amplitude</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={params.sine_amp ?? 1}
                  onChange={(e) => onChange({ ...params, sine_amp: parseFloat(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          )}

          {/* Cosine parameters */}
          {params.distribution === 'cosine' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Frequency (π·x)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={params.cos_freq ?? 1}
                  onChange={(e) => onChange({ ...params, cos_freq: parseFloat(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Amplitude</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={params.cos_amp ?? 1}
                  onChange={(e) => onChange({ ...params, cos_amp: parseFloat(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Simulation Settings (foldable) */}
      <div className="mb-6 p-3 bg-white rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => setPdeUIState({ simulationSettingsOpen: !pdeUIState.simulationSettingsOpen })}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Simulation Settings</h3>
          <span className="text-xs text-gray-500">{pdeUIState.simulationSettingsOpen ? 'Hide' : 'Show'}</span>
        </button>
        {pdeUIState.simulationSettingsOpen && (
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
              x_min: {params.x_min.toFixed(1)}
            </label>
            <input
              type="range"
              min="-10"
              max="0"
              step="any"
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
              step="any"
              value={params.x_max}
              onChange={(e) => handleChange('x_max', parseFloat(e.target.value))}
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
              step="any"
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
        )}
      </div>


    </div>
  );
}
