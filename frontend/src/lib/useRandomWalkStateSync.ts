import { useEffect } from "react";
import type { RandomWalkSimulator } from "../physics/RandomWalkSimulator";
import type { SimulationState } from "../types/simulation";
import type { Particle } from "../physics/types/Particle";

interface RandomWalkStateSyncProps {
  simulatorRef: React.MutableRefObject<RandomWalkSimulator | null>;
  isRunning: boolean;
  timeRef: React.MutableRefObject<number>;
  collisionsRef: React.MutableRefObject<number>;
  randomWalkSimulationState: any;
  updateSimulationMetrics: (time: number, collisions: number, status: "Running" | "Paused" | "Stopped" | "Initialized", interparticleCollisions: number) => void;
  saveSimulationSnapshot: (particleData: any, densityHistory: any, observableData: any) => void;
}

export function useRandomWalkStateSync({
  simulatorRef,
  isRunning,
  timeRef,
  collisionsRef,
  randomWalkSimulationState,
  updateSimulationMetrics,
  saveSimulationSnapshot
}: RandomWalkStateSyncProps) {

  // Periodically save simulation state and sync metrics when running
  useEffect(() => {
    if (!isRunning) return;
    
    const saveInterval = setInterval(() => {
      if (simulatorRef.current) {
        const particles = simulatorRef.current.getParticleManager().getAllParticles();
        const particleData = particles.map((p: Particle) => ({
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
    }, 2000); // Save every 2 seconds
    
    const metricsInterval = setInterval(() => {
      // Sync metrics every 1 second
      const stats = simulatorRef.current?.getCollisionStats?.();
      const totalColl = stats?.totalCollisions ?? collisionsRef.current ?? 0;
      const interColl = stats?.totalInterparticleCollisions ?? 0;
      updateSimulationMetrics(timeRef.current, totalColl, 'Running', interColl);
    }, 1000);
    
    return () => {
      clearInterval(saveInterval);
      clearInterval(metricsInterval);
    };
  }, [isRunning, saveSimulationSnapshot, updateSimulationMetrics, simulatorRef, timeRef, collisionsRef]);

  // On pause/stop, perform a one-time metrics sync so last values are visible
  useEffect(() => {
    if (isRunning) return;
    const stats = simulatorRef.current?.getCollisionStats?.();
    const totalColl = stats?.totalCollisions ?? collisionsRef.current ?? 0;
    const interColl = stats?.totalInterparticleCollisions ?? randomWalkSimulationState.interparticleCollisions ?? 0;
    updateSimulationMetrics(timeRef.current, totalColl, randomWalkSimulationState.status, interColl);
  }, [isRunning, randomWalkSimulationState.status]);
}

export default useRandomWalkStateSync;