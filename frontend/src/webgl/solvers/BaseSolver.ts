// BaseSolver.ts - Strategy interface for numerical solvers
import type { BoundaryConditionType } from '../../types';

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

// Centralized boundary condition texture setup
export function createBoundaryTextures(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  bcType: BoundaryConditionType,
  dirichletValue: number = 0.0
): WebGLTexture[] {
  const textures: WebGLTexture[] = [];
  
  for (let i = 0; i < 2; i++) {
    const texture = gl.createTexture();
    if (!texture) throw new Error(`Failed to create texture ${i}`);
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Set texture wrapping based on boundary condition type
    if (bcType === 'neumann') {
      // Zero gradient: clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } else if (bcType === 'dirichlet') {
      // Fixed values: will handle in shader, but use CLAMP_TO_EDGE for sampling
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    // Initialize texture data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, width, height, 0, gl.RG, gl.FLOAT, null);
    
    textures.push(texture);
  }
  
  return textures;
}
