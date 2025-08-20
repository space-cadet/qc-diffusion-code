import { useRef, useCallback, useEffect } from 'react';
import { WebGLSolver } from '../webgl/webgl-solver';
import type { SimulationParams } from '../types';

export interface WebGLPlotData {
  x: number[];
  u: number[];
  w?: number[];
}

export type SimulationResult = {
  [equationType: string]: {
    x: number[];
    u: number[];
    w?: number[];
    time: number;
  };
} & { time: number };

export function useWebGLSolver() {
  const solversRef = useRef<Map<string, WebGLSolver>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const initSolver = useCallback((canvas: HTMLCanvasElement, params: SimulationParams) => {
    try {
      const selectedEquations = params.selectedEquations || ['telegraph', 'diffusion'];
      const solvers = new Map<string, WebGLSolver>();
      
      selectedEquations.forEach(equationType => {
        const solver = new WebGLSolver(canvas);
        solver.init(params.mesh_size, 1);
        
        if (equationType === 'telegraph') {
          solver.setupEquation('telegraph', { 
            a: params.collision_rate, 
            v: params.velocity
          });
        } else if (equationType === 'diffusion') {
          solver.setupEquation('diffusion', { 
            k: params.diffusivity 
          });
        }
        
        solver.setInitialConditions(params.distribution, params.x_min, params.x_max);
        solvers.set(equationType, solver);
      });
      
      solversRef.current = solvers;
      canvasRef.current = canvas;
      return true;
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      return false;
    }
  }, []);

  const step = useCallback((dt: number, params: SimulationParams) => {
    if (solversRef.current.size === 0) return null;
    
    const results: SimulationResult = {} as SimulationResult;
    const selectedEquations = params.selectedEquations || ['telegraph', 'diffusion'];
    
    selectedEquations.forEach(equationType => {
      const solver = solversRef.current.get(equationType);
      if (solver) {
        const stepParams = equationType === 'telegraph' 
          ? { a: params.collision_rate, v: params.velocity }
          : { k: params.diffusivity };
        
        solver.step(dt, stepParams);
        const data = solver.extractPlotData(params.x_min, params.x_max) as WebGLPlotData;
        results[equationType] = { x: data.x, u: data.u, w: data.w || [], time: 0 };
      }
    });
    
    return results;
  }, []);

  const runAnimation = useCallback((params: SimulationParams, onFrame: (data: SimulationResult) => void) => {
    if (solversRef.current.size === 0) return;

    let time = 0;
    const animate = () => {
      if (time < params.t_range) {
        const data = step(params.dt, params);
        if (data) {
          const frameData = { ...data, time } as SimulationResult;
          onFrame(frameData);
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
