import numpy as np
import pde

class TelegraphSolver:
    def __init__(self, grid_size=64, x_min=-5.0, x_max=5.0):
        self.grid = pde.UnitGrid([grid_size], periodic=False)
        self.grid._axes_coords = [np.linspace(x_min, x_max, grid_size)]
        
    def _get_initial_condition(self, distribution):
        if distribution == "gaussian":
            return pde.ScalarField.from_expression(self.grid, "exp(-x**2)")
        elif distribution == "step":
            return pde.ScalarField.from_expression(self.grid, "0.5 * (1 + tanh(5*x))")
        elif distribution == "delta":
            return pde.ScalarField.from_expression(self.grid, "exp(-50*x**2)")
        elif distribution == "sine":
            return pde.ScalarField.from_expression(self.grid, "sin(x)")
        else:
            return pde.ScalarField.from_expression(self.grid, "exp(-x**2)")
        
    def solve(self, collision_rate=1.0, velocity=1.0, t_range=5.0, dt=0.01, distribution="gaussian"):
        # Telegraph equation: ∂²u/∂t² + 2a∂u/∂t = v²∇²u
        # Convert to first-order system: u' = v_field, v_field' = v²∇²u - 2a*v_field
        
        # Initial condition based on distribution type
        u_init = self._get_initial_condition(distribution)
        v_init = pde.ScalarField(self.grid, data=np.zeros_like(u_init.data))
        
        # Define telegraph equation as system
        eq = pde.PDE({
            'u': 'v_field',
            'v_field': f'{velocity**2} * laplace(u) - {2*collision_rate} * v_field'
        })
        
        # Solve with time tracking
        initial_state = pde.FieldCollection([u_init, v_init], labels=['u', 'v_field'])
        
        # Store time evolution
        times = []
        solutions = []
        
        def store_solution(state, t):
            times.append(t)
            solutions.append(state['u'].data.copy())
        
        tracker = pde.trackers.CallbackTracker(store_solution, interval=dt*10)
        result = eq.solve(initial_state, t_range=t_range, dt=dt, tracker=tracker)
        
        return {
            'x': self.grid.axes_coords[0],
            'times': times,
            'solutions': solutions,
            'final_time': t_range
        }

class DiffusionSolver:
    def __init__(self, grid_size=64, x_min=-5.0, x_max=5.0):
        self.grid = pde.UnitGrid([grid_size], periodic=False)
        self.grid._axes_coords = [np.linspace(x_min, x_max, grid_size)]
        
    def _get_initial_condition(self, distribution):
        if distribution == "gaussian":
            return pde.ScalarField.from_expression(self.grid, "exp(-x**2)")
        elif distribution == "step":
            return pde.ScalarField.from_expression(self.grid, "0.5 * (1 + tanh(5*x))")
        elif distribution == "delta":
            return pde.ScalarField.from_expression(self.grid, "exp(-50*x**2)")
        elif distribution == "sine":
            return pde.ScalarField.from_expression(self.grid, "sin(x)")
        else:
            return pde.ScalarField.from_expression(self.grid, "exp(-x**2)")
        
    def solve(self, diffusivity=1.0, t_range=5.0, dt=0.01, distribution="gaussian"):
        # Standard diffusion: ∂u/∂t = k∇²u
        
        # Initial condition based on distribution type
        u_init = self._get_initial_condition(distribution)
        
        # Define diffusion equation
        eq = pde.DiffusionPDE(diffusivity=diffusivity)
        
        # Store time evolution
        times = []
        solutions = []
        
        def store_solution(state, t):
            times.append(t)
            solutions.append(state.data.copy())
        
        tracker = pde.trackers.CallbackTracker(store_solution, interval=dt*10)
        result = eq.solve(u_init, t_range=t_range, dt=dt, tracker=tracker)
        
        return {
            'x': self.grid.axes_coords[0],
            'times': times,
            'solutions': solutions,
            'final_time': t_range
        }

def compare_solutions(params):
    """Generate both telegraph and diffusion solutions for comparison"""
    telegraph = TelegraphSolver(
        grid_size=params.get('mesh_size', 64),
        x_min=params.get('x_min', -5.0),
        x_max=params.get('x_max', 5.0)
    )
    diffusion = DiffusionSolver(
        grid_size=params.get('mesh_size', 64),
        x_min=params.get('x_min', -5.0),
        x_max=params.get('x_max', 5.0)
    )
    
    telegraph_result = telegraph.solve(
        collision_rate=params.get('collision_rate', 1.0),
        velocity=params.get('velocity', 1.0),
        t_range=params.get('t_range', 5.0),
        distribution=params.get('distribution', 'gaussian')
    )
    
    diffusion_result = diffusion.solve(
        diffusivity=params.get('diffusivity', 1.0),
        t_range=params.get('t_range', 5.0),
        distribution=params.get('distribution', 'gaussian')
    )
    
    return {
        'telegraph': telegraph_result,
        'diffusion': diffusion_result
    }

def get_initial_frame(params):
    """Generate initial frame data for given distribution"""
    telegraph = TelegraphSolver(
        grid_size=params.get('mesh_size', 64),
        x_min=params.get('x_min', -5.0),
        x_max=params.get('x_max', 5.0)
    )
    diffusion = DiffusionSolver(
        grid_size=params.get('mesh_size', 64),
        x_min=params.get('x_min', -5.0),
        x_max=params.get('x_max', 5.0)
    )
    
    telegraph_init = telegraph._get_initial_condition(params.get('distribution', 'gaussian'))
    diffusion_init = diffusion._get_initial_condition(params.get('distribution', 'gaussian'))
    
    return {
        "time": 0.0,
        "telegraph": {
            "x": telegraph.grid.axes_coords[0].tolist(),
            "u": telegraph_init.data.tolist()
        },
        "diffusion": {
            "x": diffusion.grid.axes_coords[0].tolist(), 
            "u": diffusion_init.data.tolist()
        }
    }
