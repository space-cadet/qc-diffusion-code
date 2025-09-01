import React, { useState, useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import type { RandomWalkSimulator } from "../physics/RandomWalkSimulator";
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
    setRandomWalkUIState,
    customObservables,
    addCustomObservable,
    removeCustomObservable
  } = useAppStore();

  // Custom observable UI state
  const [showCustomObservables, setShowCustomObservables] = useState(false);
  const [newObservableText, setNewObservableText] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Determine which built-in observables are visible
  const visibleObservables = Object.keys(BUILT_IN_OBSERVABLES).filter(id => {
    switch (id) {
      case 'particleCount': return randomWalkUIState.showParticleCount;
      case 'kineticEnergy': return randomWalkUIState.showKineticEnergy;
      case 'momentum': return randomWalkUIState.showTotalMomentum;
      case 'msd': return randomWalkUIState.showMSD;
      default: return false;
    }
  });

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

  // Register/unregister built-in observables based on visibility
  useEffect(() => {
    if (!simReady || !simulatorRef.current) return;

    visibleObservables.forEach(observableId => {
      const config = BUILT_IN_OBSERVABLES[observableId];
      if (config && simulatorRef.current) {
        // Load the text-based observable
        const validation = TextObservable.validate(config.text);
        if (validation.valid) {
          simulatorRef.current.getObservableManager().registerTextObservable(config.text);
          console.log(`[ObservablesPanel] Registered ${observableId}`);
        } else {
          console.error(`[ObservablesPanel] Failed to register ${observableId}:`, validation.errors);
        }
      }
    });

    // Cleanup function to unregister when visibility changes
    return () => {
      if (simulatorRef.current) {
        visibleObservables.forEach(observableId => {
          simulatorRef.current!.getObservableManager().unregisterTextObservable(observableId);
          console.log(`[ObservablesPanel] Unregistered ${observableId}`);
        });
      }
    };
  }, [visibleObservables, simReady]);

  // Load custom observables when simulator is ready
  useEffect(() => {
    if (simReady && simulatorRef.current && customObservables.length > 0) {
      simulatorRef.current.getObservableManager().loadTextObservables(customObservables);
    }
  }, [simReady, customObservables]);

  const handleAddCustomObservable = () => {
    const validation = TextObservable.validate(newObservableText);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    addCustomObservable(newObservableText);
    setNewObservableText('');
    setValidationErrors([]);
  };

  const handleRemoveCustomObservable = (index: number) => {
    removeCustomObservable(index);
  };

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

      {/* Custom Observables */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Custom Observables</label>
          <button
            onClick={() => setShowCustomObservables(!showCustomObservables)}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
          >
            {showCustomObservables ? 'Hide' : 'Show'}
          </button>
        </div>

        {showCustomObservables && (
          <div className="space-y-3">
            <div>
              <textarea
                value={newObservableText}
                onChange={(e) => setNewObservableText(e.target.value)}
                placeholder={`observable "my_observable" {\n  filter: speed > 2.0\n  select: velocity.magnitude\n  reduce: mean\n}`}
                className="w-full text-xs font-mono border rounded p-2 h-20 resize-none"
              />
              {validationErrors.length > 0 && (
                <div className="text-xs text-red-500 mt-1">
                  {validationErrors.map((error, i) => (
                    <div key={i}>{error}</div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleAddCustomObservable}
              className="text-xs bg-green-500 text-white px-3 py-1 rounded"
            >
              Add Observable
            </button>

            {customObservables.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600">Saved Observables:</div>
                {customObservables.map((obs, index) => (
                  <div key={index} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                    <div className="font-mono text-gray-700 truncate flex-1 mr-2">
                      {obs.split('\n')[0].replace(/observable\s+"([^"]+)".*/, '$1')}
                    </div>
                    <button
                      onClick={() => handleRemoveCustomObservable(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
