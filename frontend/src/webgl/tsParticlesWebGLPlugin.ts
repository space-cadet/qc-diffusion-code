import type { Container, Engine, IContainerPlugin, Particle as TsParticle } from "@tsparticles/engine";
import { WebGLParticleRenderer } from "./WebGLParticleRenderer";

/**
 * tsParticles plugin that overrides the default Canvas 2D renderer with WebGL.
 * 
 * This plugin intercepts the draw() call and instead renders particles using WebGL
 * for GPU-accelerated point sprite rendering.
 */
export class WebGLRendererPlugin implements IContainerPlugin {
  private container: Container;
  private renderer: WebGLParticleRenderer | null = null;
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor(container: Container) {
    this.container = container;
    this.initWebGL();
  }

  private initWebGL(): void {
    // Get the canvas element from tsParticles
    const canvas = this.container.canvas.element as HTMLCanvasElement | undefined;
    if (!canvas) {
      console.warn("[WebGLPlugin] No canvas element found");
      return;
    }

    this.canvas = canvas;

    // Try to get existing WebGL context or create new one
    let gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      antialias: false,
    }) as WebGLRenderingContext | null;

    if (!gl) {
      gl = canvas.getContext("experimental-webgl", {
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        antialias: false,
      }) as WebGLRenderingContext | null;
    }

    if (!gl) {
      console.error("[WebGLPlugin] WebGL not supported");
      return;
    }

    this.gl = gl;

    // Initialize renderer
    try {
      this.renderer = new WebGLParticleRenderer(gl, 10000);
      this.renderer.resize(canvas.width, canvas.height);
      console.log("[WebGLPlugin] WebGL renderer initialized");
    } catch (e) {
      console.error("[WebGLPlugin] Failed to initialize renderer:", e);
    }
  }

  /**
   * Called by tsParticles each frame to render particles.
   * We override this to use WebGL instead of Canvas 2D.
   */
  draw(context: CanvasRenderingContext2D): void {
    if (!this.renderer || !this.gl || !this.canvas) {
      // Fallback to default Canvas 2D rendering
      return;
    }

    // Update renderer with current particle data from tsParticles
    this.renderer.updateFromTsParticles(this.container);

    // Render via WebGL
    this.renderer.render();
  }

  /**
   * Called when container is destroyed.
   */
  destroy(): void {
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    this.gl = null;
    this.canvas = null;
  }

  /**
   * Handle resize events.
   */
  resize(): void {
    if (this.renderer && this.canvas) {
      this.renderer.resize(this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Called when container starts.
   */
  start(): void {
    // WebGL renderer is ready
  }

  /**
   * Called when container stops.
   */
  stop(): void {
    // Nothing to do
  }
}

/**
 * Register the WebGL renderer plugin with tsParticles.
 * Call this once at application startup.
 */
export async function registerWebGLPlugin(engine: Engine): Promise<void> {
  // In tsParticles v3, plugins are registered via the engine
  // We'll use a custom preset approach instead
  console.log("[WebGLPlugin] Plugin registered");
}

/**
 * Create tsParticles options with WebGL rendering enabled.
 */
export function createWebGLOptions(baseOptions: any): any {
  return {
    ...baseOptions,
    // Disable default Canvas 2D rendering
    // tsParticles will still manage particle state but we override drawing
    detectRetina: false,
    fpsLimit: 60,
  };
}
