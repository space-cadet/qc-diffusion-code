import type { AnimationFrame, SimulationParams } from '../types';

export interface ConservationQuantities {
  time: number;
  mass_telegraph: number;
  mass_diffusion: number;
  energy_telegraph: number;
  momentum_telegraph: number;
}

export class ConservationMonitor {
  private history: ConservationQuantities[] = [];
  private initialQuantities: ConservationQuantities | null = null;

  computeQuantities(frame: AnimationFrame, params: SimulationParams): ConservationQuantities {
    const quantities: ConservationQuantities = {
      time: frame.time as number,
      mass_telegraph: 0,
      mass_diffusion: 0,
      energy_telegraph: 0,
      momentum_telegraph: 0
    };

    const dx = (params.x_max - params.x_min) / params.mesh_size;

    // Compute quantities for each equation type
    const selectedEquations = params.selectedEquations || ['telegraph', 'diffusion'];

    selectedEquations.forEach(equationType => {
      const data = frame[equationType] as { x: number[], u: number[], w?: number[] };
      if (!data || !data.x || !data.u) return;

      if (equationType === 'telegraph') {
        // Mass conservation: ∫ u dx
        quantities.mass_telegraph = this.trapezoidalIntegration(data.u, dx);

        // Energy conservation for telegraph equation: E = ∫ [½w² + ½v²(∂u/∂x)²] dx
        // where w = ∂u/∂t and v is the velocity parameter
        const kineticEnergy = data.w ? this.trapezoidalIntegration(data.w.map(w => 0.5 * w * w), dx) : 0;
        const potentialEnergy = this.computePotentialEnergy(data.u, dx, params.velocity);
        quantities.energy_telegraph = kineticEnergy + potentialEnergy;

        // Momentum: ∫ w dx (integral of velocity field)
        quantities.momentum_telegraph = data.w ? this.trapezoidalIntegration(data.w, dx) : 0;
      }

      if (equationType === 'diffusion') {
        // Mass conservation: ∫ u dx  
        quantities.mass_diffusion = this.trapezoidalIntegration(data.u, dx);
      }
    });

    return quantities;
  }

  addFrame(frame: AnimationFrame, params: SimulationParams): void {
    const quantities = this.computeQuantities(frame, params);
    
    if (this.initialQuantities === null) {
      this.initialQuantities = { ...quantities };
    }
    
    this.history.push(quantities);
  }

  getConservationErrors(): {
    mass_telegraph_error: number;
    mass_diffusion_error: number;
    energy_telegraph_error: number;
  } {
    if (!this.initialQuantities || this.history.length === 0) {
      return {
        mass_telegraph_error: 0,
        mass_diffusion_error: 0,
        energy_telegraph_error: 0
      };
    }

    const current = this.history[this.history.length - 1];
    
    return {
      mass_telegraph_error: Math.abs(current.mass_telegraph - this.initialQuantities.mass_telegraph) / 
                           Math.abs(this.initialQuantities.mass_telegraph || 1),
      mass_diffusion_error: Math.abs(current.mass_diffusion - this.initialQuantities.mass_diffusion) / 
                           Math.abs(this.initialQuantities.mass_diffusion || 1),
      energy_telegraph_error: Math.abs(current.energy_telegraph - this.initialQuantities.energy_telegraph) / 
                             Math.abs(this.initialQuantities.energy_telegraph || 1)
    };
  }

  getHistory(): ConservationQuantities[] {
    return [...this.history];
  }

  reset(): void {
    this.history = [];
    this.initialQuantities = null;
  }

  private trapezoidalIntegration(values: number[], dx: number): number {
    if (values.length < 2) return 0;
    
    let integral = 0;
    for (let i = 0; i < values.length - 1; i++) {
      integral += (values[i] + values[i + 1]) * dx / 2;
    }
    return integral;
  }

  private computePotentialEnergy(values: number[], dx: number, velocity: number): number {
    if (values.length < 2) return 0;
    
    let energy = 0;
    for (let i = 1; i < values.length - 1; i++) {
      const gradient = (values[i + 1] - values[i - 1]) / (2 * dx);
      energy += 0.5 * velocity * velocity * gradient * gradient * dx;
    }
    return energy;
  }

  private computeGradientEnergy(values: number[], dx: number): number {
    // Legacy method - kept for compatibility but not used for telegraph energy
    return this.computePotentialEnergy(values, dx, 1.0);
  }

  // Check if simulation is stable based on conservation errors
  isStable(tolerance: number = 0.1): boolean {
    const errors = this.getConservationErrors();
    return (
      errors.mass_telegraph_error < tolerance &&
      errors.mass_diffusion_error < tolerance &&
      errors.energy_telegraph_error < tolerance
    );
  }

  getCurrentQuantities(): ConservationQuantities | null {
    if (this.history.length === 0) return null;
    return this.history[this.history.length - 1];
  }
}
