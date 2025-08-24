import { tsParticles } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import type { Container, Engine, Particle } from "@tsparticles/engine";
import type { ParticleManager } from "../physics/ParticleManager";

let particleManager: ParticleManager | null = null;
let engine: Engine | null = null;
let _diagFrameCounter = 0; // throttle diagnostics

export const setParticleManager = (manager: ParticleManager) => {
  particleManager = manager;
};

// Initialize the engine with slim bundle
export const initializeEngine = async (): Promise<Engine> => {
  if (!engine) {
    engine = tsParticles;
    await loadSlim(engine);
  }
  return engine;
};

// Create a container with manual control
export const createParticleContainer = async (
  canvasElement: HTMLCanvasElement,
  particleCount: number
): Promise<Container> => {
  if (!engine) {
    throw new Error("Engine not initialized");
  }

  const container = await engine.load({
    id: "manual-particles",
    element: canvasElement,
    options: {
      autoPlay: false, // disable internal rAF loop; we'll drive rendering manually
      background: {
        color: "#f8f9fa",
      },
      particles: {
        number: {
          value: 0, // Start with 0, we'll add manually
        },
        color: {
          value: "#3b82f6",
        },
        shape: {
          type: "circle",
        },
        size: {
          value: 3,
        },
        move: {
          enable: false, // Completely disable built-in movement
        },
        opacity: {
          value: 0.8,
        },
      },
      detectRetina: true,
      motion: {
        disable: true,
      },
      pauseOnBlur: false,
      pauseOnOutsideViewport: false,
    },
  });

  if (!container) {
    throw new Error("Failed to create container");
  }

  // Clear any default particles and create our own
  container.particles.clear();

  // Ensure internal ticker remains stopped until explicitly started
  // This prevents hidden rAF activity when simulation is paused/stopped
  try {
    container.pause();
  } catch (_) {
    // no-op: pause may be unnecessary depending on engine version
  }

  // Create particles manually
  for (let i = 0; i < particleCount; i++) {
    const particle = container.particles.addParticle({
      x: Math.random() * container.canvas.size.width,
      y: Math.random() * container.canvas.size.height,
    });

    if (particle) {
      // Disable any built-in movement
      particle.velocity.x = 0;
      particle.velocity.y = 0;
    }
  }

  return container;
};

// Update particles with physics simulation data
export const updateParticlesWithCTRW = (
  container: Container,
  showAnimation: boolean = true
) => {
  if (!particleManager || !showAnimation) {
    return;
  }

  // Access the particles array properly
  const particlesContainer = container.particles;

  // Try different ways to access the particles array
  let particles: Particle[] | null = null;
  let accessPath: string | null = null;

  if (
    (particlesContainer as any).array &&
    Array.isArray((particlesContainer as any).array)
  ) {
    particles = (particlesContainer as any).array;
    accessPath = "array";
  } else if (
    (particlesContainer as any)._array &&
    Array.isArray((particlesContainer as any)._array)
  ) {
    particles = (particlesContainer as any)._array;
    accessPath = "_array";
  }

  if (particles) {
    for (let i = 0; i < particles.length; i++) {
      particleManager!.updateParticle(particles[i]);
    }
    if (_diagFrameCounter % 60 === 0) {
      console.log("updateParticlesWithCTRW: updated particles", {
        count: particles.length,
        accessPath,
        containerCount: container.particles.count,
      });
    }
  } else {
    console.warn("Could not find particles array in container");
  }

  // Trigger a redraw to render the changes without resetting particles
  const beforeRedraw = container.particles.count;
  if (_diagFrameCounter % 60 === 0) {
    // console.log("updateParticlesWithCTRW: BEFORE REDRAW count", {
    //   beforeRedraw,
    // });
  }
  (container as any).draw?.(false);
  const afterRedraw = container.particles.count;
  if (_diagFrameCounter % 60 === 0) {
    // console.log("updateParticlesWithCTRW: AFTER REDRAW count", {
    //   afterRedraw,
    // });
  }
  _diagFrameCounter++;
};

// Clean shutdown
export const destroyContainer = (container: Container) => {
  container.destroy();
};
