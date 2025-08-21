import type { ISourceOptions } from "@tsparticles/engine";

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
      resize: {}
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
      direction: "none",
      enable: true,
      outModes: {
        default: "bounce",
      },
      random: true,
      speed: 1,
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
    bounce: {
      horizontal: {
        value: 1,
      },
      vertical: {
        value: 1,
      },
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

export const getRandomWalkConfig = (particleCount: number = 100): ISourceOptions => {
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
