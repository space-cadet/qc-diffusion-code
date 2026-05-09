import React, { useRef, useEffect, useState, useCallback } from "react";
import { tsParticles } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import type { Container, Engine } from "@tsparticles/engine";
import { createWebGLOptions } from "../webgl/tsParticlesWebGLPlugin";

interface WebGLCanvasProps {
  gridLayoutParams: {
    particles: number;
    dimension: "1D" | "2D";
    showAnimation: boolean;
  };
  particlesLoaded: (container: Container) => void;
  tsParticlesContainerRef: React.MutableRefObject<Container | null>;
  renderEnabledRef: React.MutableRefObject<boolean>;
  isRunning: boolean;
  simulatorRef: React.MutableRefObject<any>;
  dimension: "1D" | "2D";
}

export const WebGLCanvas: React.FC<WebGLCanvasProps> = ({
  gridLayoutParams,
  particlesLoaded,
  tsParticlesContainerRef,
  renderEnabledRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<Container | null>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);

  // Initialize tsParticles engine
  useEffect(() => {
    let mounted = true;

    const initEngine = async () => {
      await loadSlim(tsParticles);
      if (mounted) {
        setIsEngineReady(true);
      }
    };

    initEngine();

    return () => {
      mounted = false;
    };
  }, []);

  // Create tsParticles container with WebGL options
  const setupContainer = useCallback(async () => {
    if (!canvasRef.current || !isEngineReady) return;

    // Destroy previous container if exists
    if (containerRef.current) {
      containerRef.current.destroy();
      containerRef.current = null;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Ensure canvas has actual dimensions
    if (rect.width === 0 || rect.height === 0) {
      console.warn("[WebGLCanvas] Canvas has zero size, waiting...");
      return;
    }

    // Set canvas size to match display size
    canvas.width = rect.width;
    canvas.height = rect.height;

    const options = createWebGLOptions({
      fullScreen: { enable: false, zIndex: 0 },
      detectRetina: false,
      fpsLimit: 60,
      particles: {
        number: {
          value: gridLayoutParams.particles,
        },
        color: {
          value: "#3b82f6",
        },
        shape: {
          type: "circle",
        },
        opacity: {
          value: 0.8,
        },
        size: {
          value: 3,
        },
        move: {
          enable: false, // We handle movement via physics sync
        },
        position: {
          x: Math.random() * rect.width,
          y:
            gridLayoutParams.dimension === "1D"
              ? rect.height / 2
              : Math.random() * rect.height,
        },
      },
      interactivity: {
        events: {
          onHover: { enable: false },
          onClick: { enable: false },
        },
      },
    });

    try {
      const container = await tsParticles.load({
        id: canvas,
        options,
      });

      if (container) {
        containerRef.current = container;
        tsParticlesContainerRef.current = container;

        // Call the particlesLoaded callback
        console.log("[WebGLCanvas] Calling particlesLoaded callback");
        particlesLoaded(container);

        console.log("[WebGLCanvas] Container created", {
          particles: container.particles.count,
          size: { width: rect.width, height: rect.height },
        });
      }
    } catch (e) {
      console.error("[WebGLCanvas] Failed to create container:", e);
    }
  }, [isEngineReady, gridLayoutParams.particles, gridLayoutParams.dimension, particlesLoaded, tsParticlesContainerRef]);

  // Setup container when engine is ready
  useEffect(() => {
    if (isEngineReady) {
      // Wait a frame for canvas to have size
      requestAnimationFrame(() => {
        setupContainer();
      });
    }
  }, [isEngineReady, setupContainer]);

  // Handle particle count changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const currentCount = container.particles.count;
    const targetCount = gridLayoutParams.particles;

    if (currentCount !== targetCount) {
      container.particles.clear();
      const canvasWidth = container.canvas.size.width;
      const canvasHeight = container.canvas.size.height;

      for (let i = 0; i < targetCount; i++) {
        container.particles.addParticle({
          x: Math.random() * canvasWidth,
          y:
            gridLayoutParams.dimension === "1D"
              ? canvasHeight / 2
              : Math.random() * canvasHeight,
        });
      }
      console.log(`[WebGLCanvas] Updated particle count from ${currentCount} to ${targetCount}`);
    }
  }, [gridLayoutParams.particles, gridLayoutParams.dimension]);

  // Setup ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;

          const container = containerRef.current;
          if (container) {
            container.canvas.resize();
          }

          console.log("[WebGLCanvas] Resized", { width, height });
        }
      }
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.destroy();
        containerRef.current = null;
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        backgroundColor: "#f0f0f0", // Debug: visible background
      }}
    />
  );
};
