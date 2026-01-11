export class ParticleInitializer {
    static initializeParticles(container, simulator, simulationState) {
        // Connect particle manager
        const pm = simulator.getParticleManager();
        const w = container.canvas.size.width;
        const h = container.canvas.size.height;
        pm.setCanvasSize?.(w, h);
        // Restore previous state if available
        if (simulationState.particleData && simulationState.particleData.length > 0) {
            container.particles.clear();
            pm.clearAllParticles();
            simulationState.particleData.forEach(particle => {
                const tsParticle = {
                    id: particle.id,
                    position: particle.position,
                    velocity: { x: particle.velocity.vx, y: particle.velocity.vy }
                };
                pm.initializeParticle(tsParticle);
            });
            // Restore simulation time
            simulator.time = simulationState.time;
            // Add particles to canvas
            const restoredParticles = pm.getAllParticles();
            restoredParticles.forEach(p => {
                const canvasPos = pm.mapToCanvas(p.position);
                container.particles.addParticle({ x: canvasPos.x, y: canvasPos.y }, { color: { value: "#3b82f6" } });
            });
            // Force redraw
            try {
                container.draw?.(false);
            }
            catch { }
        }
    }
}
