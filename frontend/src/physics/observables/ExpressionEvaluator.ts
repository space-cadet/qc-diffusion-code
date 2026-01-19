import { Parser } from 'expr-eval';
import type { Particle } from '../types/Particle';
import { TextObservableParser } from './TextObservableParser';

export interface EvaluationContext {
  position: { x: number; y: number; magnitude: number };
  velocity: { vx: number; vy: number; magnitude: number };
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
  initial: {
    position: { x: number; y: number; magnitude: number };
    velocity: { vx: number; vy: number; magnitude: number };
    timestamp: number;
  } | undefined;
}

export class ExpressionEvaluator {
  private static parser = new Parser();

  static createContext(particle: Particle, bounds: { width: number; height: number }, time: number): EvaluationContext {
    return {
      position: { 
        x: particle.position.x, 
        y: particle.position.y,
        magnitude: Math.sqrt(particle.position.x ** 2 + particle.position.y ** 2)
      },
      velocity: { 
        vx: particle.velocity.vx, 
        vy: particle.velocity.vy,
        magnitude: Math.sqrt(particle.velocity.vx ** 2 + particle.velocity.vy ** 2)
      },
      speed: Math.sqrt(particle.velocity.vx ** 2 + particle.velocity.vy ** 2),
      radius: particle.radius,
      id: particle.id,
      lastCollisionTime: particle.lastCollisionTime,
      nextCollisionTime: particle.nextCollisionTime,
      collisionCount: particle.collisionCount,
      interparticleCollisionCount: particle.interparticleCollisionCount,
      waitingTime: particle.waitingTime,
      bounds,
      time,
      initial: particle.initial ? {
        position: {
          x: particle.initial.position.x,
          y: particle.initial.position.y,
          magnitude: Math.sqrt(particle.initial.position.x ** 2 + particle.initial.position.y ** 2)
        },
        velocity: {
          vx: particle.initial.velocity.vx,
          vy: particle.initial.velocity.vy,
          magnitude: Math.sqrt(particle.initial.velocity.vx ** 2 + particle.initial.velocity.vy ** 2)
        },
        timestamp: particle.initial.timestamp,
      } : undefined
    };
  }

  static evaluateFilter(expression: string, context: EvaluationContext): boolean {
    // Security validation
    const validation = TextObservableParser.validateExpression(expression);
    if (!validation.valid) {
      console.warn(`[ExpressionEvaluator] Invalid filter expression: ${validation.error}`);
      return false;
    }
    
    try {
      const expr = this.parser.parse(expression);
      // Cast to any to satisfy expr-eval's Value map type
      return Boolean(expr.evaluate(context as any));
    } catch (error) {
      console.warn(`[ExpressionEvaluator] Filter evaluation failed:`, error);
      return false;
    }
  }

  static evaluateSelect(expression: string, context: EvaluationContext): number {
    // Security validation
    const validation = TextObservableParser.validateExpression(expression);
    if (!validation.valid) {
      console.warn(`[ExpressionEvaluator] Invalid select expression: ${validation.error}`);
      return 0;
    }
    
    try {
      const expr = this.parser.parse(expression);
      const result = expr.evaluate(context as any);
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.warn(`[ExpressionEvaluator] Select evaluation failed:`, error);
      return 0;
    }
  }

  static applyReduce(values: number[], reduceFunction: string): number {
    if (values.length === 0) return 0;
    
    switch (reduceFunction) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'mean':
      case 'avg':
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
