import { ForwardEulerSolver } from '../solvers/ForwardEulerSolver';
import { DirichletBC } from '../boundary-conditions/DirichletBC';

describe('Solver shader generation with BCs', () => {
  it('generates diffusion shader with laplacian and BC sampler', () => {
    const solver = new ForwardEulerSolver();
    const bc = new DirichletBC(1.0);
    // @ts-ignore - internal prop via method
    solver.setBoundaryCondition(bc as any);
    const src = solver.getShaderSource('diffusion');

    expect(src).toContain('sampleWithBC');
    expect(src).toContain('k*laplacian');
    expect(src).toContain('(dx*dx)');
  });

  it('generates telegraph shader with u,w and BC sampler', () => {
    const solver = new ForwardEulerSolver();
    const bc = new DirichletBC(0.0);
    // @ts-ignore - internal prop via method
    solver.setBoundaryCondition(bc as any);
    const src = solver.getShaderSource('telegraph');

    expect(src).toContain('sampleWithBC');
    expect(src).toContain('float u =');
    expect(src).toContain('float w =');
    expect(src).toContain('v*v*laplacian');
    expect(src).toContain('2.0*a*w');
  });
});
