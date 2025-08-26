import { BaseBoundaryCondition } from './BaseBoundaryCondition';

export class DirichletBC extends BaseBoundaryCondition {
  constructor(value = 0.0) {
    super({ type: 'dirichlet', value });
  }

  getShaderCode(): string {
    return `
      // Dirichlet boundary conditions (fixed value)
      uniform highp float u_boundaryValue;
      uniform highp vec2 u_texelSize;
      
      bool isBoundaryPixel(highp vec2 coord) {
        return coord.x < u_texelSize.x * 1.5 || 
               coord.x > 1.0 - u_texelSize.x * 1.5 ||
               coord.y < u_texelSize.y * 1.5 || 
               coord.y > 1.0 - u_texelSize.y * 1.5;
      }
      
      highp vec4 applyDirichletBC(highp vec4 computedResult, highp vec2 coord) {
        if (isBoundaryPixel(coord)) {
          return vec4(u_boundaryValue, 0.0, 0.0, 0.0);
        }
        return computedResult;
      }
    `;
  }

  applyBoundaries(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    width: number,
    height: number
  ): void {
    // Set texture wrapping to clamp to edge (sampling)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Pass texel size and boundary value
    this.setUniform(gl, program, 'u_texelSize', [1.0 / width, 1.0 / height]);
    this.setUniform(gl, program, 'u_boundaryValue', this.config.value || 0.0);
  }

  // Post-processing pass to enforce fixed boundary values by directly writing
  // the outermost texel rows/columns. Assumes target framebuffer is RGBA float
  // and already contains the newly computed interior.
  applyPostPass(
    gl: WebGLRenderingContext,
    targetFramebuffer: WebGLFramebuffer,
    width: number,
    height: number
  ): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);

    // Save state we modify
    const scissorEnabled = gl.isEnabled(gl.SCISSOR_TEST);
    const clearColor = (gl as any)._dirichlet_prevClearColor as
      [number, number, number, number] | undefined;

    // Set clear color to boundary value in R, zeros elsewhere
    const val = this.config.value ?? 0.0;
    gl.clearColor(val, 0.0, 0.0, 0.0);
    gl.enable(gl.SCISSOR_TEST);

    // Left column (x = 0)
    gl.scissor(0, 0, 1, height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Right column (x = width-1)
    gl.scissor(width - 1, 0, 1, height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Top row (y = height-1)
    gl.scissor(0, height - 1, width, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Bottom row (y = 0)
    gl.scissor(0, 0, width, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Restore scissor state
    if (!scissorEnabled) gl.disable(gl.SCISSOR_TEST);

    // We do not attempt to restore previous clear color portably; it's not
    // tracked by WebGL. If needed later, we can push/pop a small state.
  }
}
