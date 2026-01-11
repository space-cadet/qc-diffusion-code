import { useRef, useEffect } from "react";
import { RandomWalkSimulator } from "../physics/RandomWalkSimulator";
import { PhysicsRandomWalk } from "../physics/PhysicsRandomWalk";
import { setParticleManager } from "../config/tsParticlesConfig";
export function useRandomWalkEngine({ gridLayoutParams, useNewEngine, useStreamingObservables, tsParticlesContainerRef, setBoundaryRect, setSimReady, useGPU }) {
    const simulatorRef = useRef(null);
    const graphPhysicsRef = useRef(null);
    // Initialize physics simulator
    useEffect(() => {
        const canvasWidth = tsParticlesContainerRef.current?.canvas?.size?.width || 800;
        const canvasHeight = tsParticlesContainerRef.current?.canvas?.size?.height || 600;
        // simulator is being (re)created
        setSimReady(false);
        simulatorRef.current = new RandomWalkSimulator({
            collisionRate: gridLayoutParams.collisionRate,
            jumpLength: gridLayoutParams.jumpLength,
            velocity: gridLayoutParams.velocity,
            dt: gridLayoutParams.dt,
            particleCount: gridLayoutParams.particles,
            dimension: gridLayoutParams.dimension,
            interparticleCollisions: gridLayoutParams.interparticleCollisions,
            strategies: gridLayoutParams.strategies,
            boundaryCondition: gridLayoutParams.boundaryCondition,
            canvasWidth,
            canvasHeight,
            temperature: gridLayoutParams.temperature,
            useNewEngine: useNewEngine,
            useStreamingObservables: useStreamingObservables,
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
        // mark simulator as ready for dependent components
        setSimReady(true);
        // Expose simulator to browser console for debugging
        window.simulator = simulatorRef.current;
        // Connect particle manager to tsParticles
        if (simulatorRef.current) {
            setParticleManager(simulatorRef.current.getParticleManager());
            // If a container already exists, propagate canvas size and update overlay rect
            if (tsParticlesContainerRef.current) {
                const container = tsParticlesContainerRef.current;
                const pm = simulatorRef.current.getParticleManager();
                const w = container.canvas.size.width;
                const h = container.canvas.size.height;
                pm.setCanvasSize?.(w, h);
                const bounds = pm.getBoundaries?.();
                if (bounds) {
                    const widthPhysics = Math.max(bounds.xMax - bounds.xMin, 1);
                    const heightPhysics = Math.max(bounds.yMax - bounds.yMin, 1);
                    const x = ((bounds.xMin - bounds.xMin) / widthPhysics) * w;
                    const y = ((bounds.yMin - bounds.yMin) / heightPhysics) * h;
                    const rectW = (widthPhysics / widthPhysics) * w;
                    const rectH = (heightPhysics / heightPhysics) * h;
                    setBoundaryRect({ x, y, w: rectW, h: rectH });
                    console.log("[RWS] simulator init", {
                        canvas: { w, h },
                        params: {
                            particles: gridLayoutParams.particles,
                            strategies: gridLayoutParams.strategies,
                            boundaryCondition: gridLayoutParams.boundaryCondition,
                        },
                        bounds,
                        overlay: { x, y, w: rectW, h: rectH },
                    });
                }
            }
        }
        // Initialize graph physics when in graph mode
        if (gridLayoutParams.simulationType === "graph") {
            graphPhysicsRef.current = new PhysicsRandomWalk({
                collisionRate: gridLayoutParams.collisionRate,
                jumpLength: gridLayoutParams.jumpLength,
                velocity: gridLayoutParams.velocity,
                simulationType: "graph",
                graphType: gridLayoutParams.graphType,
                graphSize: gridLayoutParams.graphSize,
            });
        }
    }, [
        gridLayoutParams.simulationType,
        gridLayoutParams.strategies,
        gridLayoutParams.boundaryCondition,
        gridLayoutParams.dimension,
        gridLayoutParams.graphType,
        gridLayoutParams.graphSize,
        useNewEngine,
        useStreamingObservables,
    ]);
    // Update physics parameters when store changes
    useEffect(() => {
        if (simulatorRef.current) {
            simulatorRef.current.updateParameters({
                collisionRate: gridLayoutParams.collisionRate,
                jumpLength: gridLayoutParams.jumpLength,
                velocity: gridLayoutParams.velocity,
                dt: gridLayoutParams.dt,
                simulationType: gridLayoutParams.simulationType,
                dimension: gridLayoutParams.dimension,
                interparticleCollisions: gridLayoutParams.interparticleCollisions,
                strategies: gridLayoutParams.strategies,
                boundaryCondition: gridLayoutParams.boundaryCondition,
                graphType: gridLayoutParams.graphType,
                graphSize: gridLayoutParams.graphSize,
                particleCount: gridLayoutParams.particles,
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
            // Re-connect particle manager after parameter updates
            setParticleManager(simulatorRef.current.getParticleManager());
        }
    }, [gridLayoutParams, useGPU]);
    return {
        simulatorRef,
        graphPhysicsRef
    };
}
