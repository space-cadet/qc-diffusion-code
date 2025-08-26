// ForwardEulerSolver.ts - Forward Euler solver strategy

import type { SolverStrategy } from './BaseSolver';
import { BaseBoundaryCondition } from '../boundary-conditions/BaseBoundaryCondition';
import { RDShaderTop, RDShaderMain, RDShaderBot } from '../simulation_shaders.js';
import { auxiliary_GLSL_funs } from '../auxiliary_GLSL_funs.js';

export class ForwardEulerSolver implements SolverStrategy {
  private boundaryCondition: BaseBoundaryCondition | null = null;

  setBoundaryCondition(bc: BaseBoundaryCondition): void {
    this.boundaryCondition = bc;
  }
  getName(): string {
    return 'forward_euler';
  }

  getTextureCount(): number {
    return 2; // Ping-pong buffers
  }

  isStable(dt: number, dx: number, parameters: any): boolean {
    // Combined CFL-style checks for explicit methods
    // Parabolic (diffusion): dt <= 0.5 * dx^2 / k
    // Hyperbolic (telegraph/advection-like): dt <= dx / v
    const k = parameters.k || 0;
    const v = parameters.v || 0;
    const eps = 1e-12;
    let dtMax = Number.POSITIVE_INFINITY;
    if (k > 0) dtMax = Math.min(dtMax, 0.5 * dx * dx / k);
    if (v > 0) dtMax = Math.min(dtMax, dx / Math.max(v, eps));
    if (!isFinite(dtMax)) return true; // no constraints known
    return dt <= dtMax;
  }

  getShaderSource(equationType: string): string {
    let equationCode = '';
    
    if (equationType === 'telegraph') {
      equationCode = `
        vec4 uvwq = sampleWithBC(textureSource, textureCoords);
        vec4 uvwqR = sampleWithBC(textureSource, textureCoords + vec2(texel.x, 0.0));
        vec4 uvwqL = sampleWithBC(textureSource, textureCoords - vec2(texel.x, 0.0));
        vec4 uvwqT = sampleWithBC(textureSource, textureCoords + vec2(0.0, texel.y));
        vec4 uvwqB = sampleWithBC(textureSource, textureCoords - vec2(0.0, texel.y));
        
        float u = uvwq.r;
        float w = uvwq.g;
        float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);
        result = vec4(w, v*v*laplacian - 2.0*a*w, 0.0, 0.0);
      }`;
    } else if (equationType === 'diffusion') {
      equationCode = `
        vec4 uvwq = sampleWithBC(textureSource, textureCoords);
        vec4 uvwqR = sampleWithBC(textureSource, textureCoords + vec2(texel.x, 0.0));
        vec4 uvwqL = sampleWithBC(textureSource, textureCoords - vec2(texel.x, 0.0));
        vec4 uvwqT = sampleWithBC(textureSource, textureCoords + vec2(0.0, texel.y));
        vec4 uvwqB = sampleWithBC(textureSource, textureCoords - vec2(0.0, texel.y));
        
        float u = uvwq.r;
        float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);
        result = vec4(k*laplacian, 0.0, 0.0, 0.0);
      }`;
    }

    const bcShaderCode = this.boundaryCondition?.getShaderCode() || '';
    
    let shaderSource = RDShaderTop("FE")
      .replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)");
    
    if (bcShaderCode) {
      shaderSource = shaderSource.replace("AUXILIARY_GLSL_FUNS", auxiliary_GLSL_funs() + "\n" + bcShaderCode);
    } else {
      shaderSource = shaderSource.replace("AUXILIARY_GLSL_FUNS", auxiliary_GLSL_funs());
    }
    
    return shaderSource + equationCode + RDShaderMain("FE").replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)") + RDShaderBot();
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
    
    // Auto dt guard (CFL-style)
    const k = parameters.k || 0;
    const v = parameters.v || 0;
    const safety = 0.9; // conservative factor
    let dtLocal = dt;
    if (k > 0) {
      dtLocal = Math.min(dtLocal, safety * 0.5 * dx * dx / k);
    }
    if (v > 0) {
      dtLocal = Math.min(dtLocal, safety * dx / v);
    }

    // Set uniforms
    if (uniforms.dt) gl.uniform1f(uniforms.dt, dtLocal);
    if (uniforms.dx) gl.uniform1f(uniforms.dx, dx);
    if (uniforms.dy) gl.uniform1f(uniforms.dy, dy);
    
    Object.keys(parameters).forEach(key => {
      if (uniforms[key]) gl.uniform1f(uniforms[key], parameters[key]);
    });

    // Bind input texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTexture);
    if (uniforms.textureSource) gl.uniform1i(uniforms.textureSource, 0);

    // Apply boundary conditions
    if (this.boundaryCondition) {
      this.boundaryCondition.applyBoundaries(gl, program, dx, dy);
    }
    // Execute compute pass into the write framebuffer
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    return 1 - currentTexture;
  }
}
