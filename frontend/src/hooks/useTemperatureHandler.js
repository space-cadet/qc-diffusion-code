import { useEffect, useRef } from 'react';
export const useTemperatureHandler = ({ gridLayoutParams, simulatorRef, tsParticlesContainerRef, setTempNotice }) => {
    const lastTempRef = useRef(undefined);
    useEffect(() => {
        const newT = gridLayoutParams.temperature;
        const prevT = lastTempRef.current;
        lastTempRef.current = newT;
        if (prevT === undefined)
            return;
        if (simulatorRef.current && typeof newT === 'number' && newT !== prevT) {
            const sim = simulatorRef.current;
            const container = tsParticlesContainerRef.current;
            try {
                // Update parameters (ensure canvas size is available for mappings)
                const w = container?.canvas?.size?.width || 800;
                const h = container?.canvas?.size?.height || 600;
                sim.updateParameters({
                    temperature: newT,
                    canvasWidth: w,
                    canvasHeight: h,
                    // keep other params unchanged; updateParameters merges selectively
                    collisionRate: gridLayoutParams.collisionRate,
                    jumpLength: gridLayoutParams.jumpLength,
                    velocity: gridLayoutParams.velocity,
                    simulationType: gridLayoutParams.simulationType,
                    dimension: gridLayoutParams.dimension,
                    interparticleCollisions: gridLayoutParams.interparticleCollisions,
                    strategies: gridLayoutParams.strategies,
                    graphType: gridLayoutParams.graphType,
                    graphSize: gridLayoutParams.graphSize,
                    particleCount: gridLayoutParams.particles,
                    // distribution params (so reseed uses current selection)
                    initialDistType: gridLayoutParams.initialDistType,
                    distSigmaX: gridLayoutParams.distSigmaX,
                    distSigmaY: gridLayoutParams.distSigmaY,
                    distR0: gridLayoutParams.distR0,
                    distDR: gridLayoutParams.distDR,
                    distThickness: gridLayoutParams.distThickness,
                    distNx: gridLayoutParams.distNx,
                    distNy: gridLayoutParams.distNy,
                    distJitter: gridLayoutParams.distJitter,
                });
                // Clear canvas particles and reseed physics particles
                if (container?.particles) {
                    container.particles.clear();
                }
                // Reset simulation state (re-initialize particles with new temperature)
                sim.reset();
                // Sync canvas with new physics particles
                const pm = sim.getParticleManager();
                pm.setCanvasSize?.(w, h);
                const particles = pm.getAllParticles();
                if (container?.particles && particles?.length) {
                    for (const p of particles) {
                        const canvasPos = pm.mapToCanvas(p.position);
                        container.particles.addParticle({ x: canvasPos.x, y: canvasPos.y }, { color: { value: "#3b82f6" } });
                    }
                    // Force one draw
                    try {
                        container.draw?.(false);
                    }
                    catch { }
                }
                // Show UI prompt briefly
                setTempNotice(`Temperature changed to ${newT.toFixed(2)} — particles reseeded`);
                const t = setTimeout(() => setTempNotice(null), 2000);
                return () => clearTimeout(t);
            }
            catch (e) {
                console.warn("Auto-reseed on temperature change failed:", e);
            }
        }
    }, [gridLayoutParams.temperature]);
    return lastTempRef;
};
