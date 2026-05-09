import { useRef, useCallback, useEffect } from "react";
import { WebGLRendererV2 } from "../webgl/WebGLRendererV2";
import type { ParticleV2 } from "../physics/PhysicsEngineV2";

interface UseWebGLRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  maxParticles?: number;
}

interface UseWebGLRendererReturn {
  rendererRef: React.MutableRefObject<WebGLRendererV2 | null>;
  render: (particles: ParticleV2[]) => void;
  resize: (width: number, height: number) => void;
}

export function useWebGLRenderer({
  canvasRef,
  maxParticles = 10000,
}: UseWebGLRendererProps): UseWebGLRendererReturn {
  const rendererRef = useRef<WebGLRendererV2 | null>(null);

  // Initialize renderer when canvas is available
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      antialias: false,
    });

    if (!gl) {
      console.error("[useWebGLRenderer] WebGL not supported");
      return;
    }

    try {
      rendererRef.current = new WebGLRendererV2(gl, maxParticles);
      const rect = canvas.getBoundingClientRect();
      rendererRef.current.resize(rect.width, rect.height);
      console.log("[useWebGLRenderer] Renderer initialized", { width: rect.width, height: rect.height });
    } catch (e) {
      console.error("[useWebGLRenderer] Failed to initialize renderer:", e);
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, [canvasRef, maxParticles]);

  const render = useCallback((particles: ParticleV2[]) => {
    if (rendererRef.current) {
      rendererRef.current.updateParticles(particles);
      rendererRef.current.render();
    }
  }, []);

  const resize = useCallback((width: number, height: number) => {
    if (rendererRef.current) {
      rendererRef.current.resize(width, height);
    }
  }, []);

  return {
    rendererRef,
    render,
    resize,
  };
}
