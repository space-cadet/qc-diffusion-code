import { PhysicsRandomWalk } from "./PhysicsRandomWalk";
import { ParticleManager } from "./ParticleManager";
import { setParticleManager } from "../config/tsParticlesConfig";

export class RandomWalkSimulator {
  private physics: PhysicsRandomWalk;
  private particleManager: ParticleManager;
  private time: number;
  private animationId: number | null;

  constructor(params: {
    collisionRate: number;
    jumpLength: number;
    velocity: number;
    particleCount: number;
  }) {
    this.physics = new PhysicsRandomWalk(params);
    this.particleManager = new ParticleManager(this.physics);
    this.time = 0;
    this.animationId = null;

    // Set particle manager for tsParticles integration
    setParticleManager(this.particleManager);
  }

  step(dt: number): void {
    this.time += dt; // Update time counter
  }

  reset(): void {
    this.pause();
    this.time = 0;
  }

  getDensityField() {
    return this.particleManager.getDensityData();
  }

  getCollisionStats() {
    return this.particleManager.getCollisionStats();
  }

  updateParameters(params: {
    collisionRate: number;
    jumpLength: number;
    velocity: number;
    particleCount: number;
    simulationType: "continuum" | "graph";
    graphType: "lattice1D" | "lattice2D" | "path" | "complete";
    graphSize: number;
  }) {
    this.physics = new PhysicsRandomWalk(params);
    this.particleManager.updatePhysicsEngine(this.physics);
    setParticleManager(this.particleManager);
  }

  private pause(): void {
    // Implementation needed if used
  }
}
