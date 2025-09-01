import React, { useState, useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import type { RandomWalkSimulator } from "../physics/RandomWalkSimulator";
import { ParticleCountObservable } from "../physics/observables/ParticleCountObservable";
import type { ParticleCountResult } from "../physics/observables/ParticleCountObservable";
import { KineticEnergyObservable } from "../physics/observables/KineticEnergyObservable";
import type { KineticEnergyResult } from "../physics/observables/KineticEnergyObservable";
import { MomentumObservable } from "../physics/observables/MomentumObservable";
import type { MomentumResult } from "../physics/observables/MomentumObservable";
import { MSDObservable } from "../physics/observables/MSDObservable";
import type { MSDResult } from "../physics/observables/MSDObservable";

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
  const [kineticEnergyData, setKineticEnergyData] = useState<KineticEnergyResult | null>(null);
  const [momentumData, setMomentumData] = useState<MomentumResult | null>(null);
  const [msdData, setMSDData] = useState<MSDResult | null>(null);
  // Local flags to ensure polling starts only after observable registration
  const [isParticleCountRegistered, setIsParticleCountRegistered] = useState(false);
  const [isKineticEnergyRegistered, setIsKineticEnergyRegistered] = useState(false);
  const [isMomentumRegistered, setIsMomentumRegistered] = useState(false);
  const [isMSDRegistered, setIsMSDRegistered] = useState(false);

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

  const setShowMomentum = (show: boolean) => {
    setRandomWalkUIState({
      ...randomWalkUIState,
      showTotalMomentum: show
    });
  };

  const setShowMSD = (show: boolean) => {
    setRandomWalkUIState({
      ...randomWalkUIState,
      showMSD: show || false
    });
  };

  // Register/unregister ParticleCountObservable based on visibility
  useEffect(() => {
    if (!simReady || !simulatorRef.current) return;

    if (randomWalkUIState.showParticleCount) {
      const observable = new ParticleCountObservable();
      simulatorRef.current.registerObservable(observable);
      console.log("[ObservablesPanel] Registered ParticleCountObservable");
      setIsParticleCountRegistered(true);

      return () => {
        if (simulatorRef.current) {
          simulatorRef.current.unregisterObservable('particleCount');
          console.log("[ObservablesPanel] Unregistered ParticleCountObservable");
        }
        setIsParticleCountRegistered(false);
      };
    }
  }, [randomWalkUIState.showParticleCount, simReady]);

  // Register/unregister KineticEnergyObservable based on visibility
  useEffect(() => {
    if (!simReady || !simulatorRef.current) return;

    if (randomWalkUIState.showKineticEnergy) {
      const observable = new KineticEnergyObservable();
      simulatorRef.current.registerObservable(observable);
      console.log("[ObservablesPanel] Registered KineticEnergyObservable");
      setIsKineticEnergyRegistered(true);

      return () => {
        if (simulatorRef.current) {
          simulatorRef.current.unregisterObservable('kineticEnergy');
          console.log("[ObservablesPanel] Unregistered KineticEnergyObservable");
        }
        setIsKineticEnergyRegistered(false);
      };
    }
  }, [randomWalkUIState.showKineticEnergy, simReady]);

  // Register/unregister MomentumObservable based on visibility
  useEffect(() => {
    if (!simReady || !simulatorRef.current) return;

    if (randomWalkUIState.showTotalMomentum) {
      const observable = new MomentumObservable();
      simulatorRef.current.registerObservable(observable);
      console.log("[ObservablesPanel] Registered MomentumObservable");
      setIsMomentumRegistered(true);

      return () => {
        if (simulatorRef.current) {
          simulatorRef.current.unregisterObservable('momentum');
          console.log("[ObservablesPanel] Unregistered MomentumObservable");
        }
        setIsMomentumRegistered(false);
      };
    }
  }, [randomWalkUIState.showTotalMomentum, simReady]);

  // Register/unregister MSDObservable based on visibility
  useEffect(() => {
    if (!simReady || !simulatorRef.current) return;

    if (randomWalkUIState.showMSD) {
      const observable = new MSDObservable();
      simulatorRef.current.registerObservable(observable);
      console.log("[ObservablesPanel] Registered MSDObservable");
      setIsMSDRegistered(true);

      return () => {
        if (simulatorRef.current) {
          simulatorRef.current.unregisterObservable('msd');
          console.log("[ObservablesPanel] Unregistered MSDObservable");
        }
        setIsMSDRegistered(false);
      };
    }
  }, [randomWalkUIState.showMSD, simReady]);

  // Update particle count data when running or refresh when simulation state changes
  useEffect(() => {
    if (!randomWalkUIState.showParticleCount) return;
    if (!isParticleCountRegistered) return; // gate polling until observable is registered

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
  }, [randomWalkUIState.showParticleCount, isRunning, isParticleCountRegistered, simReady]);

  // Update kinetic energy data when running or refresh when simulation state changes
  useEffect(() => {
    if (!randomWalkUIState.showKineticEnergy) return;
    if (!isKineticEnergyRegistered) return; // gate polling until observable is registered

    if (isRunning) {
      const interval = setInterval(() => {
        if (simulatorRef.current) {
          const data = simulatorRef.current.getObservableData('kineticEnergy');
          if (data) {
            setKineticEnergyData(data);
          }
        }
      }, 100); // Update every 100ms
      return () => clearInterval(interval);
    } else {
      // Get final data when paused/stopped
      if (simulatorRef.current) {
        const data = simulatorRef.current.getObservableData('kineticEnergy');
        if (data) {
          setKineticEnergyData(data);
        }
      }
    }
  }, [randomWalkUIState.showKineticEnergy, isRunning, isKineticEnergyRegistered, simReady]);

  // Update momentum data when running or refresh when simulation state changes
  useEffect(() => {
    if (!randomWalkUIState.showTotalMomentum) return;
    if (!isMomentumRegistered) return; // gate polling until observable is registered

    if (isRunning) {
      const interval = setInterval(() => {
        if (simulatorRef.current) {
          const data = simulatorRef.current.getObservableData('momentum');
          if (data) {
            setMomentumData(data);
          }
        }
      }, 100); // Update every 100ms
      return () => clearInterval(interval);
    } else {
      // Get final data when paused/stopped
      if (simulatorRef.current) {
        const data = simulatorRef.current.getObservableData('momentum');
        if (data) {
          setMomentumData(data);
        }
      }
    }
  }, [randomWalkUIState.showTotalMomentum, isRunning, isMomentumRegistered, simReady]);

  // Update MSD data when running or refresh when simulation state changes
  useEffect(() => {
    if (!randomWalkUIState.showMSD) return;
    if (!isMSDRegistered) return; // gate polling until observable is registered

    if (isRunning) {
      const interval = setInterval(() => {
        if (simulatorRef.current) {
          const data = simulatorRef.current.getObservableData('msd');
          if (data) {
            setMSDData(data);
          }
        }
      }, 100); // Update every 100ms
      return () => clearInterval(interval);
    } else {
      // Get final data when paused/stopped
      if (simulatorRef.current) {
        const data = simulatorRef.current.getObservableData('msd');
        if (data) {
          setMSDData(data);
        }
      }
    }
  }, [randomWalkUIState.showMSD, isRunning, isMSDRegistered, simReady]);

  // Reset observable data when simulation is reset
  useEffect(() => {
    if (simulationStatus === "Stopped") {
      setParticleCountData(null);
      setKineticEnergyData(null);
      setMomentumData(null);
      setMSDData(null);
    }
  }, [simulationStatus]);

  return (
    <div className="space-y-4">
      {/* Particle Count Observable */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Particle Count N(t)</label>
          <input
            type="checkbox"
            checked={randomWalkUIState.showParticleCount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowParticleCount(e.target.checked)}
            className="rounded"
          />
        </div>

        {randomWalkUIState.showParticleCount && (
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-mono">{particleCountData?.totalCount ?? 'No data'}</span>
            </div>
            <div className="flex justify-between">
              <span>Active:</span>
              <span className="font-mono text-green-600">{particleCountData?.activeCount ?? 'No data'}</span>
            </div>
            <div className="flex justify-between">
              <span>Inactive:</span>
              <span className="font-mono text-red-600">{particleCountData?.inactiveCount ?? 'No data'}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Time:</span>
              <span className="font-mono">{particleCountData?.timestamp?.toFixed(2) ?? 'No data'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Kinetic Energy Observable */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Kinetic Energy</label>
          <input
            type="checkbox"
            checked={randomWalkUIState.showKineticEnergy}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowKineticEnergy(e.target.checked)}
            className="rounded"
          />
        </div>

        {randomWalkUIState.showKineticEnergy && (
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Total KE:</span>
              <span className="font-mono">{kineticEnergyData?.totalKineticEnergy?.toFixed(3) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between">
              <span>Average KE:</span>
              <span className="font-mono">{kineticEnergyData?.averageKineticEnergy?.toFixed(6) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between">
              <span>Max KE:</span>
              <span className="font-mono text-orange-600">{kineticEnergyData?.maxKineticEnergy?.toFixed(6) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between">
              <span>Min KE:</span>
              <span className="font-mono text-blue-600">{kineticEnergyData?.minKineticEnergy?.toFixed(6) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Active particles:</span>
              <span className="font-mono">{kineticEnergyData?.activeParticleCount ?? 'No data'}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Time:</span>
              <span className="font-mono">{kineticEnergyData?.timestamp?.toFixed(2) ?? 'No data'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Momentum Observable */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Total Momentum</label>
          <input
            type="checkbox"
            checked={randomWalkUIState.showTotalMomentum}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowMomentum(e.target.checked)}
            className="rounded"
          />
        </div>

        {randomWalkUIState.showTotalMomentum && (
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>|P| total:</span>
              <span className="font-mono">{momentumData?.totalMomentumMagnitude?.toFixed(2) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between">
              <span>Px:</span>
              <span className="font-mono text-red-600">{momentumData?.totalMomentumX?.toFixed(2) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between">
              <span>Py:</span>
              <span className="font-mono text-green-600">{momentumData?.totalMomentumY?.toFixed(2) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between">
              <span>|P| avg:</span>
              <span className="font-mono">{momentumData?.averageMomentumMagnitude?.toFixed(4) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Active particles:</span>
              <span className="font-mono">{momentumData?.activeParticleCount ?? 'No data'}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Time:</span>
              <span className="font-mono">{momentumData?.timestamp?.toFixed(2) ?? 'No data'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Mean Squared Displacement Observable */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Mean Squared Displacement</label>
          <input
            type="checkbox"
            checked={randomWalkUIState.showMSD}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowMSD(e.target.checked)}
            className="rounded"
          />
        </div>

        {randomWalkUIState.showMSD && (
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>MSD:</span>
              <span className="font-mono">{msdData?.meanSquaredDisplacement?.toFixed(1) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between">
              <span>RMSD:</span>
              <span className="font-mono">{msdData?.rootMeanSquaredDisplacement?.toFixed(2) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between">
              <span>Max disp:</span>
              <span className="font-mono text-orange-600">{msdData?.maxDisplacement?.toFixed(2) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between">
              <span>Min disp:</span>
              <span className="font-mono text-blue-600">{msdData?.minDisplacement?.toFixed(2) ?? 'No data'}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Active particles:</span>
              <span className="font-mono">{msdData?.activeParticleCount ?? 'No data'}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Time:</span>
              <span className="font-mono">{msdData?.timestamp?.toFixed(2) ?? 'No data'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
