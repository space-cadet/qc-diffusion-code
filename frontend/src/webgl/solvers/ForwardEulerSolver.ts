// ForwardEulerSolver.ts - Forward Euler solver strategy

import type { SolverStrategy } from './BaseSolver';
import { RDShaderTop, RDShaderMain, RDShaderBot } from '../simulation_shaders.js';
import { auxiliary_GLSL_funs } from '../auxiliary_GLSL_funs.js';

export class ForwardEulerSolver implements SolverStrategy {
  getName(): string {
    return 'forward_euler';
  }

  getTextureCount(): number {
    return 2; // Ping-pong buffers
  }

  isStable(dt: number, dx: number, parameters: any): boolean {
    // CFL condition for explicit methods
    const maxDiffusivity = Math.max(parameters.k || 0, parameters.v * parameters.v || 0);
    return dt <= 0.5 * dx * dx / maxDiffusivity;
  }

  getShaderSource(equationType: string): string {
    let equationCode = '';
    
    if (equationType === 'telegraph') {
      equationCode = `
        float u = uvwq.r;
        float w = uvwq.g;
        float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);
        result = vec4(w, v*v*laplacian - 2.0*a*w, 0.0, 0.0);
      }`;
    } else if (equationType === 'diffusion') {
      equationCode = `
        float u = uvwq.r;
        float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);
        result = vec4(k*laplacian, 0.0, 0.0, 0.0);
      }`;
    }

    return RDShaderTop("FE")
      .replace("AUXILIARY_GLSL_FUNS", auxiliary_GLSL_funs())
      .replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)")
      + equationCode + RDShaderMain("FE").replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)") + RDShaderBot();
  }

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
  ): number {
    const readTexture = textures[currentTexture];
    const writeTexture = textures[1 - currentTexture];
    const writeFramebuffer = framebuffers[1 - currentTexture];

    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFramebuffer);
    gl.useProgram(program);
    
    // Set uniforms
    if (uniforms.dt) gl.uniform1f(uniforms.dt, dt);
    if (uniforms.dx) gl.uniform1f(uniforms.dx, dx);
    if (uniforms.dy) gl.uniform1f(uniforms.dy, dy);
    
    Object.keys(parameters).forEach(key => {
      if (uniforms[key]) gl.uniform1f(uniforms[key], parameters[key]);
    });

    // Bind input texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTexture);
    if (uniforms.textureSource) gl.uniform1i(uniforms.textureSource, 0);

    return 1 - currentTexture;
  }
}
