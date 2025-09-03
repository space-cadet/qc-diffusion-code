import React, { useEffect, useRef, useMemo, useState } from "react";
import { useAppStore } from "../stores/appStore";
import type { RandomWalkSimulator } from "../physics/RandomWalkSimulator";
import { ParticleCountObservable } from "../physics/observables/ParticleCountObservable";
import { KineticEnergyObservable } from "../physics/observables/KineticEnergyObservable";
import { MomentumObservable } from "../physics/observables/MomentumObservable";
import { MSDObservable } from "../physics/observables/MSDObservable";
import { TextObservable } from "../physics/observables/TextObservable";
import { TextObservableParser } from "../physics/observables/TextObservableParser";
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
    customObservableVisibility,
    setCustomObservableVisibility
  } = useAppStore();

  // Parse custom observables to extract names and intervals
  const customObservableConfigs = useMemo(() => {
    return customObservables.map((text, index) => {
      try {
        const parsed = TextObservableParser.parse(text)[0];
        const name = parsed?.name || `custom_${index}`;
        const interval = parsed?.interval || 1000;
        return { name, text, interval, valid: true };
      } catch (error) {
        return { name: `custom_${index}`, text, interval: 1000, valid: false };
      }
    });
  }, [customObservables]);

  // Get visible custom observables - now handled by unified polling
  const visibleCustomObservableIds = useMemo(() => 
    customObservableConfigs
      .filter(config => config.valid && customObservableVisibility[config.name])
      .map(config => `text_${config.name}`)
  , [customObservableConfigs, customObservableVisibility]);

  // Determine which built-in observables are visible (memoized to prevent re-renders)
  const visibleBuiltInObservables = useMemo(() => Object.keys(BUILT_IN_OBSERVABLES).filter(id => {
    switch (id) {
      case 'particleCount': return randomWalkUIState.showParticleCount;
      case 'kineticEnergy': return randomWalkUIState.showKineticEnergy;
      case 'momentum': return randomWalkUIState.showTotalMomentum;
      case 'msd': return randomWalkUIState.showMSD;
      default: return false;
    }
  }), [randomWalkUIState.showParticleCount, randomWalkUIState.showKineticEnergy, randomWalkUIState.showTotalMomentum, randomWalkUIState.showMSD]);

  // Combine built-in and custom observable IDs for unified polling
  const allVisibleObservables = useMemo(() => [
    ...visibleBuiltInObservables,
    ...visibleCustomObservableIds
  ], [visibleBuiltInObservables, visibleCustomObservableIds]);

  // Use unified polling hook for all observables
  const observableData = useObservablesPolling(
    simulatorRef,
    allVisibleObservables,
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
    const current = new Set(visibleBuiltInObservables);
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
  }, [simReady, visibleBuiltInObservables]);

  // Register/unregister custom observables and handle individual polling
  const prevVisibleCustomRef = useRef<Set<string>>(new Set());
  const debug = (...args: any[]) => console.debug('[ObservablesPanel]', ...args);
  useEffect(() => {
    if (!simReady || !simulatorRef.current) return;
    
    debug('Registering custom observables');
    const manager = simulatorRef.current.getObservableManager();
    const intervals: NodeJS.Timeout[] = [];
    const currentVisible = new Set(customObservableConfigs.filter(c => customObservableVisibility[c.name]).map(c => c.name));
    const prevVisible = prevVisibleCustomRef.current;

    // Register newly visible custom observables
    customObservableConfigs.filter(c => customObservableVisibility[c.name]).forEach(config => {
      if (!config.valid || prevVisible.has(config.name)) return;
      
      debug(`Registering observable: ${config.name}`);
      try {
        manager.registerTextObservable(config.text);
      } catch (error) {
        debug(`Failed to register ${config.name}:`, error);
      }
    });

    // Unregister no longer visible custom observables
    prevVisible.forEach(name => {
      if (currentVisible.has(name)) return;
      
      try {
        manager.unregister(`text_${name}`);
        console.log(`[ObservablesPanel] Unregistered custom observable: ${name}`);
      } catch (error) {
        console.error(`[ObservablesPanel] Error unregistering ${name}:`, error);
      }
    });

    // Setup individual polling for visible custom observables
    customObservableConfigs.filter(c => customObservableVisibility[c.name]).forEach(config => {
      if (!config.valid) return;

      const observableId = `text_${config.name}`;
      const pollObservable = () => {
        if (!isRunning || !simulatorRef.current) return;
        
        const result = manager.getResult(observableId);
        debug(`Polling ${config.name}:`, result);
        
        // Custom observables handled by unified polling now, no separate state needed
      };

      // Initial poll
      pollObservable();

      // Setup interval polling
      const intervalId = setInterval(pollObservable, config.interval);
      intervals.push(intervalId);
    });

    // Update prev ref
    prevVisibleCustomRef.current = currentVisible;

    // Cleanup intervals on unmount or dependency change
    return () => {
      intervals.forEach(id => clearInterval(id));
      customObservableConfigs.filter(c => customObservableVisibility[c.name]).forEach(config => {
        debug(`Cleaning up polling for ${config.name}`);
      });
    };
  }, [simReady, isRunning, customObservableConfigs, customObservableVisibility, customObservables]);



  return (
    <div className="space-y-4">
      {/* Built-in Observables */}
      {Object.entries(BUILT_IN_OBSERVABLES).map(([id, config]) => (
        <ObservableDisplay
          key={id}
          config={config}
          data={observableData[id]}
          isVisible={visibleBuiltInObservables.includes(id)}
          onToggle={(visible) => toggleObservable(id, visible)}
        />
      ))}

      {/* Custom Observables Section */}
      {customObservableConfigs.length > 0 && (
        <>
          <div className="border-t pt-3">
            <div className="text-sm font-medium text-gray-600 mb-3">
              Custom Observables ({customObservableConfigs.length})
            </div>
          </div>
          
          {customObservableConfigs.map(config => {
            const isVisible = customObservableVisibility[config.name] || false;
            const data = observableData[`text_${config.name}`];
            
            // Create a simple config for ObservableDisplay
            const displayConfig: ObservableConfig = {
              id: `custom_${config.name}`,
              name: config.name,
              text: config.text,
              pollingInterval: config.interval,
              fields: [
                {
                  label: "Value",
                  path: "value", // Use structured format
                  format: "number",
                  precision: 4
                }
              ]
            };

            return (
              <ObservableDisplay
                key={config.name}
                config={displayConfig}
                data={data !== undefined ? data : null}
                isVisible={isVisible}
                onToggle={(visible) => setCustomObservableVisibility(config.name, visible)}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
