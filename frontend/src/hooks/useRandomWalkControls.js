import { useCallback } from "react";
export function useRandomWalkControls({ simulatorRef, tsParticlesContainerRef, gridLayoutParams, simulationState, setSimulationState, updateSimulationMetrics, saveSimulationSnapshot, timeRef, collisionsRef, randomWalkSimulationState, useGPU, particlesLoaded }) {
    const handleStart = useCallback(() => {
        setSimulationState((prev) => ({
            ...prev,
            isRunning: true,
            status: "Running",
        }));
        // Restart animation loop when simulation resumes
        const container = tsParticlesContainerRef.current;
        if (container && container._restartAnimation) {
            container._restartAnimation();
        }
        // Update state when starting
        const stats = simulatorRef.current?.getCollisionStats?.();
        const interColl = stats?.totalInterparticleCollisions ?? randomWalkSimulationState.interparticleCollisions ?? 0;
        updateSimulationMetrics(timeRef.current, collisionsRef.current, 'Running', interColl);
    }, [setSimulationState, tsParticlesContainerRef, simulatorRef, updateSimulationMetrics, timeRef, collisionsRef, randomWalkSimulationState]);
    const handlePause = useCallback(() => {
        // Save state when pausing
        if (simulationState.isRunning && simulatorRef.current) {
            const particles = simulatorRef.current.getParticleManager().getAllParticles();
            const particleData = particles.map((p) => ({
                id: p.id,
                position: p.position,
                velocity: { vx: p.velocity.vx, vy: p.velocity.vy },
                collisionCount: p.collisionCount || 0,
                lastCollisionTime: p.lastCollisionTime || 0,
                waitingTime: p.waitingTime || 0
            }));
            const densityHistory = simulatorRef.current.getDensityHistory();
            saveSimulationSnapshot(particleData, densityHistory, {});
        }
        const newStatus = simulationState.isRunning ? "Paused" : "Running";
        setSimulationState((prev) => ({
            ...prev,
            isRunning: !prev.isRunning,
            status: newStatus,
        }));
        // Restart animation loop if resuming
        if (!simulationState.isRunning) {
            const container = tsParticlesContainerRef.current;
            if (container && container._restartAnimation) {
                container._restartAnimation();
            }
        }
        // Update metrics when pausing/resuming
        const stats = simulatorRef.current?.getCollisionStats?.();
        const interColl = stats?.totalInterparticleCollisions ?? randomWalkSimulationState.interparticleCollisions ?? 0;
        updateSimulationMetrics(timeRef.current, collisionsRef.current, newStatus, interColl);
    }, [simulationState, simulatorRef, saveSimulationSnapshot, setSimulationState, tsParticlesContainerRef, updateSimulationMetrics, timeRef, collisionsRef, randomWalkSimulationState]);
    const handleReset = useCallback(() => {
        if (simulatorRef.current) {
            simulatorRef.current.reset();
            // Reset all registered observables
            const observableManager = simulatorRef.current.observableManager;
            if (observableManager) {
                observableManager.reset();
            }
        }
        // Reset GPU if in GPU mode
        if (useGPU && particlesLoaded.resetGPU) {
            particlesLoaded.resetGPU();
        }
        // Reset refs
        timeRef.current = 0;
        collisionsRef.current = 0;
        setSimulationState({
            isRunning: false,
            time: 0,
            collisions: 0,
            interparticleCollisions: 0,
            status: "Stopped",
            particleData: [],
            densityHistory: [],
            observableData: {}
        });
        // Update metrics when resetting
        updateSimulationMetrics(0, 0, 'Stopped', 0);
    }, [simulatorRef, useGPU, particlesLoaded, timeRef, collisionsRef, setSimulationState, updateSimulationMetrics]);
    const handleInitialize = useCallback(() => {
        console.log("handleInitialize: START");
        // Stop any running simulation
        setSimulationState((prev) => ({
            ...prev,
            isRunning: false,
            status: "Initialized",
        }));
        console.log("handleInitialize: checking refs", {
            hasSimulator: !!simulatorRef.current,
            hasContainer: !!tsParticlesContainerRef.current,
        });
        // Reinitialize the physics simulator with current parameters
        if (simulatorRef.current && tsParticlesContainerRef.current) {
            const container = tsParticlesContainerRef.current;
            const canvasWidth = container.canvas.size.width;
            const canvasHeight = container.canvas.size.height;
            console.log("handleInitialize: container info", {
                canvasWidth,
                canvasHeight,
                containerType: typeof container,
                particlesAPI: !!container.particles,
            });
            // Update physics parameters
            simulatorRef.current.updateParameters({
                collisionRate: gridLayoutParams.collisionRate,
                jumpLength: gridLayoutParams.jumpLength,
                velocity: gridLayoutParams.velocity,
                dt: gridLayoutParams.dt,
                particleCount: gridLayoutParams.particles,
                simulationType: gridLayoutParams.simulationType,
                dimension: gridLayoutParams.dimension,
                interparticleCollisions: gridLayoutParams.interparticleCollisions,
                strategies: gridLayoutParams.strategies,
                boundaryCondition: gridLayoutParams.boundaryCondition,
                graphType: gridLayoutParams.graphType,
                graphSize: gridLayoutParams.graphSize,
                canvasWidth: container.canvas.size.width,
                canvasHeight: container.canvas.size.height,
                temperature: gridLayoutParams.temperature,
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
            // Clear existing particles
            container.particles.clear();
            // Reset physics state and get fresh distribution
            simulatorRef.current.reset();
            // Re-connect particle manager and ensure canvas size
            const pm = simulatorRef.current.getParticleManager();
            pm.setCanvasSize(canvasWidth, canvasHeight);
            // Get particles from simulator's distribution
            const particles = pm.getAllParticles();
            // Add to tsParticles in canvas coordinates
            for (const p of particles) {
                const canvasPos = pm.mapToCanvas(p.position);
                container.particles.addParticle({ x: canvasPos.x, y: canvasPos.y }, { color: { value: "#3b82f6" } });
            }
            // Initialize GPU if in GPU mode
            if (useGPU && particlesLoaded.initializeGPU) {
                particlesLoaded.initializeGPU(particles);
            }
            // Save the initialized particle state
            const particleData = particles.map((p) => ({
                id: p.id,
                position: p.position,
                velocity: { vx: p.velocity.vx, vy: p.velocity.vy },
                collisionCount: p.collisionCount || 0,
                lastCollisionTime: p.lastCollisionTime || 0,
                waitingTime: p.waitingTime || 0
            }));
            saveSimulationSnapshot(particleData, [], {});
        }
        else {
            console.log("handleInitialize: FAILED - missing refs", {
                hasSimulator: !!simulatorRef.current,
                hasContainer: !!tsParticlesContainerRef.current,
            });
        }
        // Reset simulation state
        setSimulationState({
            isRunning: false,
            time: 0,
            collisions: 0,
            interparticleCollisions: 0,
            status: "Initialized",
            particleData: [],
            densityHistory: [],
            observableData: {}
        });
        console.log("Physics engine initialized with parameters:", {
            particles: gridLayoutParams.particles,
            collisionRate: gridLayoutParams.collisionRate,
            jumpLength: gridLayoutParams.jumpLength,
            velocity: gridLayoutParams.velocity,
            simulationType: gridLayoutParams.simulationType,
        });
    }, [setSimulationState, simulatorRef, tsParticlesContainerRef, gridLayoutParams, useGPU, particlesLoaded, saveSimulationSnapshot]);
    return {
        handleStart,
        handlePause,
        handleReset,
        handleInitialize
    };
}
