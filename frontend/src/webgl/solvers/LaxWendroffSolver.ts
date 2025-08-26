import type { SolverStrategy } from './BaseSolver';
import { BaseBoundaryCondition } from '../boundary-conditions/BaseBoundaryCondition';

export class LaxWendroffSolver implements SolverStrategy {
  private boundaryCondition: BaseBoundaryCondition | null = null;

  setBoundaryCondition(bc: BaseBoundaryCondition): void {
    this.boundaryCondition = bc;
  }
  getName(): string {
    return 'lax_wendroff';
  }

  getTextureCount(): number {
    return 2; // Standard ping-pong textures
  }

  isStable(dt: number, dx: number, parameters: any): boolean {
    const v = parameters.v || 1.0;
    return dt <= dx / v; // CFL condition for hyperbolic
  }

  getShaderSource(equationType: string): string {
    const bcShaderCode = this.boundaryCondition?.getShaderCode() || '';
    
    if (equationType === 'telegraph') {
      return `#version 300 es
precision highp float;
in vec2 textureCoords;
uniform sampler2D textureSource;
uniform float dt;
uniform float dx;
uniform float a;
uniform float v;
out vec4 fragColor;

${bcShaderCode}

void main() {
  vec2 texel = 1.0 / vec2(textureSize(textureSource, 0));
  
  // Current values with boundary handling
  vec4 uvwq = sampleWithBC(textureSource, textureCoords);
  vec4 uvwqL = sampleWithBC(textureSource, textureCoords - vec2(texel.x, 0.0));
  vec4 uvwqR = sampleWithBC(textureSource, textureCoords + vec2(texel.x, 0.0));
  
  // Lax-Wendroff implementation
  float u = uvwq.r;
  float w = uvwq.g;
  float laplacian = (uvwqR.r + uvwqL.r - 2.0*u) / (dx*dx);
  
  // Update equations
  float u_new = u + dt * w;
  float w_new = w + dt * (v*v*laplacian - 2.0*a*w);
  
  fragColor = vec4(u_new, w_new, 0.0, 0.0);
}`;
    }
    
    // Fallback for other equations
    return `#version 300 es
precision highp float;
in vec2 textureCoords;
uniform sampler2D textureSource;
uniform float dt;
uniform float dx;
out vec4 fragColor;

${bcShaderCode}

void main() {
  fragColor = sampleWithBC(textureSource, textureCoords);
}`;
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
      if (uniforms[key] && key !== 'equationType') {
        gl.uniform1f(uniforms[key], parameters[key]);
      }
    });

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTexture);
    if (uniforms.textureSource) gl.uniform1i(uniforms.textureSource, 0);

    // Apply boundary conditions
    if (this.boundaryCondition) {
      this.boundaryCondition.applyBoundaries(gl, program, dx, dy);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return 1 - currentTexture;
  }

  cleanup(gl: WebGL2RenderingContext): void {
    // No additional cleanup needed
  }
}
