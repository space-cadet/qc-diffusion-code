import { useRef, useCallback, useEffect } from 'react';
import { WebGLSolver } from '../webgl/webgl-solver';
import type { SimulationParams, AnimationFrame } from '../types';
import type { SolverStrategy } from '../webgl/solvers/BaseSolver';
import { ForwardEulerSolver } from '../webgl/solvers/ForwardEulerSolver';
import { CrankNicolsonSolver } from '../webgl/solvers/CrankNicolsonSolver';
import { LaxWendroffSolver } from '../webgl/solvers/LaxWendroffSolver';
import { generateInitialConditions } from '../utils/initialConditions';

export interface WebGLPlotData {
  x: number[];
  u: number[];
  w?: number[];
}

interface SolverParameters extends Record<string, number> {}

export type SimulationResult = {
  [equationType: string]: {
    x: number[];
    u: number[];
    w?: number[];
    time: number;
  };
} & { time: number };

function createSolver(solverType: string): SolverStrategy {
  switch (solverType) {
    case 'forward-euler':
      return new ForwardEulerSolver();
    case 'crank-nicolson':
      return new CrankNicolsonSolver();
    case 'lax-wendroff':
      return new LaxWendroffSolver();
    default:
      console.warn(`Unknown solver type: ${solverType}, using forward-euler`);
      return new ForwardEulerSolver();
  }
}

export function useWebGLSolver() {
  const solversRef = useRef<Map<string, WebGLSolver>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const initSolver = useCallback((canvas: HTMLCanvasElement, params: SimulationParams) => {
    try {
      const selectedEquations = params.selectedEquations || ['telegraph', 'diffusion'];
      const solvers = new Map<string, WebGLSolver>();
      // precompute initial conditions in JS so WebGL uses exactly what Plot shows
      const initialFrame: AnimationFrame = generateInitialConditions(params);
      
      selectedEquations.forEach(equationType => {
        const solver = new WebGLSolver(canvas);
        solver.init(params.mesh_size, 1, params.boundaryCondition || 'neumann', params.dirichlet_value || 0.0);
        
        // Set solver strategy based on configuration
        const solverType = params.solver_config?.[equationType as keyof typeof params.solver_config] || 'forward-euler';
        const solverStrategy: SolverStrategy = createSolver(solverType);
        (solver as any).setSolver(solverStrategy);
        
        if (equationType === 'telegraph') {
          const solverParams: SolverParameters = { 
            a: params.collision_rate, 
            v: params.velocity,
            ...params.solver_params
          };
          solver.setupEquation('telegraph', solverParams);
        } else if (equationType === 'diffusion') {
          const solverParams: SolverParameters = { 
            k: params.diffusivity,
            ...params.solver_params
          };
          solver.setupEquation('diffusion', solverParams);
        }
        // upload precomputed u profile for this equation
        const frameData = initialFrame[equationType] as { x: number[]; u: number[] } | undefined;
        if (frameData && frameData.u) {
          solver.setInitialProfile(frameData.u);
        } else {
          // fallback: upload zeros if not present
          solver.setInitialProfile(new Array(params.mesh_size).fill(0));
        }
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

  const runAnimation = useCallback((params: SimulationParams, onFrame: (data: SimulationResult) => void, startTime: number = 0) => {
    if (solversRef.current.size === 0) return;

    let time = startTime;
    const animationSpeed = params.animationSpeed || 1.0;
    const frameDelay = animationSpeed >= 1.0 ? 16 : 16 / animationSpeed;
    const stepsPerFrame = Math.max(1, Math.floor(animationSpeed));
    
    const animate = () => {
      if (time < params.t_range) {
        let data;
        for (let i = 0; i < stepsPerFrame && time < params.t_range; i++) {
          data = step(params.dt, params);
          time += params.dt;
        }
        if (data) {
          const frameData = { ...data, time } as SimulationResult;
          onFrame(frameData);
        }
        animationRef.current = window.setTimeout(animate, frameDelay) as unknown as number;
      }
    };
    animate();
  }, [step]);

  const stop = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { initSolver, step, runAnimation, stop };
}
