import React, { useEffect, useRef, useMemo } from "react";
import { useAppStore } from "../stores/appStore";
import type { RandomWalkSimulator } from "../physics/RandomWalkSimulator";
import { ParticleCountObservable } from "../physics/observables/ParticleCountObservable";
import { KineticEnergyObservable } from "../physics/observables/KineticEnergyObservable";
import { MomentumObservable } from "../physics/observables/MomentumObservable";
import { MSDObservable } from "../physics/observables/MSDObservable";
import { TextObservable } from "../physics/observables/TextObservable";
import { BUILT_IN_OBSERVABLES, type ObservableConfig, type ObservableField } from "./observablesConfig";
import { useObservablesPolling } from "./useObservablesPolling";

interface ObservablesPanelProps {
  simulatorRef: React.RefObject<RandomWalkSimulator | null>;
  isRunning: boolean;
  simulationStatus: string;
  simReady?: boolean;
}

// Generic renderer for any observable
function ObservableDisplay({
  config,
  data,
  isVisible,
  onToggle
}: {
  config: ObservableConfig;
  data: any;
  isVisible: boolean;
  onToggle: (visible: boolean) => void;
}) {
  const formatValue = (value: any, format: string, precision?: number): string => {
    if (value === null || value === undefined) return 'No data';

    switch (format) {
      case 'scientific':
        return typeof value === 'number' ? value.toExponential(precision || 3) : String(value);
      case 'fixed':
        return typeof value === 'number' ? value.toFixed(precision || 2) : String(value);
      case 'number':
      default:
        return String(value);
    }
  };

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">{config.name}</label>
        <input
          type="checkbox"
          checked={isVisible}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onToggle(e.target.checked)}
          className="rounded"
        />
      </div>

      {isVisible && (
        <div className="text-sm space-y-1">
          {config.fields.map((field, index) => {
            const value = data ? data[field.path] : null;
            const formattedValue = formatValue(value, field.format, field.precision);
            const className = `font-mono ${field.color ? `text-${field.color}-600` : ''}`;

            return (
              <div key={index} className="flex justify-between">
                <span>{field.label}:</span>
                <span className={className}>{formattedValue}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ObservablesPanel({ simulatorRef, isRunning, simulationStatus, simReady }: ObservablesPanelProps) {
  const {
    randomWalkUIState,
    setRandomWalkUIState
  } = useAppStore();

  // Determine which built-in observables are visible (memoized to prevent re-renders)
  const visibleObservables = useMemo(() => Object.keys(BUILT_IN_OBSERVABLES).filter(id => {
    switch (id) {
      case 'particleCount': return randomWalkUIState.showParticleCount;
      case 'kineticEnergy': return randomWalkUIState.showKineticEnergy;
      case 'momentum': return randomWalkUIState.showTotalMomentum;
      case 'msd': return randomWalkUIState.showMSD;
      default: return false;
    }
  }), [randomWalkUIState.showParticleCount, randomWalkUIState.showKineticEnergy, randomWalkUIState.showTotalMomentum, randomWalkUIState.showMSD]);

  // Use unified polling hook
  const observableData = useObservablesPolling(
    simulatorRef,
    visibleObservables,
    isRunning,
    simReady || false
  );

  // Toggle functions for built-in observables
  const toggleObservable = (observableId: string, visible: boolean) => {
    switch (observableId) {
      case 'particleCount':
        setRandomWalkUIState({
          ...randomWalkUIState,
          showParticleCount: visible
        });
        break;
      case 'kineticEnergy':
        setRandomWalkUIState({
          ...randomWalkUIState,
          showKineticEnergy: visible
        });
        break;
      case 'momentum':
        setRandomWalkUIState({
          ...randomWalkUIState,
          showTotalMomentum: visible
        });
        break;
      case 'msd':
        setRandomWalkUIState({
          ...randomWalkUIState,
          showMSD: visible
        });
        break;
    }
  };

  // Register/unregister built-in observables based on visibility (idempotent)
  const prevVisibleRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!simReady || !simulatorRef.current) return;

    const manager = simulatorRef.current.getObservableManager();
    const current = new Set(visibleObservables);
    const prev = prevVisibleRef.current;

    // Register newly visible
    current.forEach(observableId => {
      if (prev.has(observableId)) return;
      const config = BUILT_IN_OBSERVABLES[observableId];
      if (!config) return;
      try {
        switch (observableId) {
          case 'particleCount':
            if (!manager.hasObserver('particleCount')) manager.register(new ParticleCountObservable());
            break;
          case 'kineticEnergy':
            if (!manager.hasObserver('kineticEnergy')) manager.register(new KineticEnergyObservable());
            break;
          case 'momentum':
            if (!manager.hasObserver('momentum')) manager.register(new MomentumObservable());
            break;
          case 'msd':
            if (!manager.hasObserver('msd')) manager.register(new MSDObservable());
            break;
          default:
            const validation = TextObservable.validate(config.text);
            if (validation.valid) {
              manager.registerTextObservable(config.text);
            } else {
              console.error(`[ObservablesPanel] Failed to register ${observableId}:`, validation.errors);
            }
        }
        console.log(`[ObservablesPanel] Registered ${observableId}`);
      } catch (e) {
        console.error(`[ObservablesPanel] Error registering ${observableId}:`, e);
      }
    });

    // Unregister those no longer visible
    prev.forEach(observableId => {
      if (current.has(observableId)) return;
      try {
        manager.unregister(observableId);
        console.log(`[ObservablesPanel] Unregistered ${observableId}`);
      } catch (e) {
        console.error(`[ObservablesPanel] Error unregistering ${observableId}:`, e);
      }
    });

    // Update prev ref
    prevVisibleRef.current = current;
  }, [simReady, visibleObservables]);



  return (
    <div className="space-y-4">
      {/* Built-in Observables */}
      {Object.entries(BUILT_IN_OBSERVABLES).map(([id, config]) => (
        <ObservableDisplay
          key={id}
          config={config}
          data={observableData[id]}
          isVisible={visibleObservables.includes(id)}
          onToggle={(visible) => toggleObservable(id, visible)}
        />
      ))}
    </div>
  );
}
