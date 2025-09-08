import { tsParticles } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import type { Container, Engine, Particle as TsParticle } from "@tsparticles/engine";
import type { ParticleManager } from "../physics/ParticleManager";
import type { Particle as PhysicsParticle } from "../physics/types/Particle";
import { simTime } from "../physics/core/GlobalTime";

let particleManager: ParticleManager | null = null;
let engine: Engine | null = null;
let _diagFrameCounter = 0; // throttle diagnostics

// Helper function to convert hex color to HSL
const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

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
  showAnimation: boolean = true,
  isSimulationRunning: boolean = false
): void => {
  if (!particleManager || !showAnimation) {
    return;
  }

  const physicsParticles = particleManager.getAllParticles() as PhysicsParticle[];
  const activePhysics = physicsParticles.filter(p => p?.isActive !== false);

  // Sync tsParticles with active physics particles; hide any surplus tsParticles
  const particlesContainer: any = (container.particles as any);
  const tsCount: number = Number(particlesContainer?.count ?? (particlesContainer?._array?.length ?? 0));

  if (tsCount > 0) {
    for (let i = 0; i < tsCount; i++) {
      const tsParticle = particlesContainer.get(i) as TsParticle | undefined;
      if (!tsParticle) continue;

      const physicsParticle = activePhysics[i];
      if (physicsParticle) {
        // Position sync for active particle
        const px = Number(physicsParticle?.position?.x);
        const py = Number(physicsParticle?.position?.y);
        const finitePX = Number.isFinite(px) ? px : 0;
        const finitePY = Number.isFinite(py) ? py : 0;

        const canvasPos = particleManager.mapToCanvas({ x: finitePX, y: finitePY });

        const w = container.canvas.size.width || 0;
        const h = container.canvas.size.height || 0;
        const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
        const safeX = Number.isFinite(canvasPos.x) ? clamp(canvasPos.x, 0, w) : w / 2;
        const safeY = Number.isFinite(canvasPos.y) ? clamp(canvasPos.y, 0, h) : h / 2;

        tsParticle.position.x = safeX;
        tsParticle.position.y = safeY;

        // Ensure visible opacity for active particles
        if ((tsParticle as any).opacity?.value !== undefined) {
          (tsParticle as any).opacity.value = 0.8;
        }

        // Visual collision indicator - flash red for 200ms after collision
        const currentTime = simTime();
        const timeSinceCollision = physicsParticle.lastInterparticleCollisionTime 
          ? currentTime - physicsParticle.lastInterparticleCollisionTime 
          : Infinity;
        
        // Update particle color properly for tsParticles
        if (timeSinceCollision < 0.2) { // Flash for 200ms
          if (tsParticle.color) {
            const hslColor = hexToHsl("#ff4444"); // Red flash
            tsParticle.color.h.value = hslColor.h;
            tsParticle.color.s.value = hslColor.s;
            tsParticle.color.l.value = hslColor.l;
          }
        } else {
          if (tsParticle.color) {
            const hslColor = hexToHsl("#3b82f6"); // Default blue
            tsParticle.color.h.value = hslColor.h;
            tsParticle.color.s.value = hslColor.s;
            tsParticle.color.l.value = hslColor.l;
          }
        }
      } else {
        // No corresponding active particle: hide this visual particle
        tsParticle.position.x = -10000;
        tsParticle.position.y = -10000;
        if ((tsParticle as any).opacity?.value !== undefined) {
          (tsParticle as any).opacity.value = 0.0;
        }
      }
    }
  }

  // Only log diagnostics when simulation is actually running
  if (_diagFrameCounter % 60 === 0 && isSimulationRunning) {
    // Diagnostic logging
    const firstPhysicsParticle = activePhysics[0];
    const firstTsParticle = (container.particles as any).get(0) as TsParticle | undefined;
    if (firstPhysicsParticle && firstTsParticle) {
      const canvasPos = particleManager.mapToCanvas(firstPhysicsParticle?.position || { x: 0, y: 0 });
      console.log("[tsParticles] Position sync", {
        physicsPos: { x: firstPhysicsParticle?.position?.x ?? 0, y: firstPhysicsParticle?.position?.y ?? 0 },
        canvasPos: { x: canvasPos.x, y: canvasPos.y },
        tsParticlePos: { x: firstTsParticle?.position?.x ?? 0, y: firstTsParticle?.position?.y ?? 0 },
        activeCount: activePhysics.length,
        tsCount
      });
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
