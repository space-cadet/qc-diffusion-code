// BaseSolver.ts - Strategy interface for numerical solvers

export interface SolverStrategy {
  getName(): string;
  getShaderSource(equationType: string): string;
  getTextureCount(): number;
  isStable(dt: number, dx: number, parameters: any): boolean;
  step(
    gl: WebGL2RenderingContext,
    textures: WebGLTexture[],
    framebuffers: WebGLFramebuffer[],
    program: WebGLProgram,
    uniforms: Record<string, WebGLUniformLocation | null>,
    dt: number,
    dx: number,
    dy: number,
    parameters: any,
    currentTexture: number
  ): number; // returns new currentTexture index
}

export type SolverType = 'forward-euler' | 'crank-nicolson' | 'rk4';

export interface SolverConfig {
  telegraph: SolverType;
  diffusion: SolverType;
  wheeler_dewitt?: SolverType;
}

export const DEFAULT_SOLVER_CONFIG: SolverConfig = {
  telegraph: 'forward-euler',
  diffusion: 'forward-euler'
};
