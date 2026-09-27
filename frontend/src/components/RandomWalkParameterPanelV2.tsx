import React, { useMemo } from "react";
import { useAppStore } from "../stores/appStore";
import { LogNumberSlider } from './common/LogNumberSlider';
import type { T15Mode, T15RunConfig } from "../t15/t15RandomWalk";

type ProcessMode = "standard" | T15Mode;

export const RandomWalkParameterPanelV2 = ({
  gridLayoutParams,
  setGridLayoutParams,
  simulationState,
  setSimulationState,
  handleStart,
  handlePause,
  handleReset,
  handleInitialize,
  processMode,
  onProcessModeChange,
  t15Config,
  onT15ConfigChange,
}: any) => {
  const { randomWalkUIState, setRandomWalkUIState } = useAppStore();
  
  const updateUIState = (updates: any) => {
    setRandomWalkUIState({ ...randomWalkUIState, ...updates });
  };

  const minP = useMemo(() => gridLayoutParams.minParticles ?? 0, [gridLayoutParams.minParticles]);
  const maxP = useMemo(() => gridLayoutParams.maxParticles ?? 2000, [gridLayoutParams.maxParticles]);
  const selectedStrategy = gridLayoutParams.strategies?.find((strategy: string) =>
    ['simple', 'ctrw', 'levy', 'fractional'].includes(strategy)
  ) || 'simple';
  const levyAlpha = gridLayoutParams.levyAlpha ?? 1.5;
  const levyScale = gridLayoutParams.levyScale ?? 20;
  const fractionalBeta = gridLayoutParams.fractionalBeta ?? 0.7;
  const fractionalWaitingScale = gridLayoutParams.fractionalWaitingScale ?? 0.1;
  const fractionalJumpLength = gridLayoutParams.fractionalJumpLength ?? 10;

  return (
    <div className="bg-white border rounded-lg p-4 h-full overflow-auto">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">
        Parameters
      </h3>

      <div className="mb-5">
        <label htmlFor="random-walk-process" className="mb-2 block text-sm font-medium">Process:</label>
        <select
          id="random-walk-process"
          value={processMode}
          onChange={(event) => onProcessModeChange(event.target.value as ProcessMode)}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <option value="standard">Standard Random Walk</option>
          <option value="t15a">T15a · Bianchi I velocity flips</option>
          <option value="t15b">T15b · Euclidean persistent walk</option>
        </select>
        {processMode !== "standard" && <p className="mt-2 text-xs text-slate-500">T15 uses its own model clock and unbounded domain. Canvas edges do not change the walkers.</p>}
      </div>

      {processMode === "standard" ? <>
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
          <div className="flex justify-between">
            <span>Scattering:</span>
            <span className="font-mono">{(simulationState.collisions || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Collisions:</span>
            <span className="font-mono">{(simulationState.interparticleCollisions || 0).toLocaleString()}</span>
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
            value={selectedStrategy}
            onChange={(e) => {
              const strategy = e.target.value as 'ctrw' | 'simple' | 'levy' | 'fractional';
              setGridLayoutParams({ ...gridLayoutParams, strategies: [strategy] });
            }}
            className="w-full border rounded px-2 py-1 text-sm"
          >
            <option value="simple">Simple (Ballistic)</option>
            <option value="ctrw">CTRW (Continuous Time Random Walk)</option>
            <option value="levy">Lévy Flight</option>
            <option value="fractional">Time-Fractional Subdiffusion</option>
          </select>
        </div>

        <div>
          <label htmlFor="random-walk-seed" className="block text-sm font-medium mb-2">Random seed</label>
          <input id="random-walk-seed" type="number" min="0" step="1" value={gridLayoutParams.seed ?? 42}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, seed: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
            className="w-full border rounded px-2 py-1 text-sm" />
        </div>

        {selectedStrategy === 'levy' && <div className="space-y-3 rounded border bg-slate-50 p-3">
          <p className="text-sm font-medium">Lévy flight parameters</p>
          <label className="block text-xs">Tail exponent α: {levyAlpha.toFixed(2)}
            <input type="range" min="0.2" max="2" step="0.05" value={levyAlpha} onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, levyAlpha: Number(e.target.value) })} className="w-full" />
          </label>
          <label className="block text-xs">Jump scale: {levyScale.toFixed(1)}
            <input type="range" min="1" max="100" step="1" value={levyScale} onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, levyScale: Number(e.target.value) })} className="w-full" />
          </label>
          <p className="text-xs text-slate-600">Jump lengths have a Pareto tail; collision rate sets the jump event rate.</p>
        </div>}

        {selectedStrategy === 'fractional' && <div className="space-y-3 rounded border bg-slate-50 p-3">
          <p className="text-sm font-medium">Time-fractional subdiffusion</p>
          <label className="block text-xs">Fractional order β: {fractionalBeta.toFixed(2)}
            <input type="range" min="0.1" max="0.95" step="0.01" value={fractionalBeta} onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, fractionalBeta: Number(e.target.value) })} className="w-full" />
          </label>
          <label className="block text-xs">Waiting-time scale: {fractionalWaitingScale.toFixed(2)} s
            <input type="range" min="0.01" max="2" step="0.01" value={fractionalWaitingScale} onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, fractionalWaitingScale: Number(e.target.value) })} className="w-full" />
          </label>
          <label className="block text-xs">Jump length: {fractionalJumpLength.toFixed(1)}
            <input type="range" min="1" max="50" step="1" value={fractionalJumpLength} onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, fractionalJumpLength: Number(e.target.value) })} className="w-full" />
          </label>
          <p className="text-xs text-slate-600">Walkers make fixed-length jumps after heavy-tailed waiting times. β below 1 produces subdiffusion.</p>
        </div>}

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
            <option value="reflective">Reflective</option>
            <option value="absorbing">Absorbing</option>
            <option value="unbounded">Unbounded</option>
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

        {gridLayoutParams.initialDistType === 'gaussian' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1">Sigma X</label>
              <input
                type="number"
                value={gridLayoutParams.distSigmaX}
                onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, distSigmaX: parseFloat(e.target.value) })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            {gridLayoutParams.dimension === '2D' && (
              <div>
                <label className="block text-xs mb-1">Sigma Y</label>
                <input
                  type="number"
                  value={gridLayoutParams.distSigmaY}
                  onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, distSigmaY: parseFloat(e.target.value) })}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            )}
          </div>
        )}

        {gridLayoutParams.initialDistType === 'ring' && gridLayoutParams.dimension === '2D' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1">r0</label>
              <input
                type="number"
                value={gridLayoutParams.distR0}
                onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, distR0: parseFloat(e.target.value) })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Delta r</label>
              <input
                type="number"
                value={gridLayoutParams.distDR}
                onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, distDR: parseFloat(e.target.value) })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        )}

        {gridLayoutParams.initialDistType === 'stripe' && (
          <div>
            <label className="block text-xs mb-1">Thickness</label>
            <input
              type="number"
              value={gridLayoutParams.distThickness}
              onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, distThickness: parseFloat(e.target.value) })}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        )}

        {gridLayoutParams.initialDistType === 'grid' && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs mb-1">nx</label>
              <input
                type="number"
                value={gridLayoutParams.distNx}
                onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, distNx: parseInt(e.target.value) })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            {gridLayoutParams.dimension === '2D' && (
              <div>
                <label className="block text-xs mb-1">ny</label>
                <input
                  type="number"
                  value={gridLayoutParams.distNy}
                  onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, distNy: parseInt(e.target.value) })}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-xs mb-1">Jitter</label>
              <input
                type="number"
                value={gridLayoutParams.distJitter}
                onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, distJitter: parseFloat(e.target.value) })}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        )}
      </div>
      </> : <T15Controls
        mode={processMode}
        config={t15Config}
        onConfigChange={onT15ConfigChange}
        simulationState={simulationState}
        handleStart={handleStart}
        handlePause={handlePause}
        handleReset={handleReset}
        handleInitialize={handleInitialize}
      />}
    </div>
  );
};

function T15Controls({
  mode,
  config,
  onConfigChange,
  simulationState,
  handleStart,
  handlePause,
  handleReset,
  handleInitialize,
}: {
  mode: T15Mode;
  config: T15RunConfig;
  onConfigChange: (config: T15RunConfig) => void;
  simulationState: any;
  handleStart: () => void;
  handlePause: () => void;
  handleReset: () => void;
  handleInitialize: () => void;
}) {
  const update = (updates: Partial<T15RunConfig>) => onConfigChange({ ...config, ...updates });
  return (
    <>
      <div className="mb-6 space-y-3">
        <button type="button" onClick={handleInitialize} className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Initialize run</button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={handleStart} disabled={simulationState.isRunning} className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50">Start</button>
          <button type="button" onClick={handlePause} className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800">{simulationState.isRunning ? "Pause" : "Resume"}</button>
        </div>
        <button type="button" onClick={handleReset} className="w-full rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800">Reset</button>
        <div className="rounded-lg border bg-slate-50 p-3 text-sm" role="status" aria-live="polite">
          <div className="flex justify-between"><span>Status</span><span className="font-medium">{simulationState.status}</span></div>
          <div className="flex justify-between"><span>Model time</span><span className="font-mono">{(simulationState.time || 0).toFixed(3)}</span></div>
          <div className="flex justify-between"><span>Walker events</span><span className="font-mono">{(simulationState.collisions || 0).toLocaleString()}</span></div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="t15-walkers" className="mb-2 block text-sm font-medium">Live walkers: {config.walkers.toLocaleString()}</label>
          <input id="t15-walkers" type="range" min="500" max="50000" step="500" value={config.walkers} onChange={(event) => update({ walkers: Number(event.target.value) })} className="w-full" />
          <p className="mt-1 text-xs text-slate-500">Large paper ensembles are included as saved references.</p>
        </div>
        <div>
          <label htmlFor="t15-seed" className="mb-2 block text-sm font-medium">Seed</label>
          <input id="t15-seed" type="number" min="0" step="1" value={config.seed} onChange={(event) => update({ seed: Number(event.target.value) })} className="min-h-10 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        {mode === "t15a" ? (
          <>
            <div>
              <label htmlFor="t15a-ordering" className="mb-2 block text-sm font-medium">Bianchi ordering case</label>
              <select id="t15a-ordering" value={config.ordering} onChange={(event) => update({ ordering: event.target.value as T15RunConfig["ordering"] })} className="min-h-10 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="reduced">Reduced Laplace–Beltrami · B = 0, a = 0</option>
                <option value="derivative">Derivative-only · B = −3/2, a = 3/4</option>
              </select>
            </div>
            <div>
              <label htmlFor="t15a-profile" className="mb-2 block text-sm font-medium">Initial profile</label>
              <select id="t15a-profile" value={config.profile} onChange={(event) => update({ profile: event.target.value as T15RunConfig["profile"] })} className="min-h-10 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="centered">Centered single bump</option>
                <option value="bimodal">Symmetric bimodal</option>
                <option value="asymmetric">Asymmetric · J₀ = 0.4u₀</option>
              </select>
            </div>
            <p className="rounded bg-blue-50 p-3 text-xs leading-5 text-blue-900">Clock α runs from 0 to 1. Direction flips are per walker; the β display window is not a physical boundary.</p>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="t15b-speed" className="mb-2 block text-sm font-medium">Speed v: {config.speed.toFixed(2)}</label>
              <input id="t15b-speed" type="range" min="0.1" max="3" step="0.1" value={config.speed} onChange={(event) => update({ speed: Number(event.target.value) })} className="w-full" />
            </div>
            <div>
              <label htmlFor="t15b-rate" className="mb-2 block text-sm font-medium">Reset rate λ: {config.resetRate.toFixed(2)}</label>
              <input id="t15b-rate" type="range" min="0" max="5" step="0.1" value={config.resetRate} onChange={(event) => update({ resetRate: Number(event.target.value) })} className="w-full" />
            </div>
            <p className="rounded bg-blue-50 p-3 text-xs leading-5 text-blue-900">Walkers start at the origin with uniform headings. The reference run uses v = 1, λ = 1, seed 15026, and 250,000 walkers.</p>
          </>
        )}
      </div>
    </>
  );
}
