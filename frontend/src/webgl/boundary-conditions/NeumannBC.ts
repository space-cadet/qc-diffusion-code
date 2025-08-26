import { BaseBoundaryCondition } from './BaseBoundaryCondition';

export class NeumannBC extends BaseBoundaryCondition {
  constructor() {
    super({ type: 'neumann' });
  }

  getShaderCode(): string {
    return `
      // Neumann boundary conditions (zero gradient)
      vec2 applyBoundaryConditions(vec2 coord, vec2 texelSize) {
        vec2 clampedCoord = coord;
        
        // Clamp to edge (implements zero gradient at boundaries)
        if (coord.x < texelSize.x * 0.5) {
          clampedCoord.x = texelSize.x * 0.5;
        } else if (coord.x > 1.0 - texelSize.x * 0.5) {
          clampedCoord.x = 1.0 - texelSize.x * 0.5;
        }
        
        if (coord.y < texelSize.y * 0.5) {
          clampedCoord.y = texelSize.y * 0.5;
        } else if (coord.y > 1.0 - texelSize.y * 0.5) {
          clampedCoord.y = 1.0 - texelSize.y * 0.5;
        }
        
        return clampedCoord;
      }
    `;
  }

  applyBoundaries(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    width: number,
    height: number
  ): void {
    // Set texture wrapping to clamp to edge for Neumann BCs
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
}
