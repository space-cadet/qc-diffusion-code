import React, { useRef, useEffect, useCallback } from "react";
import { usePhysicsEngine } from "../hooks/usePhysicsEngine";
import { useWebGLRenderer } from "../hooks/useWebGLRenderer";
import type { EngineParamsV2 } from "../physics/PhysicsEngineV2";

interface ParticleCanvasV2Props {
  params: EngineParamsV2;
  isRunning: boolean;
  onStatsUpdate?: (stats: { time: number; collisionCount: number; particleCount: number }) => void;
}

export const ParticleCanvasV2: React.FC<ParticleCanvasV2Props> = ({
  params,
  isRunning,
  onStatsUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  const { engineRef, step, reset, updateParams, getStats } = usePhysicsEngine({
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

  // Animation loop - runs continuously, physics steps only when running
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Step physics only if running
      if (isRunning && engineRef.current) {
        engineRef.current.step(dt);
      }

      // Always render
      if (engineRef.current) {
        render(engineRef.current.particles);
      }

      // Report stats
      const stats = getStats();
      if (stats && onStatsUpdate) {
        onStatsUpdate(stats);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isRunning, render, engineRef, getStats, onStatsUpdate]);

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
