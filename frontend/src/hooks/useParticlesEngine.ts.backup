import { useCallback } from 'react';
import type { Container } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import { initParticlesEngine } from '@tsparticles/react';

export const useParticlesEngine = () => {
  const initializeEngine = useCallback(async () => {
    await initParticlesEngine(async (engine: any) => {
      await loadSlim(engine);
    });
  }, []);

  return {
    initializeEngine
  };
};
