import React from "react";
import { useAppStore } from "../stores/appStore";
import type { RandomWalkSimulator } from '../physics/RandomWalkSimulator';

import type { SimulationState } from '../types/simulation';

interface GridLayoutParams {
  simulationType: "continuum" | "graph";
  showAnimation: boolean;
  graphType: "lattice1D" | "lattice2D" | "path" | "complete";
  graphSize: number;
  isPeriodic: boolean;
  showEdgeWeights: boolean;
  particles: number;
  collisionRate: number;
  jumpLength: number;
  velocity: number;
}

interface ParameterPanelProps {
  simulatorRef: React.RefObject<RandomWalkSimulator>;
  gridLayoutParams: GridLayoutParams;
  setGridLayoutParams: (params: GridLayoutParams) => void;
  simulationState: SimulationState;
  setSimulationState: (state: SimulationState) => void;
  handleStart: () => void;
  handlePause: () => void;
  handleReset: () => void;
  handleInitialize: () => void;
}

export const ParameterPanel = ({
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
  return (
    <div className="bg-white border rounded-lg p-4 h-full overflow-auto">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">
        Parameters
      </h3>

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

        {/* Particle Count */}
        <div>
          <label className="block text-sm font-medium mb-2">Particles:</label>
          <input
            type="range"
            min="50"
            max="2000"
            step="1"
            value={gridLayoutParams.particles}
            onChange={(e) =>
              setGridLayoutParams({
                ...gridLayoutParams,
                particles: parseInt(e.target.value),
              })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>50</span>
            <span className="font-medium">{gridLayoutParams.particles}</span>
            <span>2000</span>
          </div>
        </div>

        {/* Collision Rate */}
        <div>
          <label className="block text-sm font-medium mb-2">
            λ (Collision Rate):
          </label>
          <input
            type="range"
            min="0.1"
            max="10.0"
            step="0.1"
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
            step="0.01"
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
            min="0.1"
            max="5.0"
            step="0.1"
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

        {/* Control Buttons */}
        <div className="border-t pt-4 space-y-2">
          <button
            onClick={handleInitialize}
            className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🎯 Initialize
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={simulationState.isRunning}
              className="flex-1 px-3 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
            >
              ▶️ Start
            </button>
            <button
              onClick={handlePause}
              className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded"
            >
              {simulationState.isRunning ? "⏸️ Pause" : "▶️ Resume"}
            </button>
          </div>
          <button
            onClick={handleReset}
            className="w-full px-3 py-2 bg-red-500 text-white rounded"
          >
            🔄 Reset
          </button>
        </div>

        {/* Status Display */}
        <div className="border-t pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Status:</span>
            <span
              className={`font-medium ${
                simulationState.status === "Running"
                  ? "text-green-600"
                  : simulationState.status === "Paused"
                  ? "text-yellow-600"
                  : "text-gray-600"
              }`}
            >
              ● {simulationState.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span>{simulationState.time.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Collisions:</span>
            <span>{simulationState.collisions.toLocaleString()}</span>
          </div>
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
