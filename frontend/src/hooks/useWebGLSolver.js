import { useRef, useCallback, useEffect } from 'react';
import { WebGLSolver } from '../webgl/webgl-solver';
import { ForwardEulerSolver } from '../webgl/solvers/ForwardEulerSolver';
import { CrankNicolsonSolver } from '../webgl/solvers/CrankNicolsonSolver';
import { LaxWendroffSolver } from '../webgl/solvers/LaxWendroffSolver';
import { generateInitialConditions } from '../utils/initialConditions';
function createSolver(solverType) {
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
    const solversRef = useRef(new Map());
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const initSolver = useCallback((canvas, params) => {
        try {
            const selectedEquations = params.selectedEquations || ['telegraph', 'diffusion'];
            const solvers = new Map();
            // precompute initial conditions in JS so WebGL uses exactly what Plot shows
            const initialFrame = generateInitialConditions(params);
            selectedEquations.forEach(equationType => {
                const solver = new WebGLSolver(canvas);
                solver.init(params.mesh_size, 1, params.boundaryCondition || 'neumann', params.dirichlet_value || 0.0);
                // Set solver strategy based on configuration
                const solverType = params.solver_config?.[equationType] || 'forward-euler';
                const solverStrategy = createSolver(solverType);
                solver.setSolver(solverStrategy);
                if (equationType === 'telegraph') {
                    const solverParams = {
                        a: params.collision_rate,
                        v: params.velocity,
                        ...params.solver_params
                    };
                    solver.setupEquation('telegraph', solverParams);
                }
                else if (equationType === 'diffusion') {
                    const solverParams = {
                        k: params.diffusivity,
                        ...params.solver_params
                    };
                    solver.setupEquation('diffusion', solverParams);
                }
                // upload precomputed u profile for this equation
                const frameData = initialFrame[equationType];
                if (frameData && frameData.u) {
                    solver.setInitialProfile(frameData.u);
                }
                else {
                    // fallback: upload zeros if not present
                    solver.setInitialProfile(new Array(params.mesh_size).fill(0));
                }
                solvers.set(equationType, solver);
            });
            solversRef.current = solvers;
            canvasRef.current = canvas;
            return true;
        }
        catch (error) {
            console.error('WebGL initialization failed:', error);
            return false;
        }
    }, []);
    const step = useCallback((dt, params) => {
        if (solversRef.current.size === 0)
            return null;
        const results = {};
        const selectedEquations = params.selectedEquations || ['telegraph', 'diffusion'];
        selectedEquations.forEach(equationType => {
            const solver = solversRef.current.get(equationType);
            if (solver) {
                const stepParams = equationType === 'telegraph'
                    ? { a: params.collision_rate, v: params.velocity }
                    : { k: params.diffusivity };
                solver.step(dt, stepParams);
                const data = solver.extractPlotData(params.x_min, params.x_max);
                results[equationType] = { x: data.x, u: data.u, w: data.w || [], time: 0 };
            }
        });
        return results;
    }, []);
    const runAnimation = useCallback((params, onFrame, startTime = 0) => {
        if (solversRef.current.size === 0)
            return;
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
                    const frameData = { ...data, time };
                    onFrame(frameData);
                }
                animationRef.current = window.setTimeout(animate, frameDelay);
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
