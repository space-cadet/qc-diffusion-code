import React, { useState, useMemo, useCallback } from "react";
import { useAppStore } from "../stores/appStore";
import type { RandomWalkSimulator } from '../physics/RandomWalkSimulator';
import { LogNumberSlider } from './common/LogNumberSlider';

import type { SimulationState } from '../types/simulation';
import type { RandomWalkParams } from '../types/simulationTypes';

interface ParameterPanelProps {
  simulatorRef: React.RefObject<RandomWalkSimulator>;
  gridLayoutParams: RandomWalkParams;
  setGridLayoutParams: (params: RandomWalkParams) => void;
  simulationState: SimulationState;
  setSimulationState: (state: SimulationState) => void;
  handleStart: () => void;
  handlePause: () => void;
  handleReset: () => void;
  handleInitialize: () => void;
}

export const RandomWalkParameterPanel = ({
  simulatorRef,
  gridLayoutParams,
  setGridLayoutParams,
  simulationState,
  setSimulationState,
  handleStart,
  handlePause,
  handleReset,
  handleInitialize,
}: ParameterPanelProps) => {
  const { randomWalkUIState, setRandomWalkUIState } = useAppStore();
  
  const updateUIState = (updates: Partial<typeof randomWalkUIState>) => {
    setRandomWalkUIState({ ...randomWalkUIState, ...updates });
  };

  // Derived values and helpers for Particles control (kept outside JSX to reduce cognitive load)
  const minP = useMemo(() => gridLayoutParams.minParticles ?? 0, [gridLayoutParams.minParticles]);
  const maxP = useMemo(() => gridLayoutParams.maxParticles ?? 2000, [gridLayoutParams.maxParticles]);

  const typeGuard = (s: string): s is 'ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions' => 
    ['ctrw', 'simple', 'levy', 'fractional', 'collisions'].includes(s);

  return (
    <div className="bg-white border rounded-lg p-4 h-full overflow-auto">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">
        Parameters
      </h3>

      {/* Simulation Controls - Moved to top */}
      <div className="mb-6 space-y-3">
        <button
          onClick={() => {
            console.log('[INITIALIZE] Strategies:', gridLayoutParams.strategies);
            handleInitialize();
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Initialize
        </button>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleStart}
            disabled={simulationState.isRunning}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-md transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Start
          </button>
          
          <button
            onClick={handlePause}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 rounded-md transition-colors duration-200"
          >
            {simulationState.isRunning ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Resume
              </>
            )}
          </button>
        </div>
        
        <button
          onClick={handleReset}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>

        {/* Status Display */}
        <div className="border rounded-lg p-3 bg-gray-50 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-medium">Status:</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                simulationState.status === "Running"
                  ? "bg-green-500"
                  : simulationState.status === "Paused" 
                  ? "bg-amber-500"
                  : "bg-gray-400"
              }`} />
              <span className="font-medium text-gray-900">
                {simulationState.status}
              </span>
            </div>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span className="font-mono">{simulationState.time.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Scattering:</span>
            <span className="font-mono">{simulationState.collisions.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Collisions:</span>
            <span className="font-mono">{(simulationState as any).interparticleCollisions?.toLocaleString?.() ?? (Number((simulationState as any).interparticleCollisions || 0)).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Simulation Type */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Simulation Type:
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="simulationType"
                value="continuum"
                checked={gridLayoutParams.simulationType === "continuum"}
                onChange={(e) =>
                  setGridLayoutParams({
                    ...gridLayoutParams,
                    simulationType: e.target.value as "continuum" | "graph",
                  })
                }
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
                onChange={(e) =>
                  setGridLayoutParams({
                    ...gridLayoutParams,
                    simulationType: e.target.value as "continuum" | "graph",
                  })
                }
                className="mr-2"
              />
              Graph
            </label>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">
              Dimension:
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dimension"
                  value="1D"
                  checked={gridLayoutParams.dimension === "1D"}
                  onChange={(e) =>
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      dimension: e.target.value as "1D" | "2D",
                    })
                  }
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
                  onChange={(e) =>
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      dimension: e.target.value as "1D" | "2D",
                    })
                  }
                  className="mr-2"
                />
                2D
              </label>
            </div>
          </div>



        
        {/* Initial Distribution (only for Continuum) - Collapsible */}
        {gridLayoutParams.simulationType === "continuum" && (
          <div className="border rounded p-3 bg-gray-50">
            <button
              type="button"
              onClick={() => updateUIState({ isDistributionOpen: !randomWalkUIState.isDistributionOpen })}
              className="flex items-center justify-between w-full text-sm font-medium text-left mb-2"
            >
              <span>Initial Distribution</span>
              <svg
                className={`w-4 h-4 transition-transform ${randomWalkUIState.isDistributionOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {randomWalkUIState.isDistributionOpen && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Type:</label>
                  <select
                    value={gridLayoutParams.initialDistType}
                    onChange={(e) =>
                      setGridLayoutParams({
                        ...gridLayoutParams,
                        initialDistType: e.target.value as RandomWalkParams['initialDistType'],
                      })
                    }
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="uniform">Uniform</option>
                    <option value="gaussian">Gaussian</option>
                    <option value="ring">Ring / Annulus</option>
                    <option value="stripe">Stripe</option>
                    <option value="grid">Grid</option>
                  </select>
                </div>

                {/* Gaussian params */}
                {gridLayoutParams.initialDistType === 'gaussian' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs">σx (px)</label>
                      <input
                        type="number"
                        value={gridLayoutParams.distSigmaX}
                        onChange={(e) =>
                          setGridLayoutParams({
                            ...gridLayoutParams,
                            distSigmaX: parseFloat(e.target.value),
                          })
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    {gridLayoutParams.dimension === '2D' && (
                      <div>
                        <label className="block text-xs">σy (px)</label>
                        <input
                          type="number"
                          value={gridLayoutParams.distSigmaY}
                          onChange={(e) =>
                            setGridLayoutParams({
                              ...gridLayoutParams,
                              distSigmaY: parseFloat(e.target.value),
                            })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Ring params */}
                {gridLayoutParams.initialDistType === 'ring' && gridLayoutParams.dimension === '2D' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs">r₀ (px)</label>
                      <input
                        type="number"
                        value={gridLayoutParams.distR0}
                        onChange={(e) =>
                          setGridLayoutParams({
                            ...gridLayoutParams,
                            distR0: parseFloat(e.target.value),
                          })
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs">Δr (px)</label>
                      <input
                        type="number"
                        value={gridLayoutParams.distDR}
                        onChange={(e) =>
                          setGridLayoutParams({
                            ...gridLayoutParams,
                            distDR: parseFloat(e.target.value),
                          })
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Stripe params */}
                {gridLayoutParams.initialDistType === 'stripe' && (
                  <div>
                    <label className="block text-xs">Thickness (px)</label>
                    <input
                      type="number"
                      value={gridLayoutParams.distThickness}
                      onChange={(e) =>
                        setGridLayoutParams({
                          ...gridLayoutParams,
                          distThickness: parseFloat(e.target.value),
                        })
                      }
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                )}

                {/* Grid params */}
                {gridLayoutParams.initialDistType === 'grid' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs">nx</label>
                      <input
                        type="number"
                        value={gridLayoutParams.distNx}
                        onChange={(e) =>
                          setGridLayoutParams({
                            ...gridLayoutParams,
                            distNx: parseInt(e.target.value),
                          })
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    {gridLayoutParams.dimension === '2D' && (
                      <div>
                        <label className="block text-xs">ny</label>
                        <input
                          type="number"
                          value={gridLayoutParams.distNy}
                          onChange={(e) =>
                            setGridLayoutParams({
                              ...gridLayoutParams,
                              distNy: parseInt(e.target.value),
                            })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    )}
                    {gridLayoutParams.dimension === '2D' && (
                      <div>
                        <label className="block text-xs">Jitter (px)</label>
                        <input
                          type="number"
                          value={gridLayoutParams.distJitter}
                          onChange={(e) =>
                            setGridLayoutParams({
                              ...gridLayoutParams,
                              distJitter: parseFloat(e.target.value),
                            })
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>

        {/* Random Walk Strategy - Collapsible */}
        <div>
          <button
            type="button"
            onClick={() => updateUIState({ isStrategyOpen: !randomWalkUIState.isStrategyOpen })}
            className="flex items-center justify-between w-full text-sm font-medium text-left mb-2 p-2 hover:bg-gray-50 rounded"
          >
            <span>Random Walk Strategy:</span>
            <svg
              className={`w-4 h-4 transition-transform ${randomWalkUIState.isStrategyOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {randomWalkUIState.isStrategyOpen && (
            <div className="space-y-2 ml-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={gridLayoutParams.strategies?.includes("ctrw") || false}
                  onChange={(e) => {
                    const strategies = gridLayoutParams.strategies || [];
                    const newStrategies = e.target.checked
                      ? [...strategies.filter(s => s !== "ctrw"), "ctrw" as const]
                      : strategies.filter(s => s !== "ctrw");
                    console.log('[STRATEGY] CTRW:', newStrategies);
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      strategies: newStrategies as ("ctrw" | "simple" | "levy" | "fractional" | "collisions")[],
                    });
                    simulatorRef.current?.updateParameters({ strategies: newStrategies });
                  }}
                  className="mr-2"
                />
                CTRW (Continuous Time Random Walk)
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={gridLayoutParams.strategies?.includes("collisions") || false}
                  onChange={(e) => {
                    const strategies = gridLayoutParams.strategies || [];
                    const newStrategies = e.target.checked
                      ? [...strategies.filter(s => s !== "collisions"), "collisions" as const]
                      : strategies.filter(s => s !== "collisions");
                    console.log('[STRATEGY] COLLISIONS:', newStrategies);
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      strategies: newStrategies as ("ctrw" | "simple" | "levy" | "fractional" | "collisions")[],
                    });
                    simulatorRef.current?.updateParameters({ strategies: newStrategies });
                  }}
                  className="mr-2"
                />
                Interparticle Collisions
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={gridLayoutParams.strategies?.includes("simple") || false}
                  onChange={(e) => {
                    const strategies = gridLayoutParams.strategies || [];
                    const newStrategies = e.target.checked
                      ? [...strategies.filter(s => s !== "simple"), "simple" as const]
                      : strategies.filter(s => s !== "simple");
                    console.log('[STRATEGY] SIMPLE:', newStrategies);
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      strategies: newStrategies as ("ctrw" | "simple" | "levy" | "fractional" | "collisions")[],
                    });
                    simulatorRef.current?.updateParameters({ strategies: newStrategies });
                  }}
                  className="mr-2"
                />
                Simple Random Walk
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={gridLayoutParams.strategies?.includes("levy") || false}
                  onChange={(e) => {
                    const strategies = gridLayoutParams.strategies || [];
                    const newStrategies = e.target.checked
                      ? [...strategies.filter(s => s !== "levy"), "levy" as const]
                      : strategies.filter(s => s !== "levy");
                    console.log('[STRATEGY] LEVY:', newStrategies);
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      strategies: newStrategies as ("ctrw" | "simple" | "levy" | "fractional" | "collisions")[],
                    });
                    simulatorRef.current?.updateParameters({ strategies: newStrategies });
                  }}
                  className="mr-2"
                />
                Lévy Flight
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={gridLayoutParams.strategies?.includes("fractional") || false}
                  onChange={(e) => {
                    const strategies = gridLayoutParams.strategies || [];
                    const newStrategies = e.target.checked
                      ? [...strategies.filter(s => s !== "fractional"), "fractional" as const]
                      : strategies.filter(s => s !== "fractional");
                    console.log('[STRATEGY] FRACTIONAL:', newStrategies);
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      strategies: newStrategies as ("ctrw" | "simple" | "levy" | "fractional" | "collisions")[],
                    });
                    simulatorRef.current?.updateParameters({ strategies: newStrategies });
                  }}
                  className="mr-2"
                />
                Fractional Brownian Motion
              </label>
            </div>
          )}
        </div>

        {/* Boundary Conditions - Collapsible */}
        <div>
          <button
            type="button"
            onClick={() => updateUIState({ isBoundaryOpen: !randomWalkUIState.isBoundaryOpen })}
            className="flex items-center justify-between w-full text-sm font-medium text-left mb-2 p-2 hover:bg-gray-50 rounded"
          >
            <span>Boundary Conditions:</span>
            <svg
              className={`w-4 h-4 transition-transform ${randomWalkUIState.isBoundaryOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {randomWalkUIState.isBoundaryOpen && (
            <div className="space-y-2 ml-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="boundaryCondition"
                  value="periodic"
                  checked={gridLayoutParams.boundaryCondition === "periodic"}
                  onChange={(e) =>
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      boundaryCondition: e.target.value as "periodic" | "reflective" | "absorbing",
                    })
                  }
                  className="mr-2"
                />
                Periodic (wrap around)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="boundaryCondition"
                  value="reflective"
                  checked={gridLayoutParams.boundaryCondition === "reflective"}
                  onChange={(e) =>
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      boundaryCondition: e.target.value as "periodic" | "reflective" | "absorbing",
                    })
                  }
                  className="mr-2"
                />
                Reflective (bounce back)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="boundaryCondition"
                  value="absorbing"
                  checked={gridLayoutParams.boundaryCondition === "absorbing"}
                  onChange={(e) =>
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      boundaryCondition: e.target.value as "periodic" | "reflective" | "absorbing",
                    })
                  }
                  className="mr-2"
                />
                Absorbing (particles disappear)
              </label>
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={gridLayoutParams.showAnimation}
              onChange={(e) =>
                setGridLayoutParams({
                  ...gridLayoutParams,
                  showAnimation: e.target.checked,
                })
              }
              className="mr-2"
            />
            Show Animation
          </label>
        </div>

        {/* Graph Parameters (only show when graph is selected) */}
        {gridLayoutParams.simulationType === "graph" && (
          <div className="border rounded p-3 bg-gray-50">
            <h4 className="font-medium mb-2">Graph Parameters</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Graph Type:</label>
                <select
                  value={gridLayoutParams.graphType}
                  onChange={(e) =>
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      graphType: e.target.value as any,
                    })
                  }
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="lattice1D">1D Chain</option>
                  <option value="lattice2D">2D Lattice</option>
                  <option value="path">Path Graph</option>
                  <option value="complete">Complete Graph</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Size:</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={gridLayoutParams.graphSize}
                  onChange={(e) =>
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      graphSize: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5</span>
                  <span className="font-medium">
                    {gridLayoutParams.graphSize}
                  </span>
                  <span>50</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={gridLayoutParams.isPeriodic}
                    onChange={(e) =>
                      setGridLayoutParams({
                        ...gridLayoutParams,
                        isPeriodic: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Periodic Boundaries
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={gridLayoutParams.showEdgeWeights}
                    onChange={(e) =>
                      setGridLayoutParams({
                        ...gridLayoutParams,
                        showEdgeWeights: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  Show Edge Weights
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Physics Parameters - Collapsible */}
        <div>
          <button
            type="button"
            onClick={() => updateUIState({ isParametersOpen: !randomWalkUIState.isParametersOpen })}
            className="flex items-center justify-between w-full text-sm font-medium text-left mb-2 p-2 hover:bg-gray-50 rounded"
          >
            <span>Physics Parameters:</span>
            <svg
              className={`w-4 h-4 transition-transform ${randomWalkUIState.isParametersOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {randomWalkUIState.isParametersOpen && (
            <div className="space-y-4 ml-2">
              {/* Particle Count */}
              <div>
                <LogNumberSlider
                  label="Particles"
                  value={gridLayoutParams.particles}
                  onChange={(v) => {
                    console.log('[PARTICLES] Changed to:', v);
                    setGridLayoutParams({ ...gridLayoutParams, particles: v })
                  }}
                  min={minP}
                  max={maxP}
                  logScale={randomWalkUIState.particlesLogScale}
                  onToggleLogScale={(b) => updateUIState({ particlesLogScale: b })}
                  defaultLogScale
                  discrete
                />
              </div>

              {/* Collision Rate */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  λ (Collision Rate):
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="10.0"
                  step="any"
                  value={gridLayoutParams.collisionRate}
                  onChange={(e) =>
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      collisionRate: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.1</span>
                  <span className="font-medium">
                    {gridLayoutParams.collisionRate}
                  </span>
                  <span>10.0</span>
                </div>
              </div>

              {/* Jump Length */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  a (Jump Length):
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="1.0"
                  step="any"
                  value={gridLayoutParams.jumpLength}
                  onChange={(e) =>
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      jumpLength: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.01</span>
                  <span className="font-medium">{gridLayoutParams.jumpLength}</span>
                  <span>1.0</span>
                </div>
              </div>

              {/* Velocity */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  v (Velocity):
                </label>
                <input
                  type="range"
                  min="0.001"
                  max="5.0"
                  step="any"
                  value={gridLayoutParams.velocity}
                  onChange={(e) =>
                    setGridLayoutParams({
                      ...gridLayoutParams,
                      velocity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.1</span>
                  <span className="font-medium">{gridLayoutParams.velocity}</span>
                  <span>5.0</span>
                </div>
              </div>

              {/* Time Step dt */}
              <div>
                <LogNumberSlider
                  label="dt (timestep, s)"
                  value={gridLayoutParams.dt ?? 0.01}
                  onChange={(v) => setGridLayoutParams({ ...gridLayoutParams, dt: v })}
                  min={0.0001}
                  max={0.1}
                  step="any"
                  defaultLogScale={true}
                  precision={4}
                  format={(v) => v.toExponential(2)}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Controls simulation timestep used by the physics engine
                </div>
              </div>

              {/* Temperature */}
              <div>
                <LogNumberSlider
                  label="T (Temperature)"
                  value={gridLayoutParams.temperature || 1.0}
                  onChange={(v) => setGridLayoutParams({ ...gridLayoutParams, temperature: v })}
                  min={0.01}
                  max={1000.0}
                  step="any"
                  logScale={randomWalkUIState.temperatureLogScale}
                  onToggleLogScale={(b) => updateUIState({ temperatureLogScale: b })}
                  defaultLogScale={true}
                  precision={2}
                  format={(v) => v.toFixed(2)}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Controls thermal velocity spread (Maxwell-Boltzmann distribution)
                </div>
              </div>
            </div>
          )}
        </div>



        {/* Derived Parameters */}
        <div className="border-t pt-4 space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>D (Diffusion):</span>
            <span>
              {(
                gridLayoutParams.velocity ** 2 /
                (2 * gridLayoutParams.collisionRate)
              ).toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Mean Free Path:</span>
            <span>
              {(
                gridLayoutParams.velocity / gridLayoutParams.collisionRate
              ).toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Mean Wait Time:</span>
            <span>{(1 / gridLayoutParams.collisionRate).toFixed(3)}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
