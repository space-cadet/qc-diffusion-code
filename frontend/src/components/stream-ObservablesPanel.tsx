import React, { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import type { RandomWalkSimulator } from '../physics/RandomWalkSimulator';
import { BUILT_IN_OBSERVABLES, type ObservableConfig } from './observablesConfig';
import { useObservableStream } from './stream-useObservableStream';
import { ParticleCountObservable } from "../physics/observables/ParticleCountObservable";
import { KineticEnergyObservable } from "../physics/observables/KineticEnergyObservable";
import { MomentumObservable } from "../physics/observables/MomentumObservable";
import { MSDObservable } from "../physics/observables/MSDObservable";
import { TextObservable } from '../physics/observables/TextObservable';
import { TextObservableParser } from '../physics/observables/TextObservableParser';
import { StreamObservableManager } from '../physics/stream-ObservableManager';

// Simplified display component, unchanged from original panel
function ObservableDisplay({ config, data, isVisible, onToggle }: { config: ObservableConfig; data: any; isVisible: boolean; onToggle: (visible: boolean) => void; }) {
  const formatValue = (value: any, format: string, precision?: number): string => {
    if (value === null || value === undefined) return 'No data';
    switch (format) {
      case 'scientific': return typeof value === 'number' ? value.toExponential(precision || 3) : String(value);
      case 'fixed': return typeof value === 'number' ? value.toFixed(precision || 2) : String(value);
      default: return String(value);
    }
  };

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">{config.name}</label>
        <input type="checkbox" checked={isVisible} onChange={(e) => onToggle(e.target.checked)} className="rounded" />
      </div>
      {isVisible && (
        <div className="text-sm space-y-1">
          {config.fields.map((field, index) => {
            const value = data ? data[field.path] : null;
            const formattedValue = formatValue(value, field.format, field.precision);
            return (
              <div key={index} className="flex justify-between">
                <span>{field.label}:</span>
                <span className={`font-mono ${field.color ? `text-${field.color}-600` : ''}`}>{formattedValue}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main Panel Component
export function StreamObservablesPanel({ simulatorRef, simReady }: { simulatorRef: React.RefObject<RandomWalkSimulator | null>; simReady?: boolean; }) {
  const { randomWalkUIState, setRandomWalkUIState, customObservables, customObservableVisibility, setCustomObservableVisibility } = useAppStore();

  // --- Determine Visible Observables ---
  const visibleBuiltInIds = useMemo(() => Object.keys(BUILT_IN_OBSERVABLES).filter(id => {
    switch (id) {
      case 'particleCount': return randomWalkUIState.showParticleCount;
      case 'kineticEnergy': return randomWalkUIState.showKineticEnergy;
      case 'momentum': return randomWalkUIState.showTotalMomentum;
      case 'msd': return randomWalkUIState.showMSD;
      default: return false;
    }
  }), [randomWalkUIState]);

  const customObservableConfigs = useMemo(() => customObservables.map((text, i) => ({
    name: TextObservableParser.parse(text)[0]?.name || `custom_${i}`,
    valid: TextObservable.validate(text).valid,
    index: i
  })), [customObservables]);

  const visibleCustomIds = useMemo(() => 
    customObservableConfigs
      .filter(c => c.valid && customObservableVisibility[c.name])
      .map(c => `text_${c.name}`),
    [customObservableConfigs, customObservableVisibility]
  );

  const allVisibleIds = useMemo(() => [...visibleBuiltInIds, ...visibleCustomIds], [visibleBuiltInIds, visibleCustomIds]);

  // --- Register/Unregister Observables ---
  const prevVisibleRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!simReady || !simulatorRef.current) return;
    const manager = simulatorRef.current.getObservableManager();
    if (!(manager instanceof StreamObservableManager)) return;

    const currentVisible = new Set(allVisibleIds);
    const prevVisible = prevVisibleRef.current;

    // Register new observables
    currentVisible.forEach(id => {
      if (!prevVisible.has(id) && !manager.hasObserver(id)) {
        try {
          if (BUILT_IN_OBSERVABLES[id]) {
            const config = BUILT_IN_OBSERVABLES[id];
            const definition = TextObservableParser.parse(config.text)[0];
            const observable = new TextObservable(definition, (simulatorRef.current as any).getParticleManager().getCoordinateSystem().getBoundaries());
            (observable as any).id = id;
            manager.register(observable);
          } else if (id.startsWith('text_')) {
            const name = id.substring(5);
            const config = customObservableConfigs.find(c => c.name === name);
            if (config) {
              const customObservableText = customObservables[config.index];
              if (customObservableText) {
                manager.registerTextObservable(customObservableText);
              }
            }
          }
        } catch (e) { console.error(`Failed to register ${id}`, e); }
      }
    });

    // Unregister old observables
    prevVisible.forEach(id => {
      if (!currentVisible.has(id)) {
        if (id.startsWith('text_')) {
          const name = id.substring(5);
          manager.unregisterTextObservable(name);
        } else {
          manager.unregister(id);
        }
      }
    });

    prevVisibleRef.current = currentVisible;
  }, [allVisibleIds, simReady, simulatorRef, customObservables, customObservableConfigs]);

  // --- Subscribe to Data Stream ---
  const observableData = useObservableStream(simulatorRef.current?.getObservableManager() || null, allVisibleIds);

  // --- Render Logic ---
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Observables (Streaming)</h2>
      {Object.entries(BUILT_IN_OBSERVABLES).map(([id, config]) => (
        <ObservableDisplay
          key={id}
          config={config}
          data={observableData[id]}
          isVisible={visibleBuiltInIds.includes(id)}
          onToggle={(visible) => setRandomWalkUIState({ [config.uiToggle]: visible } as Partial<typeof randomWalkUIState>)}
        />
      ))}
      {customObservableConfigs.map((config, index) => {
        const observableId = `text_${config.name}`;
        return (
          <ObservableDisplay
            key={`custom-${index}`}
            config={{
              id: observableId,
              name: config.name,
              fields: [{ label: 'Value', path: 'value', format: 'fixed', precision: 4 }],
              text: customObservables[config.index] || '',
              pollingInterval: 500,
              uiToggle: 'showParticleCount' // Placeholder, not used for toggling custom observables
            }}
            data={observableData[observableId]}
            isVisible={visibleCustomIds.includes(observableId)}
            onToggle={(visible) => setCustomObservableVisibility(config.name, visible)}
          />
        );
      })}
    </div>
  );
}