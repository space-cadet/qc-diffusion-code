import React, { useMemo } from "react";

export const RandomWalkParameterPanelV2 = ({
  gridLayoutParams,
  setGridLayoutParams,
  simulationState,
  handleStart,
  handlePause,
  handleReset,
  handleInitialize,
}: any) => {
  const minP = useMemo(() => gridLayoutParams.minParticles ?? 0, [gridLayoutParams.minParticles]);
  const maxP = useMemo(() => gridLayoutParams.maxParticles ?? 2000, [gridLayoutParams.maxParticles]);
  const selectedStrategy = gridLayoutParams.strategies?.find((strategy: string) =>
    ['simple', 'ctrw', 'levy', 'levy-walk', 'fractional', 'kac-goldstein', 'masoliver-lindenbergh'].includes(strategy)
  ) || 'simple';
  const isKacGoldstein = selectedStrategy === 'kac-goldstein';
  const isMasoliverLindenbergh = selectedStrategy === 'masoliver-lindenbergh';
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
        <label htmlFor="random-walk-strategy" className="mb-2 block text-sm font-medium">Strategy:</label>
        <select
          id="random-walk-strategy"
          value={selectedStrategy}
          onChange={(event) => {
            const strategy = event.target.value;
            const dimension = strategy === 'kac-goldstein' ? '1D' : strategy === 'masoliver-lindenbergh' ? '2D' : gridLayoutParams.dimension;
            const currentInitial = gridLayoutParams.initialDistType;
            const initialDistType = strategy === 'kac-goldstein' ? 'centered' : strategy === 'masoliver-lindenbergh' ? 'origin' : ['origin', 'centered', 'bimodal', 'asymmetric'].includes(currentInitial) ? 'uniform' : currentInitial;
            setGridLayoutParams({ ...gridLayoutParams, strategies: [strategy], dimension, initialDistType });
          }}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <option value="simple">Simple (Ballistic)</option>
          <option value="ctrw">CTRW (Continuous Time Random Walk)</option>
          <option value="levy">Lévy Flight</option>
          <option value="levy-walk">Lévy Walk</option>
          <option value="fractional">Time-Fractional Subdiffusion</option>
          <option value="kac-goldstein">Kac–Goldstein 1D Walk</option>
          <option value="masoliver-lindenbergh">Masoliver-Lindenbergh 2D Walk</option>
        </select>
        {(isKacGoldstein || isMasoliverLindenbergh) && <p className="mt-2 text-xs text-slate-500">The selected walk uses the shared controls and simulation clock.</p>}
      </div>

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
            <span>Scattering / walk events:</span>
            <span className="font-mono">{(simulationState.collisions || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Collisions:</span>
            <span className="font-mono">{(simulationState.interparticleCollisions || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mb-5">
            <label className="block text-sm font-medium mb-2">Simulation Type:</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="simulationType" value="continuum" checked={gridLayoutParams.simulationType === "continuum"} onChange={(event) => setGridLayoutParams({ ...gridLayoutParams, simulationType: event.target.value })} className="mr-2" />
                Continuum
              </label>
              <label className="flex items-center">
                <input type="radio" name="simulationType" value="graph" checked={gridLayoutParams.simulationType === "graph"} onChange={(event) => setGridLayoutParams({ ...gridLayoutParams, simulationType: event.target.value })} className="mr-2" />
                Graph
              </label>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Dimension:</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input type="radio" name="dimension" value="1D" checked={gridLayoutParams.dimension === "1D"} disabled={isMasoliverLindenbergh} onChange={(event) => setGridLayoutParams({ ...gridLayoutParams, dimension: event.target.value })} className="mr-2" />
                  1D
                </label>
                <label className="flex items-center">
                  <input type="radio" name="dimension" value="2D" checked={gridLayoutParams.dimension === "2D"} disabled={isKacGoldstein} onChange={(event) => setGridLayoutParams({ ...gridLayoutParams, dimension: event.target.value })} className="mr-2" />
                  2D
                </label>
              </div>
            </div>
      </div>

      <div className="space-y-5 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Particles: {gridLayoutParams.particles.toLocaleString()}</label>
          <input
            type="range"
            min={minP}
            max={maxP}
            step={1}
            value={gridLayoutParams.particles}
            onChange={(event) => {
              const particles = Number(event.target.value);
              setGridLayoutParams({ ...gridLayoutParams, particles });
            }}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Velocity: {gridLayoutParams.velocity.toFixed(1)}</label>
          <input
            type="range"
            min={0.1}
            max={10}
            step={0.1}
            value={gridLayoutParams.velocity}
            disabled={['levy', 'fractional'].includes(selectedStrategy)}
            onChange={(event) => {
              const velocity = Number(event.target.value);
              setGridLayoutParams({ ...gridLayoutParams, velocity });
            }}
            className="w-full disabled:opacity-50"
          />
          {(isKacGoldstein || isMasoliverLindenbergh || selectedStrategy === "levy-walk") && <p className="mt-1 text-xs text-slate-500">Sets the continuous travel speed.</p>}
          {['levy', 'fractional'].includes(selectedStrategy) && <p className="mt-1 text-xs text-slate-500">This jump process does not use continuous velocity.</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Temperature: {gridLayoutParams.temperature}</label>
          <input type="range" min={0.1} max={10} step={0.1} value={gridLayoutParams.temperature} disabled className="w-full disabled:opacity-50" />
          <p className="mt-1 text-xs text-slate-500">Temperature is not currently used by this simulation engine.</p>
        </div>
        <div>
          <label htmlFor="random-walk-seed" className="block text-sm font-medium mb-2">Random seed</label>
          <input
            id="random-walk-seed"
            type="number"
            min="0"
            step="1"
            value={gridLayoutParams.seed ?? 42}
            onChange={(event) => {
              const seed = Math.max(0, Math.floor(Number(event.target.value) || 0));
              setGridLayoutParams({ ...gridLayoutParams, seed });
            }}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            {isMasoliverLindenbergh ? "Heading reset rate λ" : isKacGoldstein ? "Direction flip rate λ" : "Collision Rate"}: {gridLayoutParams.collisionRate.toFixed(2)}
          </label>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={gridLayoutParams.collisionRate}
            disabled={!(["ctrw", "levy", "kac-goldstein", "masoliver-lindenbergh"].includes(selectedStrategy))}
            onChange={(event) => {
              const rate = Number(event.target.value);
              setGridLayoutParams({ ...gridLayoutParams, collisionRate: rate });
            }}
            className="w-full disabled:opacity-50"
          />
          {!["ctrw", "levy", "kac-goldstein", "masoliver-lindenbergh"].includes(selectedStrategy) && <p className="mt-1 text-xs text-slate-500">{selectedStrategy === "levy-walk" ? "Turn times come from the heavy-tailed flight durations." : selectedStrategy === "fractional" ? "Waiting times come from the fractional waiting-time law." : "This strategy does not use a collision rate."}</p>}
        </div>
      </div>

      <div className="space-y-6">
        {isKacGoldstein && <label className="block text-sm">Ordering reference case<select value={gridLayoutParams.kacGoldsteinOrdering ?? "reduced"} onChange={(event) => setGridLayoutParams({ ...gridLayoutParams, kacGoldsteinOrdering: event.target.value })} className="mt-1 w-full rounded border px-2 py-1"><option value="reduced">Reduced Laplace-Beltrami · B = 0, a = 0</option><option value="derivative">Derivative-only · B = −3/2, a = 3/4</option></select></label>}
        {(selectedStrategy === 'levy' || selectedStrategy === 'levy-walk') && <div className="space-y-3 rounded border bg-slate-50 p-3">
          <p className="text-sm font-medium">{selectedStrategy === 'levy-walk' ? 'Lévy walk parameters' : 'Lévy flight parameters'}</p>
          <label className="block text-xs">Tail exponent α: {levyAlpha.toFixed(2)}
            <input type="range" min="0.2" max="2" step="0.05" value={levyAlpha} onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, levyAlpha: Number(e.target.value) })} className="w-full" />
          </label>
          <label className="block text-xs">{selectedStrategy === 'levy-walk' ? 'Minimum flight length ℓ₀' : 'Jump scale'}: {levyScale.toFixed(1)}
            <input type="range" min="1" max="100" step="1" value={levyScale} onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, levyScale: Number(e.target.value) })} className="w-full" />
          </label>
          <p className="text-xs text-slate-600">{selectedStrategy === 'levy-walk' ? 'Flight durations have a Pareto tail with minimum duration ℓ₀/v; particles travel continuously at the Velocity setting.' : 'Jump lengths have a Pareto tail; collision rate sets the jump event rate.'}</p>
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
            {isMasoliverLindenbergh && <option value="origin">Point source at origin</option>}
            {isKacGoldstein && <><option value="centered">Centered single bump</option><option value="bimodal">Symmetric bimodal</option><option value="asymmetric">Asymmetric initial profile</option></>}
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
    </div>
  );
};
