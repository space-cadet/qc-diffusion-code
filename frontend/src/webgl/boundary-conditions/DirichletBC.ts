import { BaseBoundaryCondition } from './BaseBoundaryCondition';

export class DirichletBC extends BaseBoundaryCondition {
  constructor(value = 0.0) {
    super({ type: 'dirichlet', value });
  }

  getShaderCode(): string {
    return `
      // Dirichlet boundary conditions (fixed value)
      uniform highp float u_boundaryValue;

      highp vec2 _dirichletTexelSize() {
        ivec2 texSize = textureSize(textureSource, 0);
        return 1.0 / vec2(float(texSize.x), float(texSize.y));
      }

      bool isBoundaryPixel(highp vec2 coord) {
        highp vec2 texel = _dirichletTexelSize();
        return coord.x <= texel.x || 
               coord.x >= 1.0 - texel.x ||
               coord.y <= texel.y || 
               coord.y >= 1.0 - texel.y;
      }
      
      highp vec4 sampleWithBC(highp sampler2D tex, highp vec2 coord) {
        if (isBoundaryPixel(coord)) {
          return vec4(u_boundaryValue, 0.0, 0.0, 0.0);
        }
        return texture(tex, coord);
      }
    `;
  }

  applyBoundaries(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    width: number,
    height: number
  ): void {
    // Only set boundary value uniform - no texture wrapping
    this.setUniform(gl, program, 'u_boundaryValue', this.config.value || 0.0);
  }

  applyPostPass(
    gl: WebGLRenderingContext,
    targetFramebuffer: WebGLFramebuffer,
    width: number,
    height: number
  ): void {
    // Optional cleanup pass - kept but may be removed later
    const val = this.config.value ?? 0.0;
    gl.clearColor(val, 0.0, 0.0, 0.0);
    
    const scissorEnabled = gl.isEnabled(gl.SCISSOR_TEST);
    gl.enable(gl.SCISSOR_TEST);
    
    // Clear boundary pixels
    gl.scissor(0, 0, 1, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.scissor(width - 1, 0, 1, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.scissor(0, height - 1, width, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.scissor(0, 0, width, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    if (!scissorEnabled) gl.disable(gl.SCISSOR_TEST);
  }
}
