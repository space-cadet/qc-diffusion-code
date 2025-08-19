import numpy as np
import pde

class TelegraphSolver:
    def __init__(self, grid_size=64, domain_length=10.0):
        self.grid = pde.UnitGrid([grid_size], periodic=False)
        self.grid._axes_bounds = [(-domain_length/2, domain_length/2)]
        
    def solve(self, collision_rate=1.0, velocity=1.0, t_range=5.0, dt=0.01):
        # Telegraph equation: ∂²u/∂t² + 2a∂u/∂t = v²∇²u
        # Convert to first-order system: u' = v_field, v_field' = v²∇²u - 2a*v_field
        
        # Initial condition: Gaussian pulse
        u_init = pde.ScalarField.from_expression(
            self.grid, "exp(-x**2)"
        )
        v_init = pde.ScalarField(self.grid, data=np.zeros_like(u_init.data))
        
        # Define telegraph equation as system
        eq = pde.PDE({
            'u': 'v_field',
            'v_field': f'{velocity**2} * laplace(u) - {2*collision_rate} * v_field'
        })
        
        # Solve
        initial_state = pde.FieldCollection([u_init, v_init], labels=['u', 'v_field'])
        result = eq.solve(initial_state, t_range=t_range, dt=dt, tracker=None)
        
        return {
            'x': self.grid.axes_coords[0],
            'u': result['u'].data,
            'time': t_range
        }

class DiffusionSolver:
    def __init__(self, grid_size=64, domain_length=10.0):
        self.grid = pde.UnitGrid([grid_size], periodic=False)
        self.grid._axes_bounds = [(-domain_length/2, domain_length/2)]
        
    def solve(self, diffusivity=1.0, t_range=5.0, dt=0.01):
        # Standard diffusion: ∂u/∂t = k∇²u
        
        # Initial condition: Same Gaussian pulse as telegraph
        u_init = pde.ScalarField.from_expression(
            self.grid, "exp(-x**2)"
        )
        
        # Define diffusion equation
        eq = pde.DiffusionPDE(diffusivity=diffusivity)
        
        # Solve
        result = eq.solve(u_init, t_range=t_range, dt=dt, tracker=None)
        
        return {
            'x': self.grid.axes_coords[0],
            'u': result.data,
            'time': t_range
        }

def compare_solutions(params):
    """Generate both telegraph and diffusion solutions for comparison"""
    telegraph = TelegraphSolver()
    diffusion = DiffusionSolver()
    
    telegraph_result = telegraph.solve(
        collision_rate=params.get('collision_rate', 1.0),
        velocity=params.get('velocity', 1.0),
        t_range=params.get('t_range', 5.0)
    )
    
    diffusion_result = diffusion.solve(
        diffusivity=params.get('diffusivity', 1.0),
        t_range=params.get('t_range', 5.0)
    )
    
    return {
        'telegraph': telegraph_result,
        'diffusion': diffusion_result
    }
