import type { ISourceOptions } from "@tsparticles/engine";
import type { ParticleManager } from "../physics/ParticleManager";

let particleManager: ParticleManager | null = null;

export const setParticleManager = (manager: ParticleManager) => {
  particleManager = manager;
};

// Custom update function called from container
export const updateParticlesWithCTRW = (container: any, showAnimation: boolean = true) => {
  if (!particleManager || !container.particles) {
    console.log('updateParticlesWithCTRW: Missing particleManager or container.particles');
    return;
  }
  
  if (!showAnimation) {
    console.log('updateParticlesWithCTRW: Animation disabled, skipping updates');
    return;
  }

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
      enable: false,
      direction: "none",
      outModes: {
        default: "bounce",
      },
      speed: 0,
      straight: false,
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
  console.log('getRandomWalkConfig: Generating config for', particleCount, 'particles');
  return {
    ...randomWalkParticlesConfig,
    particles: {
      ...randomWalkParticlesConfig.particles,
      number: {
        ...randomWalkParticlesConfig.particles?.number,
        value: particleCount,
      },
      move: {
        ...randomWalkParticlesConfig.particles?.move,
        enable: false, // Disable default movement - only CTRW physics controls particles
      },
    },
  };
};
