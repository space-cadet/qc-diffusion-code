import React, { useRef, useEffect } from "react";
import { useOriginalPhysicsEngine, adaptParticles } from "../hooks/useOriginalPhysicsEngine";
import { useWebGLRenderer } from "../hooks/useWebGLRenderer";
import type { EngineParams } from "../hooks/useOriginalPhysicsEngine";
import type { Particle } from "../physics/types/Particle";

interface ParticleCanvasV2Props {
  params: EngineParams;
  isRunning: boolean;
  initializeVersion?: number;
  resetVersion?: number;
  liveParticlesRef?: React.MutableRefObject<Particle[]>;
  onStatsUpdate?: (stats: { time: number; collisionCount: number; particleCount: number }) => void;
}

export const ParticleCanvasV2: React.FC<ParticleCanvasV2Props> = ({
  params,
  isRunning,
  initializeVersion = 0,
  resetVersion = 0,
  liveParticlesRef,
  onStatsUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { engineRef, particlesRef, step, reset, updateParams, getStats } = useOriginalPhysicsEngine({
    params,
    isRunning,
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
        step(dt);
      }

      // Always render
      const particles = particlesRef.current;
      if (liveParticlesRef) {
        liveParticlesRef.current = particles;
      }
      if (particles.length > 0) {
        render(adaptParticles(particles));
      }

      // Report stats
      const stats = getStats();
      if (stats && onStatsUpdate) {
        onStatsUpdate(stats);
      }
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [isRunning, render, step, engineRef, getStats, liveParticlesRef, onStatsUpdate]);

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
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
};
