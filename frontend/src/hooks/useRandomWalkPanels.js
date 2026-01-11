import { useCallback } from "react";
import { useAppStore } from "../stores/appStore";
export function useRandomWalkPanels() {
    const { observablesWindow, setObservablesWindow, customObservablesWindow, setCustomObservablesWindow, zCounter, setZCounter, observablesCollapsed, setObservablesCollapsed, customObservablesCollapsed, setCustomObservablesCollapsed, } = useAppStore();
    const handleObservablesDragStop = useCallback((x, y) => {
        setObservablesWindow({ ...observablesWindow, left: x, top: y });
    }, [observablesWindow, setObservablesWindow]);
    const handleObservablesResizeStop = useCallback((width, height, x, y) => {
        setObservablesWindow({ ...observablesWindow, width, height, left: x, top: y });
    }, [observablesWindow, setObservablesWindow]);
    const handleObservablesMouseDown = useCallback(() => {
        const nextZ = zCounter + 1;
        setZCounter(nextZ);
        setObservablesWindow({ ...observablesWindow, zIndex: nextZ });
    }, [zCounter, setZCounter, observablesWindow, setObservablesWindow]);
    const handleObservablesToggleCollapse = useCallback(() => {
        setObservablesCollapsed(!observablesCollapsed);
    }, [observablesCollapsed, setObservablesCollapsed]);
    const handleCustomObservablesDragStop = useCallback((x, y) => {
        setCustomObservablesWindow({ ...customObservablesWindow, left: x, top: y });
    }, [customObservablesWindow, setCustomObservablesWindow]);
    const handleCustomObservablesResizeStop = useCallback((width, height, x, y) => {
        setCustomObservablesWindow({ ...customObservablesWindow, width, height, left: x, top: y });
    }, [customObservablesWindow, setCustomObservablesWindow]);
    const handleCustomObservablesMouseDown = useCallback(() => {
        const nextZ = zCounter + 1;
        setZCounter(nextZ);
        setCustomObservablesWindow({ ...customObservablesWindow, zIndex: nextZ });
    }, [zCounter, setZCounter, customObservablesWindow, setCustomObservablesWindow]);
    const handleCustomObservablesToggleCollapse = useCallback(() => {
        setCustomObservablesCollapsed(!customObservablesCollapsed);
    }, [customObservablesCollapsed, setCustomObservablesCollapsed]);
    return {
        // Observables panel state
        observablesWindow,
        observablesCollapsed,
        handleObservablesDragStop,
        handleObservablesResizeStop,
        handleObservablesMouseDown,
        handleObservablesToggleCollapse,
        // Custom observables panel state
        customObservablesWindow,
        customObservablesCollapsed,
        handleCustomObservablesDragStop,
        handleCustomObservablesResizeStop,
        handleCustomObservablesMouseDown,
        handleCustomObservablesToggleCollapse,
        // Shared state
        zCounter,
    };
}
