import { tsParticles } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import type { Container, Engine, Particle as TsParticle } from "@tsparticles/engine";
import type { ParticleManager } from "../physics/ParticleManager";
import type { Particle as PhysicsParticle } from "../physics/types/Particle";

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
export const updateParticlesFromStrategies = (
  container: Container,
  showAnimation: boolean = true
): void => {
  if (!particleManager || !showAnimation) {
    return;
  }

  const physicsParticles = particleManager.getAllParticles() as PhysicsParticle[];

  // Sync up to the min count between physics and tsParticles (queried via get(i))
  if (physicsParticles.length > 0) {
    let i = 0;
    // we'll iterate until either physics ends or tsParticles.get(i) returns undefined
    for (; i < physicsParticles.length; i++) {
      const physicsParticle = physicsParticles[i];
      const tsParticle = (container.particles as any).get(i) as TsParticle | undefined;
      if (!tsParticle) break;

      if (physicsParticle && tsParticle) {
        const px = Number(physicsParticle?.position?.x);
        const py = Number(physicsParticle?.position?.y);
        const finitePX = Number.isFinite(px) ? px : 0;
        const finitePY = Number.isFinite(py) ? py : 0;

        let canvasPos = particleManager.mapToCanvas({ x: finitePX, y: finitePY });

        const w = container.canvas.size.width || 0;
        const h = container.canvas.size.height || 0;
        const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
        const safeX = Number.isFinite(canvasPos.x) ? clamp(canvasPos.x, 0, w) : w / 2;
        const safeY = Number.isFinite(canvasPos.y) ? clamp(canvasPos.y, 0, h) : h / 2;

        tsParticle.position.x = safeX;
        tsParticle.position.y = safeY;
      }
    }

    if (_diagFrameCounter % 60 === 0) {
      // Diagnostic logging
      const firstPhysicsParticle = physicsParticles[0];
      const firstTsParticle = (container.particles as any).get(0) as TsParticle | undefined;
      if (firstPhysicsParticle && firstTsParticle) {
        const canvasPos = particleManager.mapToCanvas(firstPhysicsParticle?.position || { x: 0, y: 0 });
        console.log("[tsParticles] Position sync", {
          physicsPos: { x: firstPhysicsParticle?.position?.x ?? 0, y: firstPhysicsParticle?.position?.y ?? 0 },
          canvasPos: { x: canvasPos.x, y: canvasPos.y },
          tsParticlePos: { x: firstTsParticle?.position?.x ?? 0, y: firstTsParticle?.position?.y ?? 0 },
          particleCount: i
        });
      }
    }
  } else {
    // This case is normal during initialization, so we don't need to warn.
  }

  // Trigger a redraw to render the changes without resetting particles
  (container as any).draw?.(false);
  _diagFrameCounter++;
};


// Clean shutdown
export const destroyContainer = (container: Container) => {
  container.destroy();
};
