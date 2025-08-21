import type { ISourceOptions } from "@tsparticles/engine";
import type { ParticleManager } from "../physics/ParticleManager";

let particleManager: ParticleManager | null = null;

export const setParticleManager = (manager: ParticleManager) => {
  particleManager = manager;
};

// Custom update function called from container
export const updateParticlesWithCTRW = (container: any) => {
  if (!particleManager || !container.particles) return;

  // Check different possible particle array properties
  const particles =
    container.particles.array ||
    container.particles._array ||
    container.particles;

  if (particles && particles.forEach) {
    particles.forEach((particle: any) => {
      particleManager!.updateParticle(particle);
    });
  } else if (particles && particles.length) {
    for (let i = 0; i < particles.length; i++) {
      particleManager!.updateParticle(particles[i]);
    }
  }
};

export const randomWalkParticlesConfig: ISourceOptions = {
  background: {
    color: {
      value: "#f8f9fa",
    },
  },
  fpsLimit: 60,
  interactivity: {
    events: {
      onClick: {
        enable: false,
      },
      onHover: {
        enable: false,
      },
      resize: {},
    },
  },
  particles: {
    color: {
      value: "#3b82f6",
    },
    links: {
      enable: false,
    },
    move: {
      enable: true,
      direction: "none",
      outModes: {
        default: "bounce",
      },
      speed: 0, // Will be overridden by CTRW physics
      straight: true,
    },
    number: {
      density: {
        enable: false,
      },
      value: 100,
    },
    opacity: {
      value: 0.8,
    },
    shape: {
      type: "circle",
    },
    size: {
      value: { min: 2, max: 4 },
    },
  },
  detectRetina: true,
  motion: {
    disable: false,
    reduce: {
      factor: 4,
      value: true,
    },
  },
};

export const getRandomWalkConfig = (
  particleCount: number = 100
): ISourceOptions => {
  return {
    ...randomWalkParticlesConfig,
    particles: {
      ...randomWalkParticlesConfig.particles,
      number: {
        ...randomWalkParticlesConfig.particles?.number,
        value: particleCount,
      },
    },
  };
};
