import { DirichletBC } from '../boundary-conditions/DirichletBC';
import { vi } from 'vitest';

describe('Boundary Conditions', () => {
  let mockGL: WebGLRenderingContext;

  beforeAll(() => {
    mockGL = {
      getUniformLocation: vi.fn().mockReturnValue({}),
      uniform1f: vi.fn(),
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
      clearColor: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(false),
      scissor: vi.fn(),
      clear: vi.fn()
    } as unknown as WebGLRenderingContext;
  });

  it('should maintain boundary value', () => {
    const bc = new DirichletBC(1.0);
    const program = {} as WebGLProgram;
    
    bc.applyBoundaries(mockGL, program, 32, 32);
    expect(mockGL.uniform1f).toHaveBeenCalledWith({}, 1.0);
  });

  it('should handle zero boundary value', () => {
    const bc = new DirichletBC();
    const program = {} as WebGLProgram;
    
    bc.applyBoundaries(mockGL, program, 32, 32);
    expect(mockGL.uniform1f).toHaveBeenCalledWith({}, 0.0);
  });

  it('should provide correct shader sampling code', () => {
    const bc = new DirichletBC(1.0);
    const shaderCode = bc.getShaderCode();
    
    expect(shaderCode).toContain('isBoundaryPixel');
    expect(shaderCode).toContain('sampleWithBC');
    expect(shaderCode).toContain('u_boundaryValue');
  });

  it('should handle post-pass boundary enforcement', () => {
    const bc = new DirichletBC(0.5);
    const framebuffer = {} as WebGLFramebuffer;
    
    bc.applyPostPass(mockGL, framebuffer, 32, 32);
    expect(mockGL.clearColor).toHaveBeenCalledWith(0.5, 0.0, 0.0, 0.0);
  });

  // Equation behavior is verified in solverShaders.test.ts where solver-generated
  // shader sources are inspected. BoundaryConditions tests focus solely on BC API.
});
