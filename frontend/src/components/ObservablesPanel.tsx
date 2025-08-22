import React, { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { RandomWalkSimulator } from "../physics/RandomWalkSimulator";
import { ParticleCountObservable } from "../physics/observables/ParticleCountObservable";
import type { ParticleCountResult } from "../physics/observables/ParticleCountObservable";

interface ObservablesPanelProps {
  simulatorRef: React.RefObject<RandomWalkSimulator | null>;
  isRunning: boolean;
  simulationStatus: string;
}

export function ObservablesPanel({ simulatorRef, isRunning, simulationStatus }: ObservablesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showParticleCount, setShowParticleCount] = useState(false);
  const [particleCountData, setParticleCountData] = useState<ParticleCountResult | null>(null);

  // Register/unregister ParticleCountObservable based on visibility
  useEffect(() => {
    if (!simulatorRef.current) return;

    if (showParticleCount && isExpanded) {
      const observable = new ParticleCountObservable();
      simulatorRef.current.registerObservable(observable);
      console.log("[ObservablesPanel] Registered ParticleCountObservable");

      return () => {
        if (simulatorRef.current) {
          simulatorRef.current.unregisterObservable('particleCount');
          console.log("[ObservablesPanel] Unregistered ParticleCountObservable");
        }
      };
    }
  }, [showParticleCount, isExpanded, simulatorRef]);

  // Update data when running or refresh when simulation state changes
  useEffect(() => {
    if (!showParticleCount || !isExpanded) return;

    if (isRunning) {
      const interval = setInterval(() => {
        if (simulatorRef.current) {
          const data = simulatorRef.current.getObservableData('particleCount');
          if (data) {
            setParticleCountData(data);
          }
        }
      }, 100); // Update every 100ms
      return () => clearInterval(interval);
    } else {
      // Get final data when paused/stopped
      if (simulatorRef.current) {
        const data = simulatorRef.current.getObservableData('particleCount');
        if (data) {
          setParticleCountData(data);
        }
      }
    }
  }, [showParticleCount, isExpanded, isRunning, simulatorRef]);

  // Reset observable data when simulation is reset
  useEffect(() => {
    if (simulationStatus === "Stopped") {
      setParticleCountData(null);
    }
  }, [simulationStatus]);

  return (
    <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
      {/* Header with drag handle and collapse toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="drag-handle cursor-move p-1">
            <div className="w-4 h-4 grid grid-cols-2 gap-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          </div>
          <h3 className="text-lg font-semibold">Observables</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-5 h-5" />
          ) : (
            <ChevronRightIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="flex-1 space-y-4">
          {/* Particle Count Observable */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Particle Count N(t)</label>
              <input
                type="checkbox"
                checked={showParticleCount}
                onChange={(e) => setShowParticleCount(e.target.checked)}
                className="rounded"
              />
            </div>
            
            {showParticleCount && (
              <div className="text-sm space-y-1">
                {particleCountData ? (
                  <>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-mono">{particleCountData.totalCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <span className="font-mono text-green-600">{particleCountData.activeCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inactive:</span>
                      <span className="font-mono text-red-600">{particleCountData.inactiveCount}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Time:</span>
                      <span className="font-mono">{particleCountData.timestamp.toFixed(2)}s</span>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500 text-xs">
                    {simulationStatus === "Stopped" 
                      ? "Start simulation to see data"
                      : simulationStatus === "Paused"
                      ? "Paused - showing last data"
                      : "Calculating..."}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Placeholder for future observables */}
          <div className="border rounded-lg p-3 opacity-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Kinetic Energy</label>
              <input type="checkbox" disabled className="rounded" />
            </div>
            <div className="text-xs text-gray-400">Coming soon</div>
          </div>

          <div className="border rounded-lg p-3 opacity-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Total Momentum</label>
              <input type="checkbox" disabled className="rounded" />
            </div>
            <div className="text-xs text-gray-400">Coming soon</div>
          </div>
        </div>
      )}
    </div>
  );
}
