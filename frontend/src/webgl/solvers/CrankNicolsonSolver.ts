// CrankNicolsonSolver.ts - Crank-Nicolson implicit solver strategy

import type { SolverStrategy } from './BaseSolver';
import { BaseBoundaryCondition } from '../boundary-conditions/BaseBoundaryCondition';
import { RDShaderTop, RDShaderMain, RDShaderBot } from '../simulation_shaders.js';
import { auxiliary_GLSL_funs } from '../auxiliary_GLSL_funs.js';

export class CrankNicolsonSolver implements SolverStrategy {
  private iterativeTextures: WebGLTexture[] = [];
  private iterativeFramebuffers: WebGLFramebuffer[] = [];
  private iterativeProgram: WebGLProgram | null = null;
  private initialized = false;
  private boundaryCondition: BaseBoundaryCondition | null = null;

  setBoundaryCondition(bc: BaseBoundaryCondition): void {
    this.boundaryCondition = bc;
  }

  getName(): string {
    return 'crank_nicolson';
  }

  getTextureCount(): number {
    return 4; // u^n, u^{n+1}, temp, residual for iterative solving
  }

  isStable(dt: number, dx: number, parameters: any): boolean {
    // Crank-Nicolson is unconditionally stable
    return true;
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

  private initializeIterativeSolver(
    gl: WebGL2RenderingContext,
    width: number,
    height: number
  ): void {
    if (this.initialized) return;

    // Create additional textures for iterative solving
    for (let i = 0; i < 2; i++) {
      const texture = gl.createTexture();
      if (!texture) throw new Error('Failed to create iterative texture');
      
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      this.iterativeTextures.push(texture);

      const framebuffer = gl.createFramebuffer();
      if (!framebuffer) throw new Error('Failed to create iterative framebuffer');
      
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      
      this.iterativeFramebuffers.push(framebuffer);
    }

    this.initialized = true;
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
    const canvas = gl.canvas as HTMLCanvasElement;
    const width = canvas.width;
    const height = canvas.height;
    this.initializeIterativeSolver(gl, width, height);

    const readTexture = textures[currentTexture];
    const writeTexture = textures[1 - currentTexture];
    const writeFramebuffer = framebuffers[1 - currentTexture];

    // For diffusion equation (presence of k), perform iterative solve
    if (parameters.k !== undefined) {
      const maxIterations = parameters.max_iter || 100;
      const tolerance = parameters.tolerance || 1e-6;
      const theta = parameters.theta || 0.5; // retained but not used in dt

      // Perform Jacobi iterations
      let currentIterTexture = 0;
      for (let iter = 0; iter < maxIterations; iter++) {
        const readIterTexture = (iter === 0)
          ? readTexture // first iterate uses u^n as initial guess
          : this.iterativeTextures[currentIterTexture];
        const writeIterTexture = this.iterativeTextures[1 - currentIterTexture];
        const isLast = (iter === maxIterations - 1);
        const writeIterFramebuffer = isLast ? writeFramebuffer : this.iterativeFramebuffers[1 - currentIterTexture];

        gl.bindFramebuffer(gl.FRAMEBUFFER, writeIterFramebuffer);
        gl.useProgram(program);

        // Set uniforms
        if (uniforms.dt) gl.uniform1f(uniforms.dt, dt);
        if (uniforms.dx) gl.uniform1f(uniforms.dx, dx);
        if (uniforms.dy) gl.uniform1f(uniforms.dy, dy);
        
        Object.keys(parameters).forEach(key => {
          if (uniforms[key] && key !== 'equationType') {
            gl.uniform1f(uniforms[key], parameters[key]);
          }
        });

        // Bind textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readTexture);
        if (uniforms.textureSource) gl.uniform1i(uniforms.textureSource, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, readIterTexture);
        if (uniforms.textureSource1) gl.uniform1i(uniforms.textureSource1, 1);

        // Apply boundary conditions (setup uniforms/wrap based on pixel dims)
        if (this.boundaryCondition) {
          // Note: pass framebuffer pixel dimensions, not physical dx, dy
          this.boundaryCondition.applyBoundaries(gl, program, width, height);
        }

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        // Post-pass to enforce BCs on the written target
        if (this.boundaryCondition) {
          this.boundaryCondition.applyPostPass(
            gl as unknown as WebGLRenderingContext,
            writeIterFramebuffer as unknown as WebGLFramebuffer,
            width,
            height
          );
        }
        
        if (!isLast) currentIterTexture = 1 - currentIterTexture;
      }

      // Final result already rendered to writeFramebuffer in last iteration

    } else {
      // For non-diffusion equations, fall back to explicit method
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFramebuffer);
      gl.useProgram(program);
      
      // Set uniforms
      if (uniforms.dt) gl.uniform1f(uniforms.dt, dt);
      if (uniforms.dx) gl.uniform1f(uniforms.dx, dx);
      if (uniforms.dy) gl.uniform1f(uniforms.dy, dy);
      
      Object.keys(parameters).forEach(key => {
        if (uniforms[key] && key !== 'equationType') {
          gl.uniform1f(uniforms[key], parameters[key]);
        }
      });

      // Bind input texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readTexture);
      if (uniforms.textureSource) gl.uniform1i(uniforms.textureSource, 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Post-pass to enforce BCs for explicit fallback path
      if (this.boundaryCondition) {
        this.boundaryCondition.applyPostPass(
          gl as unknown as WebGLRenderingContext,
          writeFramebuffer as unknown as WebGLFramebuffer,
          width,
          height
        );
      }
    }

    return 1 - currentTexture;
  }

  cleanup(gl: WebGL2RenderingContext): void {
    this.iterativeTextures.forEach(texture => gl.deleteTexture(texture));
    this.iterativeFramebuffers.forEach(fb => gl.deleteFramebuffer(fb));
    if (this.iterativeProgram) gl.deleteProgram(this.iterativeProgram);
    
    this.iterativeTextures = [];
    this.iterativeFramebuffers = [];
    this.iterativeProgram = null;
    this.initialized = false;
  }
}
