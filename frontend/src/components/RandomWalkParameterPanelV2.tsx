import React, { useMemo } from "react";
import { useAppStore } from "../stores/appStore";
import { LogNumberSlider } from './common/LogNumberSlider';

export const RandomWalkParameterPanelV2 = ({
  gridLayoutParams,
  setGridLayoutParams,
  simulationState,
  setSimulationState,
  handleStart,
  handlePause,
  handleReset,
  handleInitialize,
}: any) => {
  const { randomWalkUIState, setRandomWalkUIState } = useAppStore();
  
  const updateUIState = (updates: any) => {
    setRandomWalkUIState({ ...randomWalkUIState, ...updates });
  };

  const minP = useMemo(() => gridLayoutParams.minParticles ?? 0, [gridLayoutParams.minParticles]);
  const maxP = useMemo(() => gridLayoutParams.maxParticles ?? 2000, [gridLayoutParams.maxParticles]);

  return (
    <div className="bg-white border rounded-lg p-4 h-full overflow-auto">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">
        Parameters
      </h3>

      {/* Simulation Controls */}
      <div className="mb-6 space-y-3">
        <button
          onClick={handleInitialize}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          Initialize
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleStart}
            disabled={simulationState.isRunning}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:bg-gray-400"
          >
            Start
          </button>

          <button
            onClick={handlePause}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
          >
            {simulationState.isRunning ? 'Pause' : 'Resume'}
          </button>
        </div>

        <button
          onClick={handleReset}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
        >
          Reset
        </button>

        {/* Status Display */}
        <div className="border rounded-lg p-3 bg-gray-50 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-medium">Status:</span>
            <span className={`font-medium ${simulationState.isRunning ? 'text-green-600' : 'text-gray-500'}`}>
              {simulationState.isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span className="font-mono">{(simulationState.time || 0).toFixed(1)}s</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Simulation Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Simulation Type:</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="simulationType"
                value="continuum"
                checked={gridLayoutParams.simulationType === "continuum"}
                onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, simulationType: e.target.value })}
                className="mr-2"
              />
              Continuum
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="simulationType"
                value="graph"
                checked={gridLayoutParams.simulationType === "graph"}
                onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, simulationType: e.target.value })}
                className="mr-2"
              />
              Graph
            </label>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Dimension:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dimension"
                  value="1D"
                  checked={gridLayoutParams.dimension === "1D"}
                  onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, dimension: e.target.value })}
                  className="mr-2"
                />
                1D
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dimension"
                  value="2D"
                  checked={gridLayoutParams.dimension === "2D"}
                  onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, dimension: e.target.value })}
                  className="mr-2"
                />
                2D
              </label>
            </div>
          </div>
        </div>

        {/* Particles */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Particles: {gridLayoutParams.particles}
          </label>
          <input
            type="range"
            min={minP}
            max={maxP}
            value={gridLayoutParams.particles}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, particles: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Velocity */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Velocity: {gridLayoutParams.velocity}
          </label>
          <input
            type="range"
            min={0.1}
            max={10}
            step={0.1}
            value={gridLayoutParams.velocity}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, velocity: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Temperature: {gridLayoutParams.temperature}
          </label>
          <input
            type="range"
            min={0.1}
            max={10}
            step={0.1}
            value={gridLayoutParams.temperature}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Strategy Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Strategy:</label>
          <select
            value={gridLayoutParams.strategies?.[0] || 'simple'}
            onChange={(e) => {
              const strategy = e.target.value as 'ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions';
              setGridLayoutParams({ ...gridLayoutParams, strategies: [strategy] });
            }}
            className="w-full border rounded px-2 py-1 text-sm"
          >
            <option value="simple">Simple (Ballistic)</option>
            <option value="ctrw">CTRW (Continuous Time Random Walk)</option>
            <option value="levy">Lévy Flight</option>
            <option value="fractional">Fractional Diffusion</option>
            <option value="collisions">Interparticle Collisions</option>
          </select>
        </div>

        {/* Collision Rate */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Collision Rate: {gridLayoutParams.collisionRate}
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={gridLayoutParams.collisionRate}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, collisionRate: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Boundary Condition */}
        <div>
          <label className="block text-sm font-medium mb-2">Boundary Condition:</label>
          <select
            value={gridLayoutParams.boundaryCondition}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, boundaryCondition: e.target.value })}
            className="w-full border rounded px-2 py-1 text-sm"
          >
            <option value="periodic">Periodic</option>
            <option value="reflecting">Reflecting</option>
            <option value="absorbing">Absorbing</option>
          </select>
        </div>

        {/* Interparticle Collisions */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={gridLayoutParams.interparticleCollisions}
              onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, interparticleCollisions: e.target.checked })}
              className="mr-2"
            />
            Interparticle Collisions
          </label>
        </div>

        {/* Initial Distribution */}
        <div>
          <label className="block text-sm font-medium mb-2">Initial Distribution:</label>
          <select
            value={gridLayoutParams.initialDistType || "uniform"}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, initialDistType: e.target.value })}
            className="w-full border rounded px-2 py-1 text-sm"
          >
            <option value="uniform">Uniform</option>
            <option value="gaussian">Gaussian</option>
            <option value="ring">Ring</option>
            <option value="stripe">Stripe</option>
            <option value="grid">Grid</option>
          </select>
        </div>
      </div>
    </div>
  );
};
