import { useRef, useCallback, useEffect } from 'react';
import { WebGLSolver } from '../webgl/webgl-solver';
import type { SimulationParams, SolutionData } from '../types';

export function useWebGLSolver() {
  const solverRef = useRef<WebGLSolver | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const initSolver = useCallback((canvas: HTMLCanvasElement, params: SimulationParams) => {
    try {
      const solver = new WebGLSolver(canvas);
      solver.init(params.mesh_size, 1);
      solver.setupEquation('telegraph', { 
        a: params.collision_rate, 
        v: params.velocity, 
        k: params.diffusivity 
      });
      solver.setInitialConditions(params.distribution, params.x_min, params.x_max);
      solverRef.current = solver;
      canvasRef.current = canvas;
      return true;
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      return false;
    }
  }, []);

  const step = useCallback((dt: number, params: SimulationParams) => {
    if (!solverRef.current) return null;
    
    solverRef.current.step(dt, {
      a: params.collision_rate,
      v: params.velocity,
      k: params.diffusivity,
      dx: (params.x_max - params.x_min) / params.mesh_size
    });
    
    return solverRef.current.extractPlotData(params.x_min, params.x_max);
  }, []);

  const runAnimation = useCallback((params: SimulationParams, onFrame: (data: SolutionData) => void) => {
    if (!solverRef.current) return;

    let time = 0;
    const animate = () => {
      if (time < params.t_range) {
        const data = step(params.dt, params);
        if (data) {
          onFrame({ ...data, time });
        }
        time += params.dt;
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animate();
  }, [step]);

  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { initSolver, step, runAnimation, stop };
}
