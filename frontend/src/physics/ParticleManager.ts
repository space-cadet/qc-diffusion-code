import type { Particle, TrajectoryPoint } from "./types/Particle";
import type { RandomWalkStrategy } from "./interfaces/RandomWalkStrategy";
import { CircularBuffer } from "./utils/CircularBuffer";

export class ParticleManager {
  private strategy: RandomWalkStrategy;
  private dimension: '1D' | '2D';
  private particles: Map<string, Particle> = new Map();
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private diagCounter: number = 0;

  constructor(strategy: RandomWalkStrategy, dimension: '1D' | '2D') {
    this.strategy = strategy;
    this.dimension = dimension;
  }

  // Update the canvas size so we can convert physics coordinates -> canvas pixels
  setCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    try {
      const b = this.strategy.getBoundaries();
      console.log("[PM] setCanvasSize", { width, height, bounds: b });
    } catch (_) {
      console.log("[PM] setCanvasSize", { width, height });
    }
  }

  // Map physics coordinates (defined by strategy boundaries) to canvas pixel coordinates
  public mapToCanvas(pos: { x: number; y: number }): { x: number; y: number } {
    const bounds = this.strategy.getBoundaries();
    const widthPhysics = bounds.xMax - bounds.xMin || 1;

    const x = ((pos.x - bounds.xMin) / widthPhysics) * this.canvasWidth;
    const y = this.dimension === '1D' ? this.canvasHeight / 2 : ((pos.y - bounds.yMin) / (bounds.yMax - bounds.yMin || 1)) * this.canvasHeight;
    return { x, y };
  }

  // Inverse: map canvas pixel coordinates to physics coordinates within boundaries
  private mapToPhysics(pos: { x: number; y: number }) {
    const bounds = this.strategy.getBoundaries();
    const widthPhysics = bounds.xMax - bounds.xMin || 1;

    const x =
      bounds.xMin + (pos.x / Math.max(this.canvasWidth, 1)) * widthPhysics;
    const y = this.dimension === '1D' ? 0 : bounds.yMin + (pos.y / Math.max(this.canvasHeight, 1)) * (bounds.yMax - bounds.yMin || 1);
    return { x, y };
  }

  initializeParticle(tsParticle: any): Particle {
    const angle = this.dimension === '1D' ? (Math.random() < 0.5 ? 0 : Math.PI) : Math.random() * 2 * Math.PI;
    const speed = 50;
    const currentTime = Date.now() / 1000;
    // Convert initial canvas position to physics coordinates
    const physicsPos = this.mapToPhysics({
      x: tsParticle.position.x,
      y: tsParticle.position.y,
    });
    if (tsParticle.id === "p0") {
      console.log("[PM] initializeParticle p0", {
        canvasPos: { x: tsParticle.position.x, y: tsParticle.position.y },
        physicsPos,
        canvasSize: { w: this.canvasWidth, h: this.canvasHeight },
        bounds: this.strategy.getBoundaries(),
      });
    }

    const particle: Particle = {
      id: tsParticle.id,
      position: {
        x: physicsPos.x,
        y: physicsPos.y,
      },
      velocity: {
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
      },
      lastCollisionTime: currentTime,
      nextCollisionTime: currentTime + Math.random() * 0.5,
      collisionCount: 0,
      trajectory: new CircularBuffer<TrajectoryPoint>(100),
      waitingTime: 0,
      isActive: true,
    };

    tsParticle.velocity.x = particle.velocity.vx;
    tsParticle.velocity.y = particle.velocity.vy;

    this.particles.set(particle.id, particle);
    return particle;
  }

  updateParticle(tsParticle: any): void {
    let particle = this.particles.get(tsParticle.id);

    if (!particle) {
      particle = this.initializeParticle(tsParticle);
    }

    this.strategy.updateParticle(particle, this.getAllParticles());

    // Update trajectory
    particle.trajectory.push({
      position: { x: particle.position.x, y: particle.position.y },
      timestamp: Date.now() / 1000,
    });

    // Map physics position to canvas coordinates for rendering
    const mapped = this.mapToCanvas(particle.position);
    tsParticle.position.x = mapped.x;
    tsParticle.position.y = mapped.y;
    tsParticle.velocity.x = particle.velocity.vx;
    tsParticle.velocity.y = particle.velocity.vy;

    // Periodic diagnostics for one representative particle
    // if (tsParticle.id === "p0" && this.diagCounter % 30 === 0) {
    //   console.log("[PM] updateParticle p0", {
    //     physicsPos: { ...particle.position },
    //     mappedPos: mapped,
    //     canvasSize: { w: this.canvasWidth, h: this.canvasHeight },
    //     bounds: this.strategy.getBoundaries(),
    //     velocity: particle.velocity,
    //   });
    // }
    this.diagCounter++;
  }

  getAllParticles(): Particle[] {
    return Array.from(this.particles.values());
  }

  updatePhysicsEngine(newStrategy: RandomWalkStrategy): void {
    this.strategy = newStrategy;
    try {
      console.log(
        "[PM] updatePhysicsEngine: new bounds",
        this.strategy.getBoundaries()
      );
    } catch {}
  }

  getDensityData() {
    return {
      error: 0,
      effectiveDiffusion: 0,
      effectiveVelocity: 0,
      x: [],
      rho: [],
      u: [],
      moments: { mean: 0, variance: 0, skewness: 0, kurtosis: 0 },
      collisionRate: [],
    };
  }

  clearAllParticles(): void {
    this.particles.clear();
  }

  getCollisionStats() {
    const particles = this.getAllParticles();
    const totalCollisions = particles.reduce(
      (sum, p) => sum + p.collisionCount,
      0
    );
    const avgCollisions =
      particles.length > 0 ? totalCollisions / particles.length : 0;

    return {
      totalCollisions,
      avgCollisions,
      activeParticles: particles.filter((p) => p.isActive).length,
    };
  }
}
