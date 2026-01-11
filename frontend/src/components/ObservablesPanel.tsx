import React, { useEffect, useRef, useMemo, useState } from "react";
import { useAppStore } from "../stores/appStore";
import { MomentumObservable } from "../physics/observables/MomentumObservable";
import { MSDObservable } from "../physics/observables/MSDObservable";
import { TextObservable } from "../physics/observables/TextObservable";
import { TextObservableParser } from "../physics/observables/TextObservableParser";
import { BUILT_IN_OBSERVABLES } from "./observablesConfig";
import { useObservablesPolling } from "./useObservablesPolling";
// Generic renderer for any observable
function ObservableDisplay({ config, data, isVisible, onToggle }: any) {
    const formatValue = (value: any, format: string | undefined, precision: number | undefined) => {
        if (value === null || value === undefined)
            return 'No data';
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
    return (<div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">{config.name}</label>
        <input type="checkbox" checked={isVisible} onChange={(e) => onToggle(e.target.checked)} className="rounded"/>
      </div>

      {isVisible && (<div className="text-sm space-y-1">
          {config.fields.map((field, index) => {
                const value = data ? data[field.path] : null;
                const formattedValue = formatValue(value, (field as any).format, (field as any).precision);
                const className = `font-mono ${field.color ? `text-${field.color}-600` : ''}`;
                return (<div key={index} className="flex justify-between">
                <span>{field.label}:</span>
                <span className={className}>{formattedValue}</span>
              </div>);
            })}
        </div>)}
    </div>);
}
export function ObservablesPanel({ simulatorRef, isRunning, simulationStatus, simReady }) {
    const { randomWalkUIState, setRandomWalkUIState, customObservables, customObservableVisibility, setCustomObservableVisibility } = useAppStore();
    // Parse custom observables to extract names and intervals
    const customObservableConfigs = useMemo(() => {
        return customObservables.map((text, index) => {
            try {
                const parsed = TextObservableParser.parse(text)[0];
                const name = parsed?.name || `custom_${index}`;
                const interval = parsed?.interval || 1000;
                return { name, text, interval, valid: true };
            }
            catch (error) {
                return { name: `custom_${index}`, text, interval: 1000, valid: false };
            }
        });
    }, [customObservables]);
    // Get visible custom observables - now handled by unified polling
    const visibleCustomObservableIds = useMemo(() => customObservableConfigs
        .filter(config => config.valid && customObservableVisibility[config.name])
        .map(config => `text_${config.name}`), [customObservableConfigs, customObservableVisibility]);
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
    const observableData = useObservablesPolling(simulatorRef, allVisibleObservables, customObservableConfigs, isRunning, simReady || false);
    // Toggle functions for built-in observables
    const toggleObservable = (observableId, visible) => {
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
    const prevVisibleRef = useRef(new Set());
    useEffect(() => {
        if (!simReady || !simulatorRef.current)
            return;
        const manager = simulatorRef.current.getObservableManager();
        const current = new Set(visibleBuiltInObservables);
        const prev = prevVisibleRef.current;
        // Register newly visible
        current.forEach(observableId => {
            if (prev.has(observableId))
                return;
            const config = BUILT_IN_OBSERVABLES[observableId];
            if (!config)
                return;
            try {
                switch (observableId) {
                    case 'particleCount':
                        // Use text observable system for particle count
                        const validation = TextObservable.validate(config.text);
                        if (validation.valid) {
                            manager.registerTextObservable(config.text);
                        }
                        else {
                            console.error(`[ObservablesPanel] Failed to register ${observableId}:`, validation.errors);
                        }
                        break;
                    case 'kineticEnergy':
                        // Use text observable system for kinetic energy
                        const keValidation = TextObservable.validate(config.text);
                        if (keValidation.valid) {
                            manager.registerTextObservable(config.text);
                        }
                        else {
                            console.error(`[ObservablesPanel] Failed to register ${observableId}:`, keValidation.errors);
                        }
                        break;
                    case 'momentum':
                        if (!manager.hasObserver('momentum'))
                            manager.register(new MomentumObservable());
                        break;
                    case 'msd':
                        if (!manager.hasObserver('msd'))
                            manager.register(new MSDObservable());
                        break;
                    default:
                        const textValidation = TextObservable.validate(config.text);
                        if (textValidation.valid) {
                            manager.registerTextObservable(config.text);
                        }
                        else {
                            console.error(`[ObservablesPanel] Failed to register ${observableId}:`, textValidation.errors);
                        }
                }
                console.log(`[ObservablesPanel] Registered ${observableId}`);
            }
            catch (e) {
                console.error(`[ObservablesPanel] Error registering ${observableId}:`, e);
            }
        });
        // Unregister those no longer visible
        prev.forEach((observableId: string) => {
            if (current.has(observableId))
                return;
            try {
                manager.unregister(observableId);
                console.log(`[ObservablesPanel] Unregistered ${observableId}`);
            }
            catch (e) {
                console.error(`[ObservablesPanel] Error unregistering ${observableId}:`, e);
            }
        });
        // Update prev ref
        prevVisibleRef.current = current;
    }, [simReady, visibleBuiltInObservables]);
    // Register/unregister custom observables (registration only, polling handled by unified hook)
    const prevVisibleCustomRef = useRef(new Set());
    useEffect(() => {
        if (!simReady || !simulatorRef.current)
            return;
        const manager = simulatorRef.current.getObservableManager();
        const currentVisible = new Set(customObservableConfigs.filter(c => customObservableVisibility[c.name]).map(c => c.name));
        const prevVisible = prevVisibleCustomRef.current;
        // Register newly visible custom observables
        customObservableConfigs.filter(c => customObservableVisibility[c.name]).forEach(config => {
            if (!config.valid || prevVisible.has(config.name))
                return;
            try {
                manager.registerTextObservable(config.text);
                console.log(`[ObservablesPanel] Registered custom observable: ${config.name}`);
            }
            catch (error) {
                console.error(`[ObservablesPanel] Failed to register ${config.name}:`, error);
            }
        });
        // Unregister no longer visible custom observables
        prevVisible.forEach((name: string) => {
            if (currentVisible.has(name))
                return;
            try {
                manager.unregister(`text_${name}`);
                console.log(`[ObservablesPanel] Unregistered custom observable: ${name}`);
            }
            catch (error) {
                console.error(`[ObservablesPanel] Error unregistering ${name}:`, error);
            }
        });
        // Update prev ref
        prevVisibleCustomRef.current = currentVisible;
    }, [simReady, customObservableConfigs, customObservableVisibility]);
    const [storeSize, setStoreSize] = useState(null);
    const calculateStoreSize = () => {
        const state = useAppStore.getState();
        const dataState = {
            activeTab: state.activeTab,
            simulationParams: state.simulationParams,
            pdeState: state.pdeState,
            pdeUIState: state.pdeUIState,
            gridLayoutParams: state.gridLayoutParams,
            randomWalkSimLayouts: state.randomWalkSimLayouts,
            randomWalkUIState: state.randomWalkUIState,
            randomWalkSimulationState: state.randomWalkSimulationState,
            observablesWindow: state.observablesWindow,
            customObservablesWindow: state.customObservablesWindow,
            zCounter: state.zCounter,
            observablesCollapsed: state.observablesCollapsed,
            customObservablesCollapsed: state.customObservablesCollapsed,
            customObservables: state.customObservables,
            customObservableVisibility: state.customObservableVisibility,
            useNewEngine: state.useNewEngine,
            useStreamingObservables: state.useStreamingObservables,
            useGPU: state.useGPU,
        };
        const sizeInBytes = new TextEncoder().encode(JSON.stringify(dataState)).length;
        setStoreSize(sizeInBytes);
    };
    return (<div className="space-y-4">
      {/* Built-in Observables */}
      {Object.entries(BUILT_IN_OBSERVABLES).map(([id, config]) => (<ObservableDisplay key={id} config={config} data={observableData[id]} isVisible={visibleBuiltInObservables.includes(id)} onToggle={(visible) => toggleObservable(id, visible)}/>))}

      {/* Custom Observables Section */}
      {customObservableConfigs.length > 0 && (<>
          <div className="border-t pt-3">
            <div className="text-sm font-medium text-gray-600 mb-3">
              Custom Observables ({customObservableConfigs.length})
            </div>
          </div>
          
          {customObservableConfigs.map(config => {
                const isVisible = customObservableVisibility[config.name] || false;
                const data = observableData[`text_${config.name}`];
                // Create a simple config for ObservableDisplay
                const displayConfig = {
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
                    ],
                    uiToggle: 'showParticleCount' // Placeholder, not used for toggling
                };
                return (<ObservableDisplay key={config.name} config={displayConfig} data={data !== undefined ? data : null} isVisible={isVisible} onToggle={(visible) => setCustomObservableVisibility(config.name, visible)}/>);
            })}
        </>)}

      {/* Store Size Diagnostic */}
      <div className="mt-3 p-3 rounded bg-white border border-gray-200 text-gray-800">
        <div className="font-medium mb-2 text-sm">Application State</div>
        <div className="flex items-center justify-between">
          <div>
            {storeSize !== null ? (<span className="font-mono text-xs">
                {(storeSize / 1024 / 1024).toFixed(3)} MB ({storeSize.toLocaleString()} bytes)
              </span>) : (<span className="text-gray-500 text-xs">Click to calculate</span>)}
          </div>
          <button onClick={calculateStoreSize} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs font-medium">
            Calculate Store Size
          </button>
        </div>
      </div>
    </div>);
}
