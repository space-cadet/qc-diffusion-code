import { ExpressionEvaluator } from '../observables/ExpressionEvaluator';
import type { Particle, TrajectoryPoint } from '../types/Particle';
import { CircularBuffer } from '../utils/CircularBuffer';

describe('ExpressionEvaluator', () => {
  const testParticle: Particle = {
    id: '1',
    position: { x: 100, y: 200 },
    velocity: { vx: 1.5, vy: -0.5 },
    radius: 5,
    lastCollisionTime: 0,
    nextCollisionTime: 0,
    collisionCount: 0,
    waitingTime: 0,
    trajectory: new CircularBuffer<TrajectoryPoint>(16),
    isActive: true,
    lastUpdate: 0
  };

  const bounds = { width: 800, height: 600 };
  const timestamp = 123456789;

  test('evaluates position expressions', () => {
    const context = ExpressionEvaluator.createContext(testParticle, bounds, timestamp);
    expect(ExpressionEvaluator.evaluateSelect('position.x', context)).toBe(100);
    expect(ExpressionEvaluator.evaluateSelect('position.y', context)).toBe(200);
  });

  test('evaluates velocity expressions', () => {
    const context = ExpressionEvaluator.createContext(testParticle, bounds, timestamp);
    expect(ExpressionEvaluator.evaluateSelect('velocity.vx', context)).toBe(1.5);
    expect(ExpressionEvaluator.evaluateSelect('velocity.vy', context)).toBe(-0.5);
  });

  test('evaluates math expressions', () => {
    const context = ExpressionEvaluator.createContext(testParticle, bounds, timestamp);
    expect(ExpressionEvaluator.evaluateSelect('0.5 * (velocity.vx * velocity.vx + velocity.vy * velocity.vy)', context))
      .toBeCloseTo(1.25);
  });

  test('applies reduce operations', () => {
    const values = [1, 2, 3, 4];
    expect(ExpressionEvaluator.applyReduce(values, 'sum')).toBe(10);
    expect(ExpressionEvaluator.applyReduce(values, 'avg')).toBe(2.5);
    expect(ExpressionEvaluator.applyReduce(values, 'max')).toBe(4);
  });
});
