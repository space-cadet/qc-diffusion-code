import { Parser } from 'expr-eval';
import type { Particle } from '../types/Particle';

export interface EvaluationContext {
  position: { x: number; y: number };
  velocity: { vx: number; vy: number };
  speed: number;
  radius?: number;
  id: string;
  lastCollisionTime: number;
  nextCollisionTime: number;
  collisionCount: number;
  interparticleCollisionCount?: number;
  waitingTime: number;
  bounds: { width: number; height: number };
  time: number;
}

export class ExpressionEvaluator {
  private static parser = new Parser();

  static createContext(particle: Particle, bounds: { width: number; height: number }, time: number): EvaluationContext {
    return {
      position: { x: particle.position.x, y: particle.position.y },
      velocity: { vx: particle.velocity.vx, vy: particle.velocity.vy },
      speed: Math.sqrt(particle.velocity.vx ** 2 + particle.velocity.vy ** 2),
      radius: particle.radius,
      id: particle.id,
      lastCollisionTime: particle.lastCollisionTime,
      nextCollisionTime: particle.nextCollisionTime,
      collisionCount: particle.collisionCount,
      interparticleCollisionCount: particle.interparticleCollisionCount,
      waitingTime: particle.waitingTime,
      bounds,
      time
    };
  }

  static evaluateFilter(expression: string, context: EvaluationContext): boolean {
    try {
      const expr = this.parser.parse(expression);
      // Cast to any to satisfy expr-eval's Value map type
      return Boolean(expr.evaluate(context as any));
    } catch {
      return false;
    }
  }

  static evaluateSelect(expression: string, context: EvaluationContext): number {
    try {
      const expr = this.parser.parse(expression);
      const result = expr.evaluate(context as any);
      return typeof result === 'number' ? result : 0;
    } catch {
      return 0;
    }
  }

  static applyReduce(values: number[], reduceFunction: string): number {
    if (values.length === 0) return 0;
    
    switch (reduceFunction) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'mean':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'count':
        return values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'std':
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
        return Math.sqrt(variance);
      default:
        return values.reduce((sum, val) => sum + val, 0);
    }
  }
}
