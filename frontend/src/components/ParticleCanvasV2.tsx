import React, { useRef, useEffect } from "react";
import { useOriginalPhysicsEngine, adaptParticles } from "../hooks/useOriginalPhysicsEngine";
import { useWebGLRenderer } from "../hooks/useWebGLRenderer";
import type { EngineParams } from "../hooks/useOriginalPhysicsEngine";
import type { Particle } from "../physics/types/Particle";
import type { StrategyEvent } from "../physics/types/PhysicsContext";

interface ParticleCanvasV2Props {
  params: EngineParams;
  isRunning: boolean;
  initializeVersion?: number;
  resetVersion?: number;
  stopAtTime?: number;
  liveParticlesRef?: React.MutableRefObject<Particle[]>;
  projectPosition?: (particle: Particle, index: number, size: { width: number; height: number }, time: number) => { x: number; y: number; color?: [number, number, number, number] };
  overlay?: React.ReactNode;
  onEngineFrame?: (particles: Particle[], stats: { time: number; collisionCount: number; interparticleCollisionCount: number; particleCount: number }) => void;
  onStrategyEvent?: (event: StrategyEvent) => void;
  onStatsUpdate?: (stats: { time: number; collisionCount: number; particleCount: number }) => void;
}

export const ParticleCanvasV2: React.FC<ParticleCanvasV2Props> = ({
  params,
  isRunning,
  initializeVersion = 0,
  resetVersion = 0,
  stopAtTime,
  liveParticlesRef,
  projectPosition,
  overlay,
  onEngineFrame,
  onStrategyEvent,
  onStatsUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { engineRef, particlesRef, step, reset, updateParams, getStats } = useOriginalPhysicsEngine({
    params,
    isRunning,
      onStrategyEvent,
  });

  const { render, resize } = useWebGLRenderer({
    canvasRef,
    maxParticles: params.particleCount,
  });

  // Handle parameter changes
  useEffect(() => {
    updateParams(params);
  }, [params, updateParams]);

  useEffect(() => {
    if (liveParticlesRef) {
      liveParticlesRef.current = particlesRef.current;
    }
  }, [liveParticlesRef, particlesRef]);

  useEffect(() => {
    if (initializeVersion > 0) {
      reset();
    }
  }, [initializeVersion, reset]);

  useEffect(() => {
    if (resetVersion > 0) {
      reset();
    }
  }, [resetVersion, reset]);

  // Animation loop - runs continuously, physics steps only when running
  useEffect(() => {
    let animFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Step physics only if running
      if (isRunning) {
        step(dt, stopAtTime);
      }

      // Always render
      const particles = particlesRef.current;
      const stats = getStats();
      if (liveParticlesRef) {
        liveParticlesRef.current = particles;
      }
      if (particles.length > 0) {
        const rect = canvasRef.current?.getBoundingClientRect();
        const size = { width: rect?.width ?? params.canvasWidth, height: rect?.height ?? params.canvasHeight };
        render(adaptParticles(particles, projectPosition
          ? (particle, index) => projectPosition(particle, index, size, stats?.time ?? 0)
          : undefined));
      }

      // Report stats
      if (stats && onStatsUpdate) {
        onStatsUpdate(stats);
      }
      if (stats && onEngineFrame) onEngineFrame(particles, stats);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [isRunning, render, step, stopAtTime, engineRef, getStats, liveParticlesRef, onEngineFrame, onStatsUpdate, params.canvasWidth, params.canvasHeight, projectPosition]);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          resize(width, height);
        }
      }
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [resize]);

  return (
    <div className="relative h-full min-h-64 w-full">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
    </div>
  );
};
