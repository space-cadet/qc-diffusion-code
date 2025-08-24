import React, { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useAppStore } from "../stores/appStore";
import type { RandomWalkSimulator } from "../physics/RandomWalkSimulator";
import { ParticleCountObservable } from "../physics/observables/ParticleCountObservable";
import type { ParticleCountResult } from "../physics/observables/ParticleCountObservable";

interface ObservablesPanelProps {
  simulatorRef: React.RefObject<RandomWalkSimulator | null>;
  isRunning: boolean;
  simulationStatus: string;
  simReady?: boolean;
}

export function ObservablesPanel({ simulatorRef, isRunning, simulationStatus, simReady }: ObservablesPanelProps) {
  const { 
    randomWalkUIState, 
    setRandomWalkUIState 
  } = useAppStore();
  
  const [particleCountData, setParticleCountData] = useState<ParticleCountResult | null>(null);
  // Local flag to ensure polling starts only after observable registration
  const [isRegistered, setIsRegistered] = useState(false);

  // Helper functions to update persistent state
  const setIsExpanded = (expanded: boolean) => {
    setRandomWalkUIState({
      ...randomWalkUIState,
      isObservablesExpanded: expanded
    });
  };

  const setShowParticleCount = (show: boolean) => {
    setRandomWalkUIState({
      ...randomWalkUIState,
      showParticleCount: show
    });
  };

  const setShowKineticEnergy = (show: boolean) => {
    setRandomWalkUIState({
      ...randomWalkUIState,
      showKineticEnergy: show
    });
  };

  const setShowTotalMomentum = (show: boolean) => {
    setRandomWalkUIState({
      ...randomWalkUIState,
      showTotalMomentum: show
    });
  };

  const setShowMomentumX = (show: boolean) => {
    setRandomWalkUIState({
      ...randomWalkUIState,
      showMomentumX: show
    });
  };

  const setShowMomentumY = (show: boolean) => {
    setRandomWalkUIState({
      ...randomWalkUIState,
      showMomentumY: show
    });
  };

  // Register/unregister ParticleCountObservable based on visibility
  useEffect(() => {
    if (!simReady || !simulatorRef.current) return;

    if (randomWalkUIState.showParticleCount) {
      const observable = new ParticleCountObservable();
      simulatorRef.current.registerObservable(observable);
      console.log("[ObservablesPanel] Registered ParticleCountObservable");
      setIsRegistered(true);

      return () => {
        if (simulatorRef.current) {
          simulatorRef.current.unregisterObservable('particleCount');
          console.log("[ObservablesPanel] Unregistered ParticleCountObservable");
        }
        setIsRegistered(false);
      };
    }
  }, [randomWalkUIState.showParticleCount, simReady]);

  // Update data when running or refresh when simulation state changes
  useEffect(() => {
    if (!randomWalkUIState.showParticleCount || !randomWalkUIState.isObservablesExpanded) return;
    if (!isRegistered) return; // gate polling until observable is registered

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
  }, [randomWalkUIState.showParticleCount, randomWalkUIState.isObservablesExpanded, isRunning, isRegistered, simReady]);

  // Reset observable data when simulation is reset
  useEffect(() => {
    if (simulationStatus === "Stopped") {
      setParticleCountData(null);
    }
  }, [simulationStatus]);

  return (
    <div className={`bg-white rounded-lg shadow flex flex-col ${
      randomWalkUIState.isObservablesExpanded ? 'h-full' : 'h-auto'
    }`}>
      {/* Header with drag handle and collapse toggle */}
      <div className="flex items-center justify-between p-4">
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
          onClick={() => setIsExpanded(!randomWalkUIState.isObservablesExpanded)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {randomWalkUIState.isObservablesExpanded ? (
            <ChevronDownIcon className="w-5 h-5" />
          ) : (
            <ChevronRightIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Content */}
      {randomWalkUIState.isObservablesExpanded && (
        <div className="flex-1 px-4 pb-4 overflow-y-auto">
          <div className="space-y-4">
          {/* Particle Count Observable */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Particle Count N(t)</label>
              <input
                type="checkbox"
                checked={randomWalkUIState.showParticleCount}
                onChange={(e) => setShowParticleCount(e.target.checked)}
                className="rounded"
              />
            </div>
            
            {randomWalkUIState.showParticleCount && (
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

          {/* Kinetic Energy Observable */}
          <div className="border rounded-lg p-3 opacity-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Kinetic Energy</label>
              <input 
                type="checkbox" 
                checked={randomWalkUIState.showKineticEnergy}
                onChange={(e) => setShowKineticEnergy(e.target.checked)}
                disabled 
                className="rounded" 
              />
            </div>
            <div className="text-xs text-gray-400">Coming soon</div>
          </div>

          {/* Total Momentum Observable */}
          <div className="border rounded-lg p-3 opacity-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Total Momentum</label>
              <input 
                type="checkbox" 
                checked={randomWalkUIState.showTotalMomentum}
                onChange={(e) => setShowTotalMomentum(e.target.checked)}
                disabled 
                className="rounded" 
              />
            </div>
            <div className="text-xs text-gray-400">Coming soon</div>
          </div>

          {/* X-Component Momentum Observable */}
          <div className="border rounded-lg p-3 opacity-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Momentum X</label>
              <input 
                type="checkbox" 
                checked={randomWalkUIState.showMomentumX}
                onChange={(e) => setShowMomentumX(e.target.checked)}
                disabled 
                className="rounded" 
              />
            </div>
            <div className="text-xs text-gray-400">Coming soon</div>
          </div>

          {/* Y-Component Momentum Observable */}
          <div className="border rounded-lg p-3 opacity-50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Momentum Y</label>
              <input 
                type="checkbox" 
                checked={randomWalkUIState.showMomentumY}
                onChange={(e) => setShowMomentumY(e.target.checked)}
                disabled 
                className="rounded" 
              />
            </div>
            <div className="text-xs text-gray-400">Coming soon</div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
